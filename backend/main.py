import asyncio
import json
import math
import os
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from models.household import HouseholdProfile, StorageUnit
from models.simulation import SimulationRequest, SimulationResult, RationingLevel
from engine.simulator import WaterSimulator
from engine.alternatives import get_alternatives, get_city_data
from engine.monte_carlo import compare_strategies
from engine.consumption import calculate_daily_consumption, get_survival_floor

app = FastAPI(title="Day Zero — Water Emergency Planner", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
_households: dict[str, dict] = {}

OPEN_METEO_WEATHER  = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODE  = "https://geocoding-api.open-meteo.com/v1/search"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"


# ─── Open-Meteo helpers ───────────────────────────────────────────────────────

def fetch_live_weather(lat: float, lon: float) -> dict | None:
    """Returns {temp_c, forecast_7d: list[float]} or None on failure."""
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.get(OPEN_METEO_WEATHER, params={
                "latitude": lat, "longitude": lon,
                "current": "temperature_2m,precipitation",
                "daily": "temperature_2m_max,precipitation_sum",
                "timezone": "auto", "forecast_days": 7,
            })
        if r.status_code != 200:
            return None
        d = r.json()
        temp = d.get("current", {}).get("temperature_2m")
        daily_max = d.get("daily", {}).get("temperature_2m_max", [])
        daily_rain = d.get("daily", {}).get("precipitation_sum", [])
        return {
            "temp_c": round(temp, 1) if temp is not None else None,
            "forecast_7d": [round(t, 1) for t in daily_max[:7]],
            "rain_7d_mm": [round(r, 1) for r in daily_rain[:7]],
        }
    except Exception:
        return None


def build_dynamic_city(city_name: str, state: str, lat: float, lon: float) -> dict:
    """
    Build a synthetic city profile for any coordinates.
    Temperature is estimated from latitude + Open-Meteo if available.
    """
    weather = fetch_live_weather(lat, lon)
    live_temp = weather["temp_c"] if weather else None

    # Estimate monthly temperature from latitude (India-centric heuristic)
    # Lower lat → hotter, higher lat → more seasonal swing
    mean_t  = max(18.0, 36.0 - (lat - 8.0) * 0.55)
    amp     = max(3.0,  (lat - 8.0) * 0.90)
    # Peak heat: month 5 (May) = index 4
    monthly_temp = [
        round(mean_t + amp * math.sin(2 * math.pi * (m - 5) / 12), 1)
        for m in range(1, 13)
    ]
    if live_temp is not None:
        # Nudge current month toward live reading
        mi = date.today().month - 1
        monthly_temp[mi] = round((monthly_temp[mi] + live_temp) / 2, 1)

    # Rough rainfall pattern (monsoon July-Oct dominates most of India)
    monthly_rain = [15, 12, 8, 10, 20, 80, 180, 160, 130, 60, 20, 12]

    # Regional pricing defaults
    tanker  = 550
    ro_20l  = 32
    atm_20l = 7

    return {
        "id": f"dynamic_{city_name.lower().replace(' ', '_')}",
        "name": city_name,
        "state": state or "India",
        "country": "India",
        "lat": lat,
        "lon": lon,
        "monthly_temp": monthly_temp,
        "monthly_rainfall_mm": monthly_rain,
        "avg_roof_area_sqm": 75,
        "crisis_risk": "medium",
        "tanker_base_price_per_1000L": tanker,
        "ro_shop_price_per_20L": ro_20l,
        "water_atm_price_per_20L": atm_20l,
        "borewell_depth_m": 45,
        "borewell_quality_risk": "medium",
        "notes": f"Dynamic city profile generated for {city_name}.",
        "live_temp": live_temp,
        "is_dynamic": True,
    }


def inject_live_temp(city: dict) -> dict:
    """Fetch live weather and update current-month temp in city profile."""
    lat, lon = city.get("lat"), city.get("lon")
    if not lat or not lon:
        return city
    weather = fetch_live_weather(lat, lon)
    if not weather or weather["temp_c"] is None:
        return city
    city = dict(city)
    city["monthly_temp"] = list(city["monthly_temp"])
    mi = date.today().month - 1
    city["monthly_temp"][mi] = weather["temp_c"]
    city["live_temp"] = weather["temp_c"]
    city["forecast_7d"] = weather.get("forecast_7d", [])
    city["rain_7d_mm"]  = weather.get("rain_7d_mm", [])
    return city


def resolve_city(profile: HouseholdProfile) -> dict:
    """Return city dict: known cities get live-temp injected; unknown built dynamically."""
    city = get_city_data(profile.city_id)
    if city:
        return inject_live_temp(city)
    # Unknown city — need lat/lon
    if profile.lat and profile.lon:
        return build_dynamic_city(
            profile.city_name or profile.city_id,
            "",
            profile.lat,
            profile.lon,
        )
    raise HTTPException(400, f"City '{profile.city_id}' not found. Provide lat/lon for any city.")


# ─── Cities ───────────────────────────────────────────────────────────────────

@app.get("/api/cities")
def list_cities():
    with open(os.path.join(DATA_DIR, "cities.json")) as f:
        return json.load(f)


@app.get("/api/cities/{city_id}")
def get_city(city_id: str):
    city = get_city_data(city_id)
    if not city:
        raise HTTPException(404, f"City '{city_id}' not found")
    return inject_live_temp(city)


# ─── Geocoding (Open-Meteo, free, no key) ─────────────────────────────────────

@app.get("/api/geocode")
def geocode_city(q: str = Query(..., min_length=2)):
    """Search for any city globally and return lat/lon + metadata."""
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.get(OPEN_METEO_GEOCODE, params={
                "name": q, "count": 8, "language": "en", "format": "json",
            })
        if r.status_code != 200:
            return {"results": []}
        data = r.json()
        results = []
        for item in data.get("results", []):
            results.append({
                "name":     item.get("name", ""),
                "state":    item.get("admin1", ""),
                "country":  item.get("country", ""),
                "lat":      item.get("latitude"),
                "lon":      item.get("longitude"),
                "population": item.get("population", 0),
            })
        return {"results": results}
    except Exception as e:
        return {"results": [], "error": str(e)}


# ─── Live Weather ─────────────────────────────────────────────────────────────

@app.get("/api/weather/{city_id}")
def get_live_weather(city_id: str):
    city = get_city_data(city_id)
    if not city:
        raise HTTPException(404, "City not found")
    weather = fetch_live_weather(city["lat"], city["lon"])
    if not weather:
        raise HTTPException(503, "Weather service unavailable")
    return {"city_id": city_id, **weather}


@app.get("/api/weather/coords/live")
def get_weather_by_coords(lat: float, lon: float):
    weather = fetch_live_weather(lat, lon)
    if not weather:
        raise HTTPException(503, "Weather service unavailable")
    return weather


# ─── Historical Crises ────────────────────────────────────────────────────────

@app.get("/api/crises")
def list_crises():
    with open(os.path.join(DATA_DIR, "crises.json")) as f:
        return json.load(f)


# ─── Household ────────────────────────────────────────────────────────────────

@app.post("/api/household")
def create_household(profile: HouseholdProfile):
    if not profile.id:
        profile = profile.model_copy(update={"id": str(uuid.uuid4())[:8]})
    _households[profile.id] = profile.model_dump()
    return {"id": profile.id, "message": "Household saved"}


@app.get("/api/household/{household_id}")
def get_household(household_id: str):
    if household_id not in _households:
        raise HTTPException(404, "Household not found")
    return _households[household_id]


# ─── Simulation ───────────────────────────────────────────────────────────────

@app.post("/api/simulate")
def run_simulation(request: SimulationRequest):
    if request.household_id not in _households:
        raise HTTPException(404, "Household not found. POST to /api/household first.")

    raw = _households[request.household_id]
    household = HouseholdProfile(**raw)
    city = resolve_city(household)

    simulator = WaterSimulator(household, household.storages, city)
    days = simulator.run(days=request.days, rationing_level=request.strategy.value)
    day_zero_day = next((d.day for d in days if d.storage_total_liters <= 0), None)

    initial_total = sum(s.liters for s in household.storages)
    daily_normal = calculate_daily_consumption(
        household, float(city["monthly_temp"][date.today().month - 1])
    )["total"]
    days_at_normal = initial_total / daily_normal if daily_normal > 0 else 0

    prep_score = min(100.0, (days_at_normal / 30.0) * 60)
    if household.has_borewell: prep_score += 10
    if any(s.type.value == "sealed_bottles" for s in household.storages): prep_score += 10
    if household.has_ro_unit: prep_score += 5
    if household.roof_area_sqm: prep_score += 5
    prep_score = round(min(100.0, prep_score), 1)

    return SimulationResult(
        household_id=request.household_id,
        total_days_simulated=len(days),
        day_zero_reached=day_zero_day is not None,
        day_zero_on_day=day_zero_day,
        days=days,
        preparedness_score=prep_score,
        summary={
            "initial_storage_liters": initial_total,
            "daily_consumption_normal": round(daily_normal, 1),
            "days_at_normal_usage": round(days_at_normal, 1),
            "preparedness_score": prep_score,
            "crisis_level_today": days[0].crisis_level if days else "unknown",
        },
    )


def _run_strategy(profile: HouseholdProfile, storages: list, city: dict, strat: str) -> tuple[str, dict]:
    sim = WaterSimulator(profile, storages, city)
    strat_days = sim.run(days=60, rationing_level=strat)
    return strat, {
        "days_until_zero": len(strat_days),
        "median_estimate": strat_days[0].monte_carlo.median if strat_days and strat_days[0].monte_carlo else 0,
    }


@app.post("/api/simulate/quick")
def quick_simulate(profile: HouseholdProfile):
    """Single-call simulate. Strategies run in parallel. Live weather auto-injected."""
    profile = profile.model_copy(update={"id": str(uuid.uuid4())[:8]})
    _households[profile.id] = profile.model_dump()

    city = resolve_city(profile)

    simulator = WaterSimulator(profile, profile.storages, city)
    days = simulator.run(days=30, rationing_level="none")

    strategy_comparison = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_run_strategy, profile, profile.storages, city, s): s
                   for s in ["none", "mild", "moderate", "severe"]}
        for fut in as_completed(futures):
            strat, result = fut.result()
            strategy_comparison[strat] = result

    daily_normal = calculate_daily_consumption(
        profile, float(city["monthly_temp"][date.today().month - 1])
    )["total"]
    initial_total = sum(s.liters for s in profile.storages)

    prep_score = min(100.0, (initial_total / daily_normal / 30.0) * 60) if daily_normal > 0 else 0
    if profile.has_borewell: prep_score += 10
    if any(s.type.value == "sealed_bottles" for s in profile.storages): prep_score += 10
    if profile.has_ro_unit: prep_score += 5
    if profile.roof_area_sqm: prep_score += 5
    prep_score = round(min(100.0, prep_score), 1)

    return {
        "household_id": profile.id,
        "days": days,
        "strategy_comparison": strategy_comparison,
        "preparedness_score": prep_score,
        "daily_consumption": daily_normal,
        "total_storage": initial_total,
        "survival_floor": get_survival_floor(profile, float(city["monthly_temp"][date.today().month - 1])),
        "alternatives": get_alternatives(profile.city_id, 0, profile),
        "city": city,
        "live_temp": city.get("live_temp"),
        "forecast_7d": city.get("forecast_7d", []),
    }


