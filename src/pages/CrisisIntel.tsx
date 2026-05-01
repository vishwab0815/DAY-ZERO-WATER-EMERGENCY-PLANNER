import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getCrises } from '../lib/api'
import { useStore } from '../store/useStore'
import type { Crisis } from '../types'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  severe: '#f97316',
  moderate: '#f59e0b',
}

function CrisisCard({ crisis, delay }: { crisis: Crisis; delay: number }) {
  const [expanded, setExpanded] = useState(false)
  const severityColor = SEVERITY_COLORS[crisis.peak_severity] ?? '#f59e0b'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(26,19,10,0.85)', border: `1px solid ${severityColor}30` }}
    >
      {/* Header */}
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-heading"
                style={{ background: `${severityColor}15`, color: severityColor, border: `1px solid ${severityColor}30`, fontSize: 9 }}>
                {crisis.peak_severity.toUpperCase()}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{crisis.year}</span>
            </div>
            <h3 className="font-heading font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
              {crisis.title}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {crisis.city}, {crisis.country}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-bold text-xl" style={{ color: severityColor }}>
              {crisis.duration_days}d
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>duration</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Affected', value: `${(crisis.population_affected / 1000000).toFixed(1)}M` },
            { label: 'Reservoir onset', value: `${crisis.reservoir_level_at_onset_pct}%` },
            { label: 'Target L/day', value: `${crisis.survival_strategies.liters_per_day_target}L` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center px-2 py-2 rounded-xl" style={{ background: 'rgba(61,45,24,0.3)' }}>
              <div className="font-mono font-bold text-sm" style={{ color: severityColor }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-5 pb-5 border-t"
          style={{ borderColor: 'rgba(61,45,24,0.4)' }}
        >
          {/* Timeline */}
          <div className="mt-4 mb-4">
            <div className="font-heading text-xs tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
              CRISIS TIMELINE
            </div>
            <div className="flex flex-col gap-2">
              {crisis.timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 40 }}>
                    <div className="text-xs font-mono font-bold" style={{ color: severityColor, fontSize: 10 }}>D{event.day}</div>
                    {i < crisis.timeline.length - 1 && (
                      <div className="flex-1 w-px mt-1" style={{ background: 'rgba(61,45,24,0.5)', minHeight: 12 }} />
                    )}
                  </div>
                  <p className="text-xs leading-relaxed pb-2" style={{ color: 'var(--color-text-secondary)' }}>{event.event}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-heading text-xs tracking-widest mb-2" style={{ color: '#00c4ae' }}>✓ WHAT WORKED</div>
              {crisis.what_worked.map((item, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#00c4ae' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="font-heading text-xs tracking-widest mb-2" style={{ color: '#dc2626' }}>✗ WHAT FAILED</div>
              {crisis.what_failed.map((item, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#dc2626' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key insight */}
          <div className="mt-4 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(0,180,160,0.07)', border: '1px solid rgba(0,180,160,0.2)' }}>
            <div className="font-heading text-xs tracking-widest mb-1" style={{ color: 'var(--color-teal)', fontSize: 9 }}>KEY INSIGHT</div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {crisis.survival_strategies.key_insight}
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {crisis.survival_strategies.priority_order.map((p, i) => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,180,160,0.12)', color: 'var(--color-teal)', fontSize: 9 }}>
                  {i + 1}. {p.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function SeasonalCalendar() {
  const { household, simulation } = useStore()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const temps = simulation?.city?.monthly_temp ?? Array(12).fill(30)
  const rains = simulation?.city?.monthly_rainfall_mm ?? Array(12).fill(50)
  const maxRain = Math.max(...rains)
  const maxTemp = Math.max(...temps)
  const currentMonth = new Date().getMonth()

  return (
    <div className="glass-panel p-5">
      <div className="font-heading text-xs tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
        SEASONAL RISK CALENDAR — {simulation?.city?.name?.toUpperCase() ?? 'YOUR CITY'}
      </div>
      <div className="grid grid-cols-12 gap-1.5">
        {monthNames.map((month, i) => {
          const tempPct = temps[i] / maxTemp
          const rainPct = rains[i] / maxRain
          const riskLevel = temps[i] > 35 && rains[i] < 30 ? 'critical' : temps[i] > 30 && rains[i] < 50 ? 'warning' : 'safe'
          const riskColor = SEVERITY_COLORS[riskLevel] ?? SEVERITY_COLORS.moderate

          return (
            <div key={month} className="flex flex-col items-center gap-1">
              {/* Rain bar */}
              <div className="relative w-5 flex flex-col justify-end rounded-sm overflow-hidden" style={{ height: 40, background: 'rgba(61,45,24,0.3)' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${rainPct * 100}%` }}
                  transition={{ delay: i * 0.04, duration: 0.6, ease: 'easeOut' }}
                  className="w-full rounded-sm"
                  style={{ background: riskLevel === 'critical' ? '#7f1d1d' : 'rgba(125,211,252,0.5)' }}
                />
              </div>

              {/* Temp dot */}
              <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: `${riskColor}20` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor, opacity: tempPct }} />
              </div>

              {/* Month label */}
              <div className="text-center" style={{
                fontSize: 8,
                color: i === currentMonth ? 'var(--color-teal)' : 'var(--color-text-muted)',
                fontWeight: i === currentMonth ? 700 : 400,
              }}>
                {month}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
          <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(125,211,252,0.5)' }} /> Rainfall
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
          <div className="w-2 h-2 rounded-sm" style={{ background: '#f97316' }} /> High risk (hot+dry)
        </div>
        <div className="text-xs" style={{ color: 'var(--color-teal)', fontSize: 9 }}>▲ Current month</div>
      </div>
    </div>
  )
}

export function CrisisIntel() {
  const [crises, setCrises] = useState<Crisis[]>([])
  const [loading, setLoading] = useState(true)
  const { simulation } = useStore()

  useEffect(() => {
    getCrises().then(d => { setCrises(d.crises); setLoading(false) })
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(61,45,24,0.4)' }}>
        <div>
          <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Crisis Intelligence</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Real crises, real lessons — compared to your situation</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: crises */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="font-heading text-xs tracking-widest" style={{ color: 'var(--color-text-muted)' }}>DOCUMENTED CRISES</div>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full border-2"
                  style={{ borderColor: 'transparent', borderTopColor: 'var(--color-teal)' }} />
              </div>
            ) : crises.map((crisis, i) => (
              <CrisisCard key={crisis.id} crisis={crisis} delay={i * 0.15} />
            ))}
          </div>

          {/* Right: seasonal + comparison */}
          <div className="flex flex-col gap-4">
            <SeasonalCalendar />

            {/* Your profile vs crises */}
            {simulation && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="glass-panel p-4">
                <div className="font-heading text-xs tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  YOUR PROFILE
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Current supply', value: `${simulation.days?.length ?? 0} days`, color: 'var(--color-teal)' },
                    { label: 'Daily use', value: `${simulation.daily_consumption?.toFixed(0)}L`, color: 'var(--color-ice)' },
                    { label: 'Preparedness', value: `${simulation.preparedness_score?.toFixed(0)}/100`, color: simulation.preparedness_score > 50 ? '#00c4ae' : '#f59e0b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      <span className="font-mono font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(61,45,24,0.4)' }}>
                  <div className="font-heading text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
                    COMPARED TO CRISES
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {(simulation.days?.length ?? 0) >= 30
                      ? '✓ Your 30+ day supply would have survived the Chennai 2019 and Cape Town crises.'
                      : (simulation.days?.length ?? 0) >= 14
                      ? '⚠ Your supply lasts 2 weeks. You would have needed tanker water in Chennai 2019 by day 15.'
                      : '✗ Less than 14 days supply. You would have been in crisis within the first 2 weeks.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Universal insights */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="glass-panel p-4">
              <div className="font-heading text-xs tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>UNIVERSAL LESSONS</div>
              {[
                'Start rationing at 50%, not 10%',
                'Pre-crisis tanker booking beats panic buying',
                '50L/day is enough with discipline',
                'Open drums last only 2 days in 38°C+ heat',
                'Govt relief arrives on day 4–7, not day 1',
              ].map((insight, i) => (
                <div key={insight} className="flex gap-2 mb-2">
                  <span style={{ color: 'var(--color-teal)', fontSize: 12 }}>›</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{insight}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
