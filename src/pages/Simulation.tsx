import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, AlertTriangle } from 'lucide-react'
import { Scene } from '../components/3d/Scene'
import { GaugeRing } from '../components/ui/GaugeRing'
import { useStore } from '../store/useStore'

const CRISIS_COLORS: Record<string, string> = {
  safe: '#00c4ae', watch: '#7dd3fc', warning: '#f59e0b', critical: '#f97316', zero: '#dc2626',
}

function Timeline() {
  const { simulation, currentDay, setCurrentDay, crisisLevel } = useStore()
  if (!simulation) return null

  const days = simulation.days
  const totalDays = days.length
  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'

  const getColor = (d: typeof days[0]) => CRISIS_COLORS[d.crisis_level] ?? '#00c4ae'

  return (
    <div className="relative px-4 py-3" style={{ background: 'rgba(10,8,5,0.8)', borderTop: '1px solid rgba(61,45,24,0.4)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-heading tracking-widest" style={{ color: 'var(--color-text-muted)' }}>TIMELINE</span>
        <span className="text-xs font-mono" style={{ color: crisisColor }}>Day {currentDay} / {totalDays - 1}</span>
      </div>

      <div className="relative h-12 cursor-pointer" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const pct = x / rect.width
        const day = Math.round(pct * (totalDays - 1))
        setCurrentDay(Math.max(0, Math.min(totalDays - 1, day)))
      }}>
        {/* Track */}
        <div className="absolute top-5 left-0 right-0 h-1 rounded-full" style={{ background: 'rgba(61,45,24,0.5)' }} />

        {/* Day bars */}
        <div className="absolute top-1 left-0 right-0 flex gap-px" style={{ height: 8 }}>
          {days.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-150"
              style={{
                background: i <= currentDay ? getColor(d) : 'rgba(61,45,24,0.3)',
                opacity: i <= currentDay ? 1 : 0.4,
                height: d.decision_event ? 8 : 4,
                marginTop: d.decision_event ? 0 : 2,
              }}
            />
          ))}
        </div>

        {/* Decision point diamonds */}
        {days.map((d, i) => d.decision_event && (
          <motion.div
            key={`dp-${i}`}
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
            className="absolute top-3 w-2.5 h-2.5 rotate-45 cursor-pointer"
            style={{
              left: `${(i / (totalDays - 1)) * 100}%`,
              background: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.8)',
              marginLeft: -5,
              boxShadow: '0 0 6px rgba(245,158,11,0.6)',
            }}
            onClick={(e) => { e.stopPropagation(); setCurrentDay(i) }}
            title={`Decision point: Day ${i}`}
          />
        ))}

        {/* Current position indicator */}
        <motion.div
          className="absolute top-2 w-3 h-3 rounded-full border-2"
          style={{
            left: `${(currentDay / Math.max(1, totalDays - 1)) * 100}%`,
            marginLeft: -6,
            background: crisisColor,
            borderColor: '#050c14',
            boxShadow: `0 0 10px ${crisisColor}`,
            zIndex: 10,
          }}
          layoutId="timeline-cursor"
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>Day 0</span>
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
          Day {Math.round(totalDays / 2)}
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
          Day {totalDays - 1}
        </span>
      </div>
    </div>
  )
}

