<div align="center">

# 💧 DAY ZERO — Water Emergency Planner

### *If your water supply stopped tomorrow — how long would you survive?*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)

**Day Zero** is a real-time water crisis survival planner built for Indian households. Enter your household profile, and get a precise simulation of how many days your water will last — along with AI-powered survival advice, rationing strategies, and alternative water source recommendations.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Household Profiler** | 5-step onboarding — members (adults/children/elderly/patients), storage tanks, city, and daily habits |
| 🌡️ **Live Weather** | Real-time temperature from [Open-Meteo](https://open-meteo.com/) — automatically adjusts consumption estimates |
| 📊 **Day-Zero Simulation** | Day-by-day projection of water depletion across 4 rationing strategies (None / Mild / Moderate / Severe) |
| 🎲 **Monte Carlo Forecasting** | 300-run probabilistic model returning P25–P75 confidence bands for your depletion timeline |
| 💊 **Health Risk Modeling** | Tracks dehydration risk, illness risk, and hygiene score as your water dwindles |
| 🤖 **AI Survival Advisor** | Gemini 2.0 Flash + Google Search grounding — India-specific, live crisis data, actionable steps |
| 💬 **AI Crisis Chat** | Multi-turn Gemini chat with full household context (city, days left, crisis level) |
| 🪣 **Water Alternatives** | Ranked list: tankers, RO shops, water ATMs, borewells, rainwater harvesting — with pricing |
| ⚡ **Crisis Intel** | Historical water crises in Indian cities with lessons and what-to-expect data |
| 🎯 **Action Center** | Prioritized, time-bound survival tasks based on your crisis level |
| 🔵 **3D Water Tank** | Animated Three.js tank that visually reflects your current storage percentage |
| 🌍 **Any Indian City** | Supports all 7 pre-profiled metros + dynamic profiles for any city via geocoding |

---

## 🖥️ Tech Stack

### Frontend
- **React 19** + **Vite 8** — lightning-fast dev/build
- **TypeScript** — full type safety across all components
- **TailwindCSS v4** — utility-first styling
- **Framer Motion** — smooth page transitions and micro-animations
- **Three.js** + **React Three Fiber** — 3D animated water tank
- **Recharts** — data visualization
- **Zustand** — lightweight global state management
- **Lucide React** — icon library

### Backend
- **FastAPI** — async Python API with automatic OpenAPI docs
- **Uvicorn** — ASGI server with hot-reload
- **Pydantic v2** — strict data validation
- **NumPy + SciPy** — vectorized Monte Carlo simulation engine
- **HTTPX** — async HTTP client for external API calls
- **Python-dotenv** — environment configuration

### External APIs
- **[Open-Meteo](https://open-meteo.com/)** — free weather & geocoding (no API key required)
- **[Google Gemini 2.0 Flash](https://ai.google.dev/)** — AI advisor with Google Search grounding

---

## 📁 Project Structure

```
DAY-ZERO-WATER-EMERGENCY-PLANNER/
│
├── 📂 backend/
│   ├── main.py                  # FastAPI app — all API routes
│   ├── requirements.txt
│   ├── .env                     # GEMINI_API_KEY (you create this)
│   │
│   ├── 📂 engine/
│   │   ├── simulator.py         # Day-by-day WaterSimulator core
│   │   ├── consumption.py       # Daily water usage calculator
│   │   ├── monte_carlo.py       # Probabilistic forecasting (300 runs)
│   │   ├── storage.py           # Tank/sump/bottle degradation model
│   │   ├── alternatives.py      # Water source alternative ranking
│   │   └── health.py            # Dehydration/illness/hygiene model
│   │
│   ├── 📂 models/
│   │   ├── household.py         # HouseholdProfile, StorageUnit schemas
│   │   └── simulation.py        # SimulationRequest, SimulationResult
│   │
│   └── 📂 data/
│       ├── cities.json          # Pre-profiled Indian metros
│       └── crises.json          # Historical water crisis records
│
├── 📂 src/
│   ├── App.jsx                  # Root router with animated page transitions
│   ├── main.jsx
│   ├── index.css                # Global design tokens & utility classes
│   │
│   ├── 📂 pages/
│   │   ├── Onboarding.tsx       # 5-step household setup wizard
│   │   ├── Dashboard.tsx        # Main survival dashboard
│   │   ├── Simulation.tsx       # Day-by-day timeline explorer
│   │   ├── Alternatives.tsx     # Water source alternatives
│   │   ├── ActionCenter.tsx     # Survival action checklist
│   │   └── CrisisIntel.tsx      # Historical crisis intelligence
│   │
│   ├── 📂 components/
│   │   ├── 📂 3d/
│   │   │   ├── Scene.tsx        # Three.js canvas wrapper
│   │   │   └── WaterTank.tsx    # Animated 3D water tank mesh
│   │   ├── 📂 ui/
│   │   │   ├── GaugeRing.tsx    # Circular SVG gauge component
│   │   │   ├── AnimatedNumber.tsx  # Spring-animated number display
│   │   │   ├── StorageBreakdown.tsx # Storage donut & consumption chart
│   │   │   ├── GeminiChat.tsx   # Multi-turn AI chat interface
│   │   │   ├── CrisisFlash.tsx  # Pulsing crisis alert banner
│   │   │   ├── DecisionFork.tsx # Rationing strategy decision tree
│   │   │   └── ParticleBackground.tsx # Ambient particle canvas
│   │   └── 📂 layout/
│   │       └── Layout.tsx       # App shell with sidebar navigation
│   │
│   ├── 📂 store/
│   │   └── useStore.ts          # Zustand global state
│   ├── 📂 lib/
│   │   └── api.ts               # Axios API helpers
│   └── 📂 types/
│       └── index.ts             # TypeScript interfaces
│
├── index.html
├── vite.config.js
├── package.json
├── start.bat                    # One-click launcher (Windows)
└── generate_report.py           # PDF report generator
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Python** 3.10+
- A **Google Gemini API key** (free tier available at [aistudio.google.com](https://aistudio.google.com/))

### 1. Clone the repository

```bash
git clone https://github.com/vishwab0815/DAY-ZERO-WATER-EMERGENCY-PLANNER.git
cd DAY-ZERO-WATER-EMERGENCY-PLANNER
```

### 2. Configure the backend

```bash
cd backend
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd ..
npm install
```

### 4. Run the app

**Option A — One-click launcher (Windows)**

```batch
start.bat
```

This starts both servers and opens your browser automatically.

**Option B — Manual**

In one terminal (backend):
```bash
cd backend
python main.py
```

In another terminal (frontend):
```bash
npm run dev
```

### 5. Open the app

| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:8000 |
| 📖 API Docs (Swagger) | http://localhost:8000/docs |

---

## 🔌 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/simulate/quick` | Run full simulation (strategies in parallel, live weather injected) |
| `POST` | `/api/simulate` | Run simulation for a saved household |
| `POST` | `/api/household` | Save a household profile |
| `GET` | `/api/household/{id}` | Retrieve saved household |
| `GET` | `/api/cities` | List all pre-profiled cities |
| `GET` | `/api/cities/{city_id}` | Get city data with live temperature |
| `GET` | `/api/geocode?q={query}` | Search any Indian city (Open-Meteo) |
| `GET` | `/api/weather/{city_id}` | Live 7-day weather forecast |
| `GET` | `/api/crises` | Historical water crisis records |
| `GET` | `/api/alternatives/{city_id}` | Water source alternatives with pricing |
| `GET` | `/api/preparedness/{household_id}` | Preparedness score and gap analysis |

### AI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/insights` | Gemini-powered crisis insights with Google Search |
| `POST` | `/api/ai/chat` | Multi-turn AI chat with household context |
| `GET` | `/api/ai/test` | Verify Gemini API key is working |

### Quick Simulation Request (Example)

```json
POST /api/simulate/quick

{
  "city_id": "chennai",
  "members": [
    { "type": "adult", "count": 2, "medical_conditions": [] },
    { "type": "child", "count": 1, "medical_conditions": [] }
  ],
  "storages": [
    { "type": "overhead_tank", "liters": 1000, "days_since_filled": 0 },
    { "type": "sealed_bottles", "liters": 40, "days_since_filled": 0 }
  ],
  "toilet_type": "flush",
  "bathing_habit": "bucket",
  "laundry_frequency": "thrice_weekly",
  "water_source": "municipal",
  "has_borewell": false,
  "has_ro_unit": true
}
```

---

## 🧠 How the Simulation Works

```
1. HOUSEHOLD PROFILE
   └─ Members (adults/children/elderly/patients) × their medical needs

2. CONSUMPTION CALCULATOR  engine/consumption.py
   ├─ Drinking: varies by age, medical condition, live temperature
   ├─ Toilet: flush (12L/use) → pour flush (3L) → dry (0L)
   ├─ Bathing: shower (60L) → mixed (35L) → bucket (15L)
   ├─ Cooking & washing: per-person estimates
   └─ Rationing modifier: none (1.0×) → mild (0.8×) → moderate (0.6×) → severe (0.4×)

3. STORAGE MODEL  engine/storage.py
   ├─ Overhead tank → underground sump → sealed bottles → open drum → RO output
   ├─ Potability decay: open storage degrades faster in heat
   └─ Borewell/RO refill modeled as partial replenishment

4. HEALTH ENGINE  engine/health.py
   ├─ Dehydration risk: rises as potable supply shrinks
   ├─ Illness risk: tied to hygiene score and storage type
   └─ Survival floor: minimum safe liters/day per member profile

5. MONTE CARLO  engine/monte_carlo.py
   ├─ 300 stochastic runs with ±15% consumption variance
   └─ Returns: median, P25, P75 confidence bands

6. CRISIS LEVELS
   Safe → Watch → Warning → Critical → Day Zero
   (based on days remaining relative to thresholds)
```

---

## 🌆 Supported Cities (Pre-Profiled)

| City | State | Crisis Risk | Notes |
|---|---|---|---|
| Chennai | Tamil Nadu | 🔴 Very High | Prone to severe Day Zero events |
| Bengaluru | Karnataka | 🟠 High | Rapid urban growth, shrinking lakes |
| Hyderabad | Telangana | 🟠 High | Dependent on Musi/Krishna reservoirs |
| Delhi | Delhi | 🟠 High | Yamuna dependency, groundwater depletion |
| Ahmedabad | Gujarat | 🟠 High | Extreme summer temperatures |
| Pune | Maharashtra | 🟡 Medium | Better reservoir coverage |
| Mumbai | Maharashtra | 🟡 Medium | Relatively stable lake system |

> **Any Indian city** can be searched via the geocoding search — a dynamic profile is built using latitude/longitude + live Open-Meteo data.

---

## 📸 App Pages

| Page | Description |
|---|---|
| **Onboarding** | 5-step wizard to set up your household profile |
| **Dashboard** | 3D tank, days remaining, preparedness score, health gauges, AI insights |
| **Simulation** | Day-by-day timeline chart, rationing strategy comparison |
| **Alternatives** | Water tanker, RO shops, water ATMs, borewell, rainwater with real pricing |
| **Action Center** | Prioritized survival checklist with crisis-aware task ordering |
| **Crisis Intel** | Historical case studies of Indian water crises |

---

## 🗺️ Roadmap

- [ ] Push notifications for water shortage alerts
- [ ] Multi-household / community planning mode
- [ ] Borewell depth and quality lookup by district
- [ ] Government scheme integration (Jal Jeevan Mission, etc.)
- [ ] Offline PWA support for crisis scenarios
- [ ] Regional language support (Tamil, Telugu, Hindi, Kannada)
- [ ] PDF report export with survival plan

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then submit a PR
```

---

## 📄 License

This project is open source. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Open-Meteo](https://open-meteo.com/) — free, open-source weather API
- [Google Gemini](https://ai.google.dev/) — AI advisor powering survival insights
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) — 3D rendering in React
- [Framer Motion](https://www.framer.com/motion/) — animations
- Inspired by the real **2018 Cape Town Day Zero** crisis and India's escalating urban water emergencies

---

<div align="center">

**Built with ❤️ for water resilience in India**

*"The next world war will be fought over water." — Ismail Serageldin*

</div>