# ─── Gemini shared helper ─────────────────────────────────────────────────────

async def _gemini_post(body: dict, timeout: float = 25.0, retries: int = 2) -> dict:
    """Call Gemini REST API. Retries on 429 with backoff. Falls back without search if needed."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY not configured in .env")

    url = f"{GEMINI_URL}?key={api_key}"

    for attempt in range(retries + 1):
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=body)

        if resp.status_code == 200:
            return resp.json()

        if resp.status_code == 429:
            if attempt < retries:
                await asyncio.sleep(4 + attempt * 3)   # 4s, then 7s
                continue
            # Last attempt failed — try once more without search grounding
            body_fallback = {k: v for k, v in body.items() if k != "tools"}
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp2 = await client.post(url, json=body_fallback)
            if resp2.status_code == 200:
                return resp2.json()
            raise HTTPException(429, "Gemini is busy — wait ~1 minute and try again.")

        # Non-429 error: try without search grounding once
        if "tools" in body:
            body_fallback = {k: v for k, v in body.items() if k != "tools"}
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp2 = await client.post(url, json=body_fallback)
            if resp2.status_code == 200:
                return resp2.json()

        raise HTTPException(502, f"Gemini error {resp.status_code}: {resp.text[:200]}")

    raise HTTPException(502, "Gemini request failed after retries")


# ─── AI Insights (Gemini + Google Search Grounding) ───────────────────────────

@app.post("/api/ai/insights")
async def get_ai_insights(payload: dict):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY not configured in .env")

    days_remaining = payload.get("days_remaining", 0)
    crisis_level   = payload.get("crisis_level", "safe")
    prep_score     = payload.get("prep_score", 50)
    daily_use      = payload.get("daily_consumption", 50)
    total_storage  = payload.get("total_storage", 1000)
    city           = payload.get("city", "your city")
    members        = payload.get("members", 2)
    dehyd_risk     = payload.get("dehydration_risk", 0)
    hygiene        = payload.get("hygiene_score", 100)
    rationing      = payload.get("rationing_level", "none")
    live_temp      = payload.get("live_temp")

    urgency_map = {
        "safe":     "The household is safe. Focus on resilience planning.",
        "watch":    "Supply tightening — begin precautionary steps.",
        "warning":  "WARNING — weeks away from zero. Immediate action.",
        "critical": "CRITICAL — days from dry. Emergency measures NOW.",
        "zero":     "ZERO — water has run out. Full survival emergency.",
    }

    temp_note = f" Current live temperature: {live_temp}°C." if live_temp else ""

    prompt = f"""You are India's top water crisis survival advisor. Today's date: {date.today().isoformat()}.

