import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { Scene } from '../components/3d/Scene'
import { GaugeRing } from '../components/ui/GaugeRing'
import { StorageBreakdown, ConsumptionDonut } from '../components/ui/StorageBreakdown'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useStore } from '../store/useStore'
import { getAIInsights } from '../lib/api'

const CRISIS_COLORS: Record<string, string> = {
  safe: '#00c4ae', watch: '#7dd3fc', warning: '#f59e0b', critical: '#f97316', zero: '#dc2626',
}
const CRISIS_LABELS: Record<string, string> = {
  safe: 'SAFE', watch: 'WATCH', warning: 'WARNING', critical: 'CRITICAL', zero: 'DAY ZERO',
}

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal(targetFill: number, targetDays: number, targetScore: number) {
  const hasRevealed = useRef(false)

  const fillMV = useMotionValue(0)
  const fillSpring = useSpring(fillMV, { stiffness: 35, damping: 14, mass: 1.0 })
  const [displayFill, setDisplayFill] = useState(0)

  const daysMV = useMotionValue(targetDays + 8)
  const daysSpring = useSpring(daysMV, { stiffness: 45, damping: 18 })

  const scoreMV = useMotionValue(0)
  const scoreSpring = useSpring(scoreMV, { stiffness: 50, damping: 18 })

  useMotionValueEvent(fillSpring, 'change', (v) => setDisplayFill(Math.max(0, v)))

  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    if (hasRevealed.current) return
    hasRevealed.current = true
    const t1 = setTimeout(() => { fillMV.set(targetFill); daysSpring.set(targetDays); scoreMV.set(targetScore) }, 250)
    const t2 = setTimeout(() => setStatsVisible(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (!hasRevealed.current) return
    fillMV.set(targetFill)
  }, [targetFill])

  return { displayFill, daysSpring, scoreSpring, statsVisible }
}

// ── DaysRemainingCard ─────────────────────────────────────────────────────────
function DaysRemainingCard({ daysSpring, scoreSpring }: { daysSpring: any; scoreSpring: any }) {
  const { simulation, crisisLevel, currentDayState, currentDay, setActiveNav } = useStore()
  if (!simulation) return null

  const daysLeft = simulation.days.length - currentDay
  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'
  const mc = currentDayState?.monte_carlo
  const temp = currentDayState?.temperature_celsius ?? 30

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-panel p-5"
    >
      <div className="text-xs font-heading tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
        DAYS REMAINING
      </div>
      <div className="flex items-end gap-2 mb-1">
        <AnimatedNumber
          value={daysLeft}
          stiffness={55}
          damping={18}
          style={{
            fontSize: 56, fontFamily: 'var(--font-heading)', fontWeight: 700,
            lineHeight: 1, color: crisisColor, textShadow: `0 0 30px ${crisisColor}50`,
          }}
        />
        <span className="text-base mb-3" style={{ color: 'var(--color-text-muted)' }}>days</span>
      </div>
      {mc && (
        <div className="text-xs font-mono mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Range:{' '}
          <AnimatedNumber value={mc.p25} decimals={0} style={{ color: crisisColor }} />
          –
          <AnimatedNumber value={mc.p75} decimals={0} style={{ color: crisisColor }} />
          {' '}days (50% band)
        </div>
      )}
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(61,45,24,0.5)' }}>
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${currentDayState?.storage_pct ?? 0}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: crisisColor, boxShadow: `0 0 8px ${crisisColor}60` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: crisisLevel === 'critical' || crisisLevel === 'zero' ? 0.8 : 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ background: crisisColor }}
          />
          <span className="text-xs font-heading tracking-widest" style={{ color: crisisColor }}>
            {CRISIS_LABELS[crisisLevel] ?? crisisLevel.toUpperCase()}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>🌡 {temp.toFixed(0)}°C</span>
      </div>
    </motion.div>
  )
}