function DayInfoPanel() {
  const { currentDayState, crisisLevel } = useStore()
  if (!currentDayState) return null

  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'
  const scenarios = currentDayState.days_remaining_scenarios

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-4">
      {/* Date + crisis level */}
      <div>
        <div className="font-heading text-xs tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
          DAY {currentDayState.day} — {currentDayState.date}
        </div>
        <div className="flex items-center gap-2">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full" style={{ background: crisisColor }} />
          <span className="font-heading font-bold text-lg" style={{ color: crisisColor }}>
            {crisisLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Storage stats */}
      <div className="glass-panel p-4">
        <div className="font-heading text-xs tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>STORAGE</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Total', value: `${currentDayState.storage_total_liters.toFixed(0)}L`, sub: `${currentDayState.storage_pct.toFixed(1)}%` },
            { label: 'Potable', value: `${currentDayState.storage_potable_liters.toFixed(0)}L`, sub: 'drinkable' },
            { label: 'Usage', value: `${currentDayState.consumption.total.toFixed(1)}L`, sub: 'today' },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <div className="font-mono font-bold text-lg" style={{ color: crisisColor }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{label}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Health */}
      <div className="glass-panel p-4">
        <div className="font-heading text-xs tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>HEALTH</div>
        <div className="flex justify-around">
          <GaugeRing value={currentDayState.health.dehydration_risk} label="Dehydration" type="risk" size={68} />
          <GaugeRing value={currentDayState.health.illness_risk} label="Illness" type="risk" size={68} />
          <GaugeRing value={currentDayState.health.hygiene_score / 100} label="Hygiene" type="risk" size={68} />
        </div>
      </div>

      {/* Scenarios */}
      {scenarios && (
        <div className="glass-panel p-4">
          <div className="font-heading text-xs tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
            SCENARIOS FROM HERE
          </div>
          {Object.entries(scenarios).map(([strat, mc]) => {
            const colors: Record<string, string> = { none: '#dc2626', mild: '#f59e0b', moderate: '#7dd3fc', severe: '#00c4ae' }
            return (
              <div key={strat} className="flex items-center justify-between mb-2">
                <span className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                  {strat === 'none' ? 'No change' : `${strat} ration`}
                </span>
                <span className="text-xs font-mono" style={{ color: colors[strat] ?? '#00c4ae' }}>
                  {mc.median.toFixed(0)}d ± {mc.std.toFixed(0)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Temperature */}
      <div className="text-xs flex justify-between px-1" style={{ color: 'var(--color-text-muted)' }}>
        <span>🌡 {currentDayState.temperature_celsius.toFixed(0)}°C</span>
        <span>Floor: {currentDayState.health.survival_floor_liters.toFixed(1)}L/day</span>
      </div>
    </div>
  )
}

export function Simulation() {
  const {
    simulation, currentDay, setCurrentDay, isPlaying, setIsPlaying,
    crisisLevel, storagePercent, activeDecision, setActiveDecision, currentDayState
  } = useStore()

  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalDays = simulation?.days.length ?? 0

  const stopPlayback = useCallback(() => {
    if (playRef.current) { clearInterval(playRef.current); playRef.current = null }
    setIsPlaying(false)
  }, [setIsPlaying])

  useEffect(() => {
    if (isPlaying) {
      if (currentDay >= totalDays - 1) { stopPlayback(); return }
      playRef.current = setInterval(() => {
        const day = useStore.getState().currentDay
        if (day >= totalDays - 1) { stopPlayback(); return }
        setCurrentDay(day + 1)
      }, 500)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [isPlaying, totalDays, stopPlayback, setCurrentDay])

  useEffect(() => {
    if (currentDayState?.decision_event?.triggered) {
      setActiveDecision(currentDayState.decision_event)
    }
  }, [currentDay, currentDayState])

  if (!simulation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No simulation data. Complete setup first.</p>
      </div>
    )
  }

  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(61,45,24,0.4)' }}>
        <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
          Day-by-Day Simulation
        </h1>
        <div className="flex items-center gap-3">
          {activeDecision && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
              <AlertTriangle size={12} />
              Decision required
            </motion.div>
          )}
          {/* Playback controls */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentDay(0)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(61,45,24,0.4)', color: 'var(--color-text-secondary)' }}>
              <SkipBack size={13} />
            </button>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => isPlaying ? stopPlayback() : setIsPlaying(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-heading"
              style={{ background: `${crisisColor}20`, border: `1px solid ${crisisColor}40`, color: crisisColor }}>
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </motion.button>
            <button onClick={() => setCurrentDay(Math.min(totalDays - 1, currentDay + 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(61,45,24,0.4)', color: 'var(--color-text-secondary)' }}>
              <SkipForward size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main simulation area */}
      <div className="flex-1 overflow-hidden flex" style={{ minHeight: 0 }}>
        {/* 3D Tank - large */}
        <div className="relative flex-1">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={Math.round(storagePercent)}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="font-heading font-bold"
                style={{ fontSize: 52, color: crisisColor, textShadow: `0 0 40px ${crisisColor}50`, letterSpacing: -1 }}
              >
                {Math.round(storagePercent)}%
              </motion.div>
            </AnimatePresence>
            <div className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {(currentDayState?.storage_total_liters ?? 0).toFixed(0)}L
            </div>
          </div>
          <Scene fillPercent={storagePercent} crisisLevel={crisisLevel} height="100%" />

          {/* Monte Carlo confidence band overlay */}
          {currentDayState?.monte_carlo && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-4 py-2 rounded-xl text-center"
                style={{ background: 'rgba(5,12,20,0.7)', border: '1px solid rgba(61,45,24,0.5)', backdropFilter: 'blur(8px)' }}>
                <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  Estimated days left (500 simulations):
                </div>
                <div className="text-sm font-mono font-bold mt-0.5" style={{ color: crisisColor }}>
                  {currentDayState.monte_carlo.p25.toFixed(0)}–{currentDayState.monte_carlo.p75.toFixed(0)} days
                  <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>(median: {currentDayState.monte_carlo.median.toFixed(0)})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right info panel */}
        <div className="flex-shrink-0 overflow-hidden" style={{ width: 280, borderLeft: '1px solid rgba(61,45,24,0.3)' }}>
          <DayInfoPanel />
        </div>
      </div>

      {/* Timeline at bottom */}
      <div className="flex-shrink-0">
        <Timeline />
      </div>
    </div>
  )
}