HOUSEHOLD CRISIS SNAPSHOT:
- City: {city}{temp_note}
- People: {members}
- Days of water left: {days_remaining}
- Crisis level: {crisis_level.upper()} — {urgency_map.get(crisis_level, '')}
- Preparedness score: {prep_score}/100
- Daily usage: {daily_use:.1f}L/day | Storage: {total_storage:.0f}L
- Dehydration risk: {dehyd_risk}% | Hygiene: {hygiene}%
- Current rationing: {rationing}

Search for the LATEST water situation in {city} — reservoir levels, tanker availability, government advisories today.

Then give:
1. three-sentence verdict on their situation RIGHT NOW.
2. Three numbered, specific survival actions for TODAY — use Indian context (tanker apps, water ATMs, borewell, government helplines, etc.)
3. One thing to do THIS WEEK to improve preparedness.

Under 180 words. Be urgent and specific, not generic."""

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.6, "maxOutputTokens": 400},
        "tools": [{"google_search_retrieval": {"dynamic_retrieval_config": {"mode": "MODE_DYNAMIC", "dynamic_threshold": 0.3}}}],
    }

    result = await _gemini_post(body)
    text = result["candidates"][0]["content"]["parts"][0]["text"]

    grounded = "groundingMetadata" in result.get("candidates", [{}])[0]
    sources = []
    if grounded:
        chunks = result["candidates"][0].get("groundingMetadata", {}).get("groundingChunks", [])
        for chunk in chunks[:3]:
            web = chunk.get("web", {})
            if web.get("title"):
                sources.append({"title": web["title"], "uri": web.get("uri", "")})

    return {"insights": text, "crisis_level": crisis_level, "grounded": grounded, "sources": sources}


# ─── AI Chat (Gemini multi-turn) ─────────────────────────────────────────────

@app.post("/api/ai/chat")
async def ai_chat(payload: dict):
    messages = payload.get("messages", [])   # [{role: "user"|"model", content: str}]
    ctx = payload.get("context", {})

    city         = ctx.get("city", "your city")
    days_left    = ctx.get("days_remaining", "?")
    crisis       = ctx.get("crisis_level", "unknown")
    members      = ctx.get("members", 2)
    live_temp    = ctx.get("live_temp")
    daily_use    = ctx.get("daily_consumption")
    total_storage = ctx.get("total_storage")

    temp_note    = f" Live temperature: {live_temp}°C." if live_temp else ""
    usage_note   = f" Daily usage: {daily_use:.1f}L, total storage: {total_storage:.0f}L." if daily_use and total_storage else ""

    system_text = f"""You are a sharp, concise water crisis survival assistant for India. Today: {date.today().isoformat()}.