// ── PrepScore ─────────────────────────────────────────────────────────────────
function PrepScore({ scoreSpring }: { scoreSpring: any }) {
  const { simulation, crisisLevel } = useStore()
  if (!simulation) return null

  const score = simulation.preparedness_score
  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'
  const label = score >= 70 ? 'Prepared' : score >= 50 ? 'Basic' : score >= 30 ? 'At Risk' : 'Critical'
  const circumference = 2 * Math.PI * 38

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-panel p-5 flex flex-col items-center"
    >
      <div className="text-xs font-heading tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
        PREPAREDNESS
      </div>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96" className="absolute inset-0">
          <circle cx="48" cy="48" r="38" stroke="rgba(61,45,24,0.5)" strokeWidth="7" fill="none" />
          <motion.circle
            cx="48" cy="48" r="38"
            stroke={crisisColor} strokeWidth="7" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
            transform="rotate(-90 48 48)"
            style={{ filter: `drop-shadow(0 0 6px ${crisisColor})` }}
          />
        </svg>
        <AnimatedNumber
          value={score} decimals={0}
          style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, color: crisisColor }}
        />
      </div>
      <div className="mt-2 text-xs font-heading font-semibold" style={{ color: crisisColor }}>{label}</div>
      <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {simulation.total_storage?.toFixed(0)}L · {simulation.daily_consumption?.toFixed(0)}L/day
      </div>
    </motion.div>
  )
}

// ── HealthGauges ──────────────────────────────────────────────────────────────
function HealthGauges() {
  const { currentDayState } = useStore()
  if (!currentDayState) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-panel p-4"
    >
      <div className="text-xs font-heading tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
        HEALTH METRICS
      </div>
      <div className="flex justify-around">
        <GaugeRing value={currentDayState.health.dehydration_risk} label="Dehydration" sublabel="Risk" type="risk" size={78} />
        <GaugeRing value={currentDayState.health.illness_risk} label="Illness" sublabel="Risk" type="risk" size={78} />
        <GaugeRing value={currentDayState.health.hygiene_score / 100} label="Hygiene" sublabel="Score" type="risk" size={78} />
      </div>
      <div className="mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Min needed:{' '}
        <AnimatedNumber
          value={currentDayState.health.survival_floor_liters} decimals={1} suffix="L potable/day"
          style={{ color: 'var(--color-teal)', fontFamily: 'var(--font-mono)' }}
        />
      </div>
    </motion.div>
  )
}

