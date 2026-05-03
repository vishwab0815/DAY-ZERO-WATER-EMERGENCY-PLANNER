import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Plus, Minus, Check, Search, MapPin, Wind } from 'lucide-react'
import { useStore } from '../store/useStore'
import { quickSimulate, geocodeCity, getLiveWeatherByCoords } from '../lib/api'
import type { HouseholdProfile, MemberType, StorageType, ToiletType, BathingHabit, LaundryFrequency, GeocodeResult } from '../types'

const KNOWN_CITIES = [
  { id: 'chennai',    name: 'Chennai',    state: 'Tamil Nadu',  risk: 'Very High', temp: '38°C' },
  { id: 'bengaluru',  name: 'Bengaluru',  state: 'Karnataka',   risk: 'High',      temp: '28°C' },
  { id: 'hyderabad',  name: 'Hyderabad',  state: 'Telangana',   risk: 'High',      temp: '38°C' },
  { id: 'mumbai',     name: 'Mumbai',     state: 'Maharashtra', risk: 'Medium',    temp: '32°C' },
  { id: 'delhi',      name: 'Delhi',      state: 'Delhi',       risk: 'High',      temp: '40°C' },
  { id: 'pune',       name: 'Pune',       state: 'Maharashtra', risk: 'Medium',    temp: '33°C' },
  { id: 'ahmedabad',  name: 'Ahmedabad',  state: 'Gujarat',     risk: 'High',      temp: '45°C' },
]

const RISK_COLOR: Record<string, string> = {
  'Very High': '#dc2626', High: '#f97316', Medium: '#f59e0b',
}

const STORAGE_OPTIONS = [
  { type: 'overhead_tank'    as StorageType, label: 'Overhead Tank',       icon: '🏗️', defaultL: 1000, note: 'Most common in Indian homes' },
  { type: 'underground_sump' as StorageType, label: 'Underground Sump',    icon: '🌊', defaultL: 5000, note: 'Larger reserve, slower to contaminate' },
  { type: 'sealed_bottles'   as StorageType, label: 'Sealed Bottles/Cans', icon: '🧴', defaultL: 40,   note: 'Best for drinking, long shelf life' },
  { type: 'open_drum'        as StorageType, label: 'Open Drum/Barrel',    icon: '🛢️', defaultL: 200,  note: 'Degrades quickly in heat' },
  { type: 'ro_output'        as StorageType, label: 'RO Unit Output',      icon: '💧', defaultL: 20,   note: 'Drink within 24 hours' },
]

interface SelectedCity {
  id: string
  name: string
  state: string
  lat?: number
  lon?: number
  isKnown: boolean
}

function WaterDropLogo() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 150, delay: 0.3 }}
      className="animate-float"
    >
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="dropGrad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#00d4c8" />
            <stop offset="100%" stopColor="#003d5c" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path
          d="M40 8 C40 8 12 36 12 52 C12 67 25 74 40 74 C55 74 68 67 68 52 C68 36 40 8 40 8Z"
          fill="url(#dropGrad)" filter="url(#glow)" opacity="0.9"
        />
        <path d="M28 56 C28 62 33 66 40 66 C47 66 52 62 52 56"
          stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </motion.div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{
            width: i === current ? 24 : 6,
            background: i < current ? '#00c4ae' : i === current ? '#00d4c8' : 'rgba(61,45,24,0.6)',
          }}
          transition={{ duration: 0.3 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  )
}

