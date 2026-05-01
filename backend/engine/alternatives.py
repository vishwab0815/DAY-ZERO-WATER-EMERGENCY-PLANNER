import json
import os
from models.household import HouseholdProfile

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def get_city_data(city_id: str) -> dict | None:
    path = os.path.join(DATA_DIR, "cities.json")
    with open(path) as f:
        data = json.load(f)
    for city in data["cities"]:
        if city["id"] == city_id:
            return city
    return None


def crisis_price_multiplier(crisis_day: int) -> float:
    """Price spikes as crisis deepens."""
    if crisis_day <= 3:
        return 1.0
    elif crisis_day <= 7:
        return 1.5
    elif crisis_day <= 14:
        return 2.5
    elif crisis_day <= 21:
        return 4.0
    else:
        return 5.5


def tanker_delivery_hours(crisis_day: int) -> float:
    """Hours to get a tanker delivery."""
    if crisis_day <= 3:
        return 2.0
    elif crisis_day <= 7:
        return 6.0
    elif crisis_day <= 14:
        return 12.0
    else:
        return 24.0


def get_alternatives(city_id: str, crisis_day: int = 0, household: HouseholdProfile = None) -> list[dict]:
    city = get_city_data(city_id)
    if not city:
        return []

    mult = crisis_price_multiplier(crisis_day)
    alternatives = []

    # 1. Water tanker
    tanker_base = city["tanker_base_price_per_1000L"]
    alternatives.append({
        "id": "tanker_1000L",
        "type": "tanker",
        "title": "Water Tanker (1000L)",
        "icon": "truck",
        "available": True,
        "cost_inr": round(tanker_base * mult),
        "liters": 1000,
        "cost_per_liter": round(tanker_base * mult / 1000, 2),
        "quality": "utility_safe",
        "potable": False,
        "delivery_hours": tanker_delivery_hours(crisis_day),
        "notes": "Good for toilet/bathing. Boil before drinking.",
        "crisis_price_warning": mult > 2.0,
    })

    # 2. RO shop
    ro_base = city["ro_shop_price_per_20L"]
    alternatives.append({
        "id": "ro_shop",
        "type": "ro_shop",
        "title": "RO Water Shop (20L jar)",
        "icon": "droplets",
        "available": True,
        "cost_inr": round(ro_base * min(mult, 2.5)),
        "liters": 20,
        "cost_per_liter": round(ro_base * min(mult, 2.5) / 20, 2),
        "quality": "potable",
        "potable": True,
        "delivery_hours": 0.5,
        "notes": "Clean drinking water. Limited to shop capacity (usually 500L/day). Expect queues.",
        "crisis_price_warning": mult > 1.5,
    })

    # 3. Water ATM
    atm_base = city["water_atm_price_per_20L"]
    alternatives.append({
        "id": "water_atm",
        "type": "atm",
        "title": "Municipal Water ATM",
        "icon": "building",
        "available": crisis_day < 14,  # ATMs shut down in severe crisis
        "cost_inr": round(atm_base),
        "liters": 20,
        "cost_per_liter": round(atm_base / 20, 2),
        "quality": "potable",
        "potable": True,
        "delivery_hours": 0.25,
        "notes": "Cheapest potable water. Government-run. Queue time 15-45 minutes. Capacity limited in crisis.",
        "crisis_price_warning": False,
    })

    # 4. Borewell (if applicable)
    borewell_quality = city.get("borewell_quality_risk", "medium")
    alternatives.append({
        "id": "borewell",
        "type": "borewell",
        "title": "Borewell / Groundwater",
        "icon": "drill",
        "available": household.has_borewell if household else False,
        "cost_inr": 0,
        "liters": 5000,
        "cost_per_liter": 0,
        "quality": "test_required",
        "potable": borewell_quality == "low",
        "delivery_hours": 0.0,
        "notes": f"Free but quality risk: {borewell_quality}. Test for fluoride/arsenic. Safe for non-potable use.",
        "quality_risk": borewell_quality,
        "crisis_price_warning": False,
    })

    # 5. Rainwater harvesting
    roof_area = household.roof_area_sqm if household and household.roof_area_sqm else city.get("avg_roof_area_sqm", 70)
    alternatives.append({
        "id": "rainwater",
        "type": "rainwater",
        "title": "Rainwater Harvesting",
        "icon": "cloud-rain",
        "available": True,
        "cost_inr": 0,
        "liters": 0,  # depends on rainfall
        "cost_per_liter": 0,
        "quality": "utility_safe_with_treatment",
        "potable": False,
        "delivery_hours": None,
        "notes": f"With {roof_area}m² roof: 1mm rain = {roof_area * 0.8:.0f}L harvested (80% efficiency). First-flush discard required.",
        "roof_area_sqm": roof_area,
        "crisis_price_warning": False,
    })

    # 6. Government distribution
    alternatives.append({
        "id": "govt_distribution",
        "type": "government",
        "title": "Government Emergency Supply",
        "icon": "shield",
        "available": crisis_day >= 4,
        "cost_inr": 0,
        "liters": 20,  # per family per visit
        "cost_per_liter": 0,
        "quality": "potable",
        "potable": True,
        "delivery_hours": None,
        "notes": f"Free distribution. Starts ~day 4 of declared crisis. Typically 10–20L/family/day. Long queues (2-3 hrs).",
        "latency_days": 4,
        "crisis_price_warning": False,
    })

    return alternatives