// ── StrategyComparison ────────────────────────────────────────────────────────
function StrategyComparison() {
  const { simulation } = useStore()
  if (!simulation?.strategy_comparison) return null

  const strats = [
    { key: 'none',     label: 'No change',   color: '#dc2626' },
    { key: 'mild',     label: 'Mild ration', color: '#f59e0b' },
    { key: 'moderate', label: 'Moderate',    color: '#7dd3fc' },
    { key: 'severe',   label: 'Severe',      color: '#00c4ae' },
  ]
  const maxDays = Math.max(...strats.map(s => simulation.strategy_comparison[s.key]?.days_until_zero ?? 0))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-panel p-5"
    >
      <div className="text-xs font-heading tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
        SCENARIO COMPARISON
      </div>
      {strats.map(({ key, label, color }, i) => {
        const days = simulation.strategy_comparison[key]?.days_until_zero ?? 0
        const pct = maxDays > 0 ? (days / maxDays) * 100 : 0
        return (
          <div key={key} className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
              <AnimatedNumber value={days} suffix="d" style={{ color, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(61,45,24,0.5)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.8, ease: 'easeOut' }}
                style={{ background: color, boxShadow: `0 0 6px ${color}50` }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Rationing strategy vs supply duration</p>
    </motion.div>
  )
}

// ── AI Insights ───────────────────────────────────────────────────────────────
function AIInsights() {
  const { simulation, crisisLevel, currentDayState, household } = useStore()
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grounded, setGrounded] = useState(false)
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([])
  const hasFetched = useRef(false)

  const fetchInsights = useCallback(async () => {
    if (!simulation || !currentDayState) return
    setLoading(true)
    setError(null)
    try {
      const totalMembers = household?.members?.reduce((s, m) => s + m.count, 0) ?? 2
      const result = await getAIInsights({
        days_remaining: simulation.days.length,
        crisis_level: crisisLevel,
        prep_score: simulation.preparedness_score,
        daily_consumption: simulation.daily_consumption ?? 50,
        total_storage: simulation.total_storage ?? 1000,
        city: simulation.city?.name ?? 'your city',
        members: totalMembers,
        dehydration_risk: Math.round((currentDayState.health.dehydration_risk ?? 0) * 100),
        hygiene_score: Math.round(currentDayState.health.hygiene_score ?? 100),
        rationing_level: currentDayState.rationing_level ?? 'none',
        live_temp: simulation.live_temp,
      })
      setInsights(result.insights)
      setGrounded(result.grounded ?? false)
      setSources(result.sources ?? [])
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'unknown error'
      setError(`AI unavailable: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [simulation, crisisLevel, currentDayState, household])

  // Auto-fetch when simulation first loads
  useEffect(() => {
    if (hasFetched.current || !simulation || !currentDayState) return
    hasFetched.current = true
    fetchInsights()
  }, [simulation, currentDayState, fetchInsights])

  const aiColor = '#a855f7'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="glass-panel-warm p-4 relative overflow-hidden"
      style={{ border: `1px solid rgba(168,85,247,0.25)` }}
    >
      {loading && <div className="absolute inset-0 ai-shimmer rounded-xl pointer-events-none" />}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={loading ? { rotate: 360 } : { scale: [1, 1.2, 1] }}
            transition={loading
              ? { duration: 1.2, repeat: Infinity, ease: 'linear' }
              : { duration: 2.5, repeat: Infinity }}
            style={{ fontSize: 14, color: aiColor }}
          >✦</motion.div>
          <span className="text-xs font-heading tracking-widest" style={{ color: aiColor }}>AI ADVISOR</span>
          {grounded && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(168,85,247,0.12)', color: aiColor, fontSize: 8 }}>
              🔍 live search
            </span>
          )}
        </div>
        <button onClick={fetchInsights} disabled={loading}
          className="text-xs px-2 py-1 rounded-lg"
          style={{
            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)',
            color: loading ? 'var(--color-text-muted)' : aiColor,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '…' : '↺'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading && !insights && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {['Searching live water news…', 'Analyzing crisis data…', 'Generating survival advice…'].map((t, i) => (
              <motion.p key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.6 }}
                className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{t}</motion.p>
            ))}
          </motion.div>
        )}
        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-xs mb-2" style={{ color: '#f97316' }}>{error}</p>
            <button onClick={fetchInsights}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(168,85,247,0.15)', color: aiColor, border: '1px solid rgba(168,85,247,0.25)' }}>
              Retry
            </button>
          </motion.div>
        )}
        {insights && !loading && (
          <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
              {insights}
            </p>
            {sources.length > 0 && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(168,85,247,0.1)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>SOURCES</p>
                {sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer"
                    className="block text-xs truncate hover:underline"
                    style={{ color: aiColor, fontSize: 9, opacity: 0.8 }}>
                    · {s.title}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 pt-2 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(168,85,247,0.1)' }}>
        <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Powered by</span>
        <span style={{ fontSize: 9, color: aiColor, fontFamily: 'var(--font-mono)' }}>Gemini 2.0 Flash</span>
        {grounded && <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>+ Google Search</span>}
      </div>
    </motion.div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function Dashboard() {
  const { simulation, crisisLevel, currentDayState, setActiveNav, currentDay } = useStore()

  const storagePercent = currentDayState?.storage_pct ?? 100
  const daysLeft = simulation ? simulation.days.length - currentDay : 0
  const score = simulation?.preparedness_score ?? 0

  const { displayFill, daysSpring, scoreSpring, statsVisible } = useReveal(storagePercent, daysLeft, score)

  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'
  const containers = currentDayState?.containers ?? []
  const consumption = currentDayState?.consumption
  const totalInitial = simulation?.total_storage ?? 0

  if (!simulation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <div style={{ fontSize: 48 }}>💧</div>
          </motion.div>
          <h2 className="font-heading text-xl font-bold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }}>
            No simulation yet
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Complete the setup to see your survival dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(61,45,24,0.4)' }}
      >
        <div className="flex items-center gap-4">
          <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Water Survival Dashboard
          </h1>
          <motion.div
            animate={{ borderColor: [`${crisisColor}30`, `${crisisColor}70`, `${crisisColor}30`] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs font-mono px-2.5 py-1 rounded-lg"
            style={{ background: `${crisisColor}12`, color: crisisColor, border: `1px solid ${crisisColor}30` }}
          >
            Day {currentDayState?.day ?? 0}
          </motion.div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${crisisColor}30` }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveNav('simulation')}
          className="px-4 py-2 rounded-xl text-xs font-heading font-semibold tracking-wide transition-all"
          style={{ background: `${crisisColor}18`, color: crisisColor, border: `1px solid ${crisisColor}35` }}
        >
          Open Simulation →
        </motion.button>
      </motion.div>

      {/* Main grid */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '280px 1fr 270px' }}>

        {/* Left panel */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto" style={{ borderRight: '1px solid rgba(61,45,24,0.3)' }}>
          <DaysRemainingCard daysSpring={daysSpring} scoreSpring={scoreSpring} />
          <PrepScore scoreSpring={scoreSpring} />
          <HealthGauges />
        </div>

        {/* Center: 3D Tank */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
            <AnimatedNumber
              value={displayFill} decimals={0} suffix="%"
              stiffness={50} damping={16}
              style={{
                fontSize: 48, fontFamily: 'var(--font-heading)', fontWeight: 700,
                letterSpacing: -1, color: crisisColor,
                textShadow: `0 0 30px ${crisisColor}60`, display: 'block', lineHeight: 1,
              }}
            />
            <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-text-muted)' }}>
              <AnimatedNumber value={currentDayState?.storage_total_liters ?? 0} decimals={0} suffix="L total"
                style={{ color: 'var(--color-text-muted)' }} />
              {' · '}
              <AnimatedNumber value={currentDayState?.storage_potable_liters ?? 0} decimals={0} suffix="L potable"
                style={{ color: crisisColor }} />
            </div>
          </div>

          <Scene fillPercent={displayFill} crisisLevel={crisisLevel} height="100%" />

          <div className="absolute bottom-4 text-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentDayState?.date}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="text-xs font-mono flex flex-col items-center gap-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span>{currentDayState?.date} · {currentDayState?.temperature_celsius.toFixed(0)}°C</span>
                {simulation?.live_temp != null && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{
                      background: 'rgba(0,196,174,0.12)',
                      border: '1px solid rgba(0,196,174,0.3)',
                      color: 'var(--color-teal)',
                      fontSize: 9,
                    }}
                  >
                    🌡 {simulation.live_temp}°C Live · Open-Meteo
                  </motion.span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right panel */}
        <AnimatePresence>
          {statsVisible && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 p-4 overflow-y-auto"
              style={{ borderLeft: '1px solid rgba(61,45,24,0.3)' }}
            >
              <StorageBreakdown containers={containers} totalInitial={totalInitial} />
              {consumption && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="glass-panel p-4"
                >
                  <ConsumptionDonut breakdown={consumption as any} />
                  <div className="mt-3 pt-3 border-t text-xs flex justify-between"
                    style={{ borderColor: 'rgba(61,45,24,0.4)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Total today</span>
                    <AnimatedNumber value={consumption.total} decimals={1} suffix="L"
                      style={{ color: crisisColor, fontFamily: 'var(--font-mono)' }} />
                  </div>
                </motion.div>
              )}
              <StrategyComparison />
              <AIInsights />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