function MemberCounter({ label, type, count, onChange }: {
  label: string; type: MemberType; count: number; onChange: (n: number) => void
}) {
  const icons: Record<MemberType, string> = { adult: '🧑', child: '👦', elderly: '👴', patient: '🏥' }
  return (
    <div className="flex items-center justify-between px-4 py-3.5 rounded-xl"
      style={{ background: 'rgba(26,19,10,0.7)', border: '1px solid rgba(61,45,24,0.5)' }}>
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 22 }}>{icons[type]}</span>
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
          {count > 0 && (
            <div className="text-xs" style={{ color: 'var(--color-teal)' }}>
              +{(type === 'adult' ? 3 : type === 'child' ? 1.5 : type === 'elderly' ? 2.8 : 3.5) * count}L/day drinking
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onChange(Math.max(0, count - 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: count > 0 ? 'rgba(0,180,160,0.2)' : 'rgba(61,45,24,0.3)', color: count > 0 ? 'var(--color-teal)' : 'var(--color-text-muted)' }}>
          <Minus size={13} />
        </motion.button>
        <span className="w-6 text-center font-mono font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onChange(count + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(0,180,160,0.2)', color: 'var(--color-teal)' }}>
          <Plus size={13} />
        </motion.button>
      </div>
    </div>
  )
}