Household snapshot: {members} people in {city}. {days_left} days of water supply left. Crisis level: {crisis.upper()}.{temp_note}{usage_note}

Rules:
- Reply in 2–4 sentences max. Be direct and specific.
- Always India-specific: mention tanker apps (Jal Tanker, IndiaMart), water ATMs, municipal helplines, CGWB data, etc.
- Use exact numbers and real locations when you can.
- If asked about current reservoir/supply situation, search for live data.
- Never be generic. Tailor every answer to the {city} context."""

    # Build Gemini multi-turn contents
    gemini_contents = [
        {"role": ("user" if m["role"] == "user" else "model"),
         "parts": [{"text": m["content"]}]}
        for m in messages
    ]

    body = {
        "system_instruction": {"parts": [{"text": system_text}]},
        "contents": gemini_contents,
        "generationConfig": {"temperature": 0.70, "maxOutputTokens": 600},
        "tools": [{"google_search_retrieval": {
            "dynamic_retrieval_config": {"mode": "MODE_DYNAMIC", "dynamic_threshold": 0.35}
        }}],
    }

    result = await _gemini_post(body)
    text = result["candidates"][0]["content"]["parts"][0]["text"]
    grounded = "groundingMetadata" in result.get("candidates", [{}])[0]

    return {"reply": text, "grounded": grounded}


# ─── AI health test endpoint ──────────────────────────────────────────────────

@app.get("/api/ai/test")
async def test_ai():
    """Quick check that Gemini API key is valid and responding."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return {"status": "error", "message": "GEMINI_API_KEY not set in .env"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={api_key}",
            json={"contents": [{"parts": [{"text": "Say OK"}]}],
                  "generationConfig": {"maxOutputTokens": 5}},
        )
    if resp.status_code == 200:
        return {"status": "ok", "gemini": "reachable", "key_prefix": api_key[:10]}
    return {"status": "error", "code": resp.status_code, "detail": resp.text[:200]}


# ─── Alternatives ─────────────────────────────────────────────────────────────

@app.get("/api/alternatives/{city_id}")
def get_water_alternatives(city_id: str, crisis_day: int = 0):
    return get_alternatives(city_id, crisis_day)


# ─── Preparedness ─────────────────────────────────────────────────────────────

@app.get("/api/preparedness/{household_id}")
def get_preparedness(household_id: str):
    if household_id not in _households:
        raise HTTPException(404, "Household not found")

    raw = _households[household_id]
    household = HouseholdProfile(**raw)
    city = resolve_city(household)
    temp = float(city["monthly_temp"][date.today().month - 1])

    initial_total = sum(s.liters for s in household.storages)
    daily_normal = calculate_daily_consumption(household, temp)["total"]
    days_supply = initial_total / daily_normal if daily_normal > 0 else 0

    gaps = []
    if days_supply < 7:
        gaps.append({"issue": "Less than 7 days storage", "priority": "critical",
                     "action": "Buy sealed water bottles or increase tank capacity"})
    if not household.has_borewell and not household.has_ro_unit:
        gaps.append({"issue": "No backup water source", "priority": "high",
                     "action": "Identify nearest RO shop and water ATM locations"})
    if not any(s.type.value == "sealed_bottles" for s in household.storages):
        gaps.append({"issue": "No sealed potable reserve", "priority": "high",
                     "action": f"Buy 20L sealed bottles (~₹{int(days_supply * 20):,} for 7-day supply)"})
    if not household.roof_area_sqm:
        gaps.append({"issue": "No rainwater harvesting", "priority": "medium",
                     "action": "Install rooftop collection with 500L drum (₹3,000–5,000)"})

    score = min(100.0, (days_supply / 30.0) * 60)
    if household.has_borewell: score += 10
    if any(s.type.value == "sealed_bottles" for s in household.storages): score += 10
    if household.has_ro_unit: score += 5
    if household.roof_area_sqm: score += 5
    score = round(min(100.0, score), 1)

    label = "Critical" if score < 30 else "At Risk" if score < 50 else "Basic" if score < 70 else "Prepared" if score < 85 else "Resilient"

    return {
        "score": score, "days_supply": round(days_supply, 1), "gaps": gaps,
        "daily_consumption": round(daily_normal, 1), "total_storage": initial_total, "label": label,
    }


# ─── Static files (React build) ───────────────────────────────────────────────

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, timeout_keep_alive=120)