// ── City Search Step ──────────────────────────────────────────────────────────
function CitySearchStep({ selected, onSelect }: {
  selected: SelectedCity | null
  onSelect: (c: SelectedCity) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [liveTemp, setLiveTemp] = useState<number | null>(null)
  const [loadingTemp, setLoadingTemp] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounced geocode search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await geocodeCity(query)
        setResults(res.results.filter(r => r.country === 'India').slice(0, 6))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Fetch live temp when a city is selected with coords
  useEffect(() => {
    if (!selected?.lat || !selected?.lon) { setLiveTemp(null); return }
    setLoadingTemp(true)
    getLiveWeatherByCoords(selected.lat, selected.lon)
      .then(w => setLiveTemp(w.temp_c ?? null))
      .catch(() => setLiveTemp(null))
      .finally(() => setLoadingTemp(false))
  }, [selected?.lat, selected?.lon])

  const selectKnown = (c: typeof KNOWN_CITIES[0]) => {
    const known = KNOWN_CITIES.find(k => k.id === c.id)
    // lat/lon come from the backend for known cities — use placeholders (backend has coords)
    const latMap: Record<string, [number, number]> = {
      chennai: [13.0827, 80.2707], bengaluru: [12.9716, 77.5946],
      hyderabad: [17.385, 78.4867], mumbai: [19.076, 72.8777],
      delhi: [28.6139, 77.209], pune: [18.5204, 73.8567], ahmedabad: [23.0225, 72.5714],
    }
    const [lat, lon] = latMap[c.id] || [20, 78]
    onSelect({ id: c.id, name: c.name, state: c.state, lat, lon, isKnown: true })
    setQuery('')
    setResults([])
  }

  const selectGeocode = (r: GeocodeResult) => {
    const cityId = `${r.name.toLowerCase().replace(/\s+/g, '_')}_${Math.round(r.lat)}_${Math.round(r.lon)}`
    onSelect({ id: cityId, name: r.name, state: r.state, lat: r.lat, lon: r.lon, isKnown: false })
    setQuery('')
    setResults([])
  }

  return (
    <div>
      {/* Search box */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          placeholder="Search any Indian city…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: 'rgba(26,19,10,0.8)', border: '1px solid rgba(61,45,24,0.6)',
            color: 'var(--color-text-primary)',
          }}
        />
        {searching && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border"
            style={{ borderColor: 'transparent', borderTopColor: 'var(--color-teal)' }} />
        )}

        {/* Geocode dropdown */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden"
              style={{ background: 'rgba(26,19,10,0.98)', border: '1px solid rgba(61,45,24,0.7)' }}
            >
              {results.map((r, i) => (
                <button key={i} onClick={() => selectGeocode(r)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid rgba(61,45,24,0.3)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,196,174,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <MapPin size={12} style={{ color: 'var(--color-teal)', flexShrink: 0 }} />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{r.name}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{r.state}</span>
                  </div>
                  {r.population > 0 && (
                    <span className="ml-auto text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {r.population > 1e6 ? `${(r.population / 1e6).toFixed(1)}M` : `${Math.round(r.population / 1000)}K`}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected city badge */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(0,196,174,0.1)', border: '1px solid rgba(0,196,174,0.3)' }}
          >
            <Check size={14} style={{ color: 'var(--color-teal)', flexShrink: 0 }} />
            <div className="flex-1">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-teal)' }}>{selected.name}</span>
              {selected.state && <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{selected.state}</span>}
              {!selected.isKnown && (
                <span className="text-xs ml-2 px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                  dynamic
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Wind size={11} style={{ color: 'var(--color-text-muted)' }} />
              {loadingTemp ? (
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>…</span>
              ) : liveTemp !== null ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs font-mono font-bold"
                  style={{ color: liveTemp > 35 ? '#f97316' : liveTemp > 28 ? '#f59e0b' : 'var(--color-teal)' }}>
                  🌡 {liveTemp}°C Live
                </motion.span>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Known cities quick-select */}
      <div className="text-xs font-heading mb-2 tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        QUICK SELECT — KNOWN CITIES
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
        {KNOWN_CITIES.map(city => {
          const active = selected?.id === city.id
          return (
            <motion.button key={city.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => selectKnown(city)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: active ? 'rgba(0,196,174,0.12)' : 'rgba(26,19,10,0.7)',
                border: `1px solid ${active ? 'rgba(0,196,174,0.5)' : 'rgba(61,45,24,0.4)'}`,
              }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-heading font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>{city.name}</span>
                {active && <Check size={10} style={{ color: 'var(--color-teal)' }} />}
              </div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{city.state}</div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded" style={{ background: `${RISK_COLOR[city.risk]}18`, color: RISK_COLOR[city.risk], fontSize: 8 }}>
                  {city.risk} risk
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{city.temp}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function Onboarding() {
  const { setHousehold, setSimulation, setIsSimulating, setActiveNav, setOnboardingStep } = useStore()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [elderly, setElderly] = useState(0)
  const [patients, setPatients] = useState(0)

  const [selectedStorages, setSelectedStorages] = useState<Record<string, number>>({ overhead_tank: 1000 })
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null)

  const [toiletType, setToiletType] = useState<ToiletType>('flush')
  const [bathingHabit, setBathingHabit] = useState<BathingHabit>('bucket')
  const [laundryFreq, setLaundryFreq] = useState<LaundryFrequency>('thrice_weekly')
  const [hasBorewell, setHasBorewell] = useState(false)
  const [hasRO, setHasRO] = useState(false)

  const STEPS = 5
  const totalMembers = adults + children + elderly + patients

  const toggleStorage = (type: string, defaultL: number) => {
    setSelectedStorages(prev => {
      const next = { ...prev }
      if (next[type] !== undefined) { delete next[type] } else { next[type] = defaultL }
      return next
    })
  }

  const handleCalculate = async () => {
    if (!selectedCity) { setError('Please select your city'); return }
    if (totalMembers === 0) { setError('Please add at least one household member'); return }
    if (Object.keys(selectedStorages).length === 0) { setError('Please add at least one water storage'); return }

    setError(null)
    setIsSimulating(true)
    setStep(5)

    const profile: HouseholdProfile = {
      city_id: selectedCity.id,
      city_name: selectedCity.name,
      lat: selectedCity.lat,
      lon: selectedCity.lon,
      members: [
        ...(adults   > 0 ? [{ type: 'adult'   as MemberType, count: adults,   medical_conditions: [] }] : []),
        ...(children > 0 ? [{ type: 'child'   as MemberType, count: children, medical_conditions: [] }] : []),
        ...(elderly  > 0 ? [{ type: 'elderly' as MemberType, count: elderly,  medical_conditions: [] }] : []),
        ...(patients > 0 ? [{ type: 'patient' as MemberType, count: patients, medical_conditions: [] }] : []),
      ],
      storages: Object.entries(selectedStorages).map(([type, liters]) => ({
        type: type as StorageType, liters, days_since_filled: 0,
      })),
      toilet_type: toiletType,
      bathing_habit: bathingHabit,
      laundry_frequency: laundryFreq,
      water_source: 'municipal',
      has_borewell: hasBorewell,
      has_ro_unit: hasRO,
    }

    try {
      const result = await quickSimulate(profile)
      setHousehold(profile)
      setSimulation(result)
      setActiveNav('dashboard')
    } catch (e: any) {
      setError(`Simulation failed: ${e.message || 'Check if the backend is running on port 8000'}`)
      setStep(4)
    } finally {
      setIsSimulating(false)
    }
  }

  const stepVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid overflow-hidden relative"
      style={{ background: 'var(--color-bg)' }}>

      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '20%', left: '30%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(0,196,174,0.05) 0%, transparent 70%)',
          transform: 'translate(-50%,-50%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '30%', width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(61,45,24,0.08) 0%, transparent 70%)',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <AnimatePresence mode="wait">

          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div key="welcome" variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.4 }} className="text-center">
              <WaterDropLogo />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <h1 className="font-heading text-5xl font-bold mt-6 mb-2 text-glow-teal"
                  style={{ color: 'var(--color-teal)', letterSpacing: -1 }}>DAY ZERO</h1>
                <p className="font-heading text-base tracking-widest mb-2"
                  style={{ color: 'var(--color-text-secondary)', letterSpacing: 4 }}>WATER EMERGENCY PLANNER</p>
                <p className="text-base mt-4 leading-relaxed mx-auto max-w-sm"
                  style={{ color: 'var(--color-text-muted)' }}>
                  If your water supply stopped tomorrow — how long would you survive, and what should you do right now?
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                className="mt-8 flex flex-col gap-3 items-center">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(1)}
                  className="px-10 py-4 rounded-xl font-heading font-semibold text-base tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #00c4ae, #008a7a)', color: '#f2e4c6', boxShadow: '0 0 30px rgba(0,196,174,0.3)' }}>
                  Begin Assessment →
                </motion.button>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Takes 2 minutes · Live weather · Any Indian city
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Step 1: Household members */}
          {step === 1 && (
            <motion.div key="members" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
              <div className="mb-6 flex items-center justify-between">
                <StepIndicator current={0} total={STEPS} />
                <span className="text-xs font-heading" style={{ color: 'var(--color-text-muted)' }}>1 of {STEPS}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Who depends on this water?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Different ages have different survival water needs.
              </p>
              <div className="flex flex-col gap-3 mb-6">
                <MemberCounter label="Adults (18–60)"       type="adult"   count={adults}   onChange={setAdults} />
                <MemberCounter label="Children (under 15)"  type="child"   count={children} onChange={setChildren} />
                <MemberCounter label="Elderly (60+)"        type="elderly" count={elderly}  onChange={setElderly} />
                <MemberCounter label="Medical patients"     type="patient" count={patients} onChange={setPatients} />
              </div>
              {totalMembers > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="px-4 py-3 rounded-xl mb-4"
                  style={{ background: 'rgba(0,196,174,0.08)', border: '1px solid rgba(0,196,174,0.2)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-teal)' }}>
                    {totalMembers} {totalMembers === 1 ? 'person' : 'people'} — minimum ~{(totalMembers * 2.5).toFixed(0)}L/day to survive
                  </span>
                </motion.div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{ background: 'rgba(61,45,24,0.4)', color: 'var(--color-text-secondary)' }}>
                  <ChevronLeft size={15} /> Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => totalMembers > 0 && setStep(2)} disabled={totalMembers === 0}
                  className="flex-[2] py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 font-heading tracking-wide"
                  style={{
                    background: totalMembers > 0 ? 'rgba(0,196,174,0.2)' : 'rgba(61,45,24,0.3)',
                    color: totalMembers > 0 ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    border: '1px solid rgba(0,196,174,0.3)',
                  }}>
                  Continue <ChevronRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Storage */}
          {step === 2 && (
            <motion.div key="storage" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
              <div className="mb-6 flex items-center justify-between">
                <StepIndicator current={1} total={STEPS} />
                <span className="text-xs font-heading" style={{ color: 'var(--color-text-muted)' }}>2 of {STEPS}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Your water arsenal</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>Select what you have and enter approximate liters.</p>
              <div className="flex flex-col gap-3 mb-6 max-h-72 overflow-y-auto pr-1">
                {STORAGE_OPTIONS.map((opt) => {
                  const selected = selectedStorages[opt.type] !== undefined
                  return (
                    <motion.div key={opt.type}
                      animate={{ borderColor: selected ? 'rgba(0,196,174,0.5)' : 'rgba(61,45,24,0.4)' }}
                      className="rounded-xl p-3.5 cursor-pointer"
                      style={{ background: selected ? 'rgba(0,196,174,0.07)' : 'rgba(26,19,10,0.7)', border: `1px solid ${selected ? 'rgba(0,196,174,0.4)' : 'rgba(61,45,24,0.4)'}` }}
                      onClick={() => toggleStorage(opt.type, opt.defaultL)}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: selected ? 'rgba(0,196,174,0.2)' : 'rgba(61,45,24,0.4)' }}>
                          {selected ? <Check size={12} style={{ color: 'var(--color-teal)' }} /> : <span style={{ fontSize: 14 }}>{opt.icon}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{opt.note}</div>
                        </div>
                        {selected && (
                          <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                            <input type="number" min="1" max="100000"
                              value={selectedStorages[opt.type]}
                              onChange={e => setSelectedStorages(prev => ({ ...prev, [opt.type]: Number(e.target.value) }))}
                              className="w-16 text-right text-xs rounded-lg px-2 py-1 font-mono"
                              style={{ background: 'rgba(61,45,24,0.5)', border: '1px solid rgba(0,196,174,0.3)', color: 'var(--color-teal)', outline: 'none' }} />
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>L</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              {Object.keys(selectedStorages).length > 0 && (
                <div className="mb-4 text-sm font-mono" style={{ color: 'var(--color-teal)' }}>
                  Total: {Object.values(selectedStorages).reduce((a, b) => a + b, 0).toLocaleString('en-IN')}L stored
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{ background: 'rgba(61,45,24,0.4)', color: 'var(--color-text-secondary)' }}>
                  <ChevronLeft size={15} /> Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => Object.keys(selectedStorages).length > 0 && setStep(3)}
                  disabled={Object.keys(selectedStorages).length === 0}
                  className="flex-[2] py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 font-heading tracking-wide"
                  style={{ background: 'rgba(0,196,174,0.2)', color: 'var(--color-teal)', border: '1px solid rgba(0,196,174,0.3)' }}>
                  Continue <ChevronRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: City — now with search */}
          {step === 3 && (
            <motion.div key="location" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
              <div className="mb-6 flex items-center justify-between">
                <StepIndicator current={2} total={STEPS} />
                <span className="text-xs font-heading" style={{ color: 'var(--color-text-muted)' }}>3 of {STEPS}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Where are you?</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Live weather is fetched automatically. Search any Indian city.
              </p>
              <CitySearchStep selected={selectedCity} onSelect={setSelectedCity} />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{ background: 'rgba(61,45,24,0.4)', color: 'var(--color-text-secondary)' }}>
                  <ChevronLeft size={15} /> Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => selectedCity && setStep(4)} disabled={!selectedCity}
                  className="flex-[2] py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 font-heading tracking-wide"
                  style={{
                    background: selectedCity ? 'rgba(0,196,174,0.2)' : 'rgba(61,45,24,0.3)',
                    color: selectedCity ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    border: '1px solid rgba(0,196,174,0.3)',
                  }}>
                  Continue <ChevronRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Habits */}
          {step === 4 && (
            <motion.div key="habits" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35 }}>
              <div className="mb-6 flex items-center justify-between">
                <StepIndicator current={3} total={STEPS} />
                <span className="text-xs font-heading" style={{ color: 'var(--color-text-muted)' }}>4 of {STEPS}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Daily habits</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                Determines your baseline water use and rationing room.
              </p>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <div className="text-xs font-heading mb-2 tracking-wide" style={{ color: 'var(--color-text-muted)' }}>TOILET TYPE</div>
                  <div className="grid grid-cols-3 gap-2">
                    {([['flush','Full Flush','12L/use'],['pour_flush','Pour Flush','3L/use'],['dry','Dry / Field','0L']] as const).map(([val,label,note]) => (
                      <button key={val} onClick={() => setToiletType(val)}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium text-center"
                        style={{
                          background: toiletType === val ? 'rgba(0,196,174,0.15)' : 'rgba(26,19,10,0.7)',
                          border: `1px solid ${toiletType === val ? 'rgba(0,196,174,0.4)' : 'rgba(61,45,24,0.4)'}`,
                          color: toiletType === val ? 'var(--color-teal)' : 'var(--color-text-secondary)',
                        }}>
                        {label}<br/><span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-heading mb-2 tracking-wide" style={{ color: 'var(--color-text-muted)' }}>BATHING HABIT</div>
                  <div className="grid grid-cols-3 gap-2">
                    {([['shower','Shower','60L'],['bucket','Bucket','15L'],['mixed','Mixed','35L']] as const).map(([val,label,note]) => (
                      <button key={val} onClick={() => setBathingHabit(val)}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium text-center"
                        style={{
                          background: bathingHabit === val ? 'rgba(0,196,174,0.15)' : 'rgba(26,19,10,0.7)',
                          border: `1px solid ${bathingHabit === val ? 'rgba(0,196,174,0.4)' : 'rgba(61,45,24,0.4)'}`,
                          color: bathingHabit === val ? 'var(--color-teal)' : 'var(--color-text-secondary)',
                        }}>
                        {label}<br/><span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  {([['hasBorewell','Has Borewell', hasBorewell, setHasBorewell], ['hasRO','Has RO Unit', hasRO, setHasRO]] as const).map(([key, label, val, setter]) => (
                    <button key={key} onClick={() => (setter as any)(!val)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium text-center"
                      style={{
                        background: val ? 'rgba(0,196,174,0.15)' : 'rgba(26,19,10,0.7)',
                        border: `1px solid ${val ? 'rgba(0,196,174,0.4)' : 'rgba(61,45,24,0.4)'}`,
                        color: val ? 'var(--color-teal)' : 'var(--color-text-secondary)',
                      }}>
                      {val ? '✓ ' : ''}{label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{ background: 'rgba(61,45,24,0.4)', color: 'var(--color-text-secondary)' }}>
                  <ChevronLeft size={15} /> Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCalculate}
                  className="flex-[2] py-3 rounded-xl font-heading font-semibold text-sm flex items-center justify-center gap-2 tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #00c4ae, #008a7a)', color: '#f2e4c6', boxShadow: '0 0 20px rgba(0,196,174,0.25)' }}>
                  Calculate Survival Profile →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Calculating */}
          {step === 5 && (
            <motion.div key="calculating" variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.4 }} className="text-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-2 mx-auto mb-6"
                style={{ borderColor: 'transparent', borderTopColor: 'var(--color-teal)', borderRightColor: 'rgba(0,196,174,0.3)' }} />
              <h2 className="font-heading text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Running live simulation
              </h2>
              {[
                '🌡 Fetching live weather from Open-Meteo…',
                '📊 Modelling daily consumption patterns…',
                '⚡ Vectorized Monte Carlo (300 simulations)…',
                '🤖 Preparing AI survival analysis…',
              ].map((msg, i) => (
                <motion.p key={msg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 }}
                  className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{msg}</motion.p>
              ))}
              {error && (
                <div className="mt-6 px-4 py-3 rounded-xl text-sm mx-auto max-w-sm"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>
                  {error}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
