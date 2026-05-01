import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, AlertOctagon, Info, ChevronDown } from 'lucide-react'
import { useStore } from '../store/useStore'
import { BigGauge } from '../components/ui/GaugeRing'

const CRISIS_COLORS: Record<string, string> = {
  safe: '#00c4ae', watch: '#7dd3fc', warning: '#f59e0b', critical: '#f97316', zero: '#dc2626',
}

const PRIORITY_ICONS = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: Info,
  low: Info,
}

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#7dd3fc',
}

interface ActionItem {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  cost?: string
  time?: string
  impact: string
  done: boolean
}

function generateActions(score: number, simulation: any): ActionItem[] {
  const actions: ActionItem[] = []
  const daysSupply = simulation?.days?.length ?? 0

  if (daysSupply < 7) {
    actions.push({
      id: 'buy_bottles', priority: 'critical',
      title: 'Buy sealed water bottles immediately',
      description: 'You have less than 7 days of supply. Buy at least 100L of sealed bottles today.',
      cost: '~₹400-600', time: 'Today',
      impact: `+${Math.round(100 / (simulation?.daily_consumption || 40))} days`,
      done: false,
    })
  }
  if (daysSupply < 14) {
    actions.push({
      id: 'locate_ro', priority: 'high',
      title: 'Locate 2 nearby RO shops',
      description: 'Know exactly where to get clean water if your supply fails. Walk the route now, not during panic.',
      cost: 'Free research', time: 'This week',
      impact: 'Emergency preparedness',
      done: false,
    })
  }
  if (score < 50) {
    actions.push({
      id: 'treatment_tablets', priority: 'high',
      title: 'Buy water treatment tablets',
      description: 'Chlorine tablets let you make utility/questionable water potable in emergency. Costs almost nothing.',
      cost: '₹80-150', time: 'This week',
      impact: 'Extends any water source to potable',
      done: false,
    })
  }
  actions.push({
    id: 'clean_tank', priority: 'high',
    title: 'Clean your overhead tank',
    description: 'Dirty tanks contaminate water within days. Clean every 6 months. Costs ₹0 to do yourself.',
    cost: '₹0-300', time: 'This month',
    impact: 'Extends potable days from 4 to 7',
    done: false,
  })
  actions.push({
    id: 'practice_bucket', priority: 'medium',
    title: 'Practice bucket bath for one week',
    description: 'Switching from shower to bucket bath in panic is harder than practicing now. 15L vs 60L — a 4x difference.',
    cost: '₹0', time: 'Start now',
    impact: 'Saves 45L/day per person',
    done: false,
  })
  actions.push({
    id: 'grey_water', priority: 'medium',
    title: 'Set up grey water reuse system',
    description: 'Route bath water to flush the toilet. A simple bucket setup. Cape Town families saved 30L/person/day this way.',
    cost: '₹0-500', time: 'This weekend',
    impact: 'Saves 30L/day',
    done: false,
  })
  if (score < 70) {
    actions.push({
      id: 'rain_drum', priority: 'medium',
      title: 'Install a 500L rain drum under your downpipe',
      description: 'Even one monsoon day fills it. Covers toilet/bathing for days with zero cost after setup.',
      cost: '₹2,000-4,000', time: 'Before monsoon',
      impact: '500L free water per rain event',
      done: false,
    })
  }
  actions.push({
    id: 'community_plan', priority: 'low',
    title: 'Talk to your building committee about shared storage',
    description: 'Shared sump tanks give everyone buffer. A community plan is 10x more resilient than individual prep.',
    cost: '0 (community cost varies)', time: 'This month',
    impact: 'Multiplies everyone\'s buffer',
    done: false,
  })
  actions.push({
    id: 'save_tanker_number', priority: 'low',
    title: 'Save 3 water tanker numbers now',
    description: 'During crisis, tanker numbers are impossible to find. Get them today, save in contacts.',
    cost: '₹0', time: '5 minutes',
    impact: 'Instant backup access',
    done: false,
  })

  return actions
}

function ActionCard({ item, onToggle }: { item: ActionItem; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = PRIORITY_ICONS[item.priority]
  const color = PRIORITY_COLORS[item.priority]

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: item.done ? 'rgba(10,8,5,0.4)' : 'rgba(26,19,10,0.8)',
        border: `1px solid ${item.done ? 'rgba(61,45,24,0.25)' : `${color}35`}`,
        opacity: item.done ? 0.55 : 1,
      }}
    >
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {/* Priority indicator */}
        <div className="w-1 h-full rounded-full flex-shrink-0 self-stretch"
          style={{ background: item.done ? 'rgba(61,45,24,0.5)' : color, minHeight: 20 }} />

        {/* Check button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
          style={{
            background: item.done ? `${color}30` : 'rgba(61,45,24,0.5)',
            border: `1px solid ${item.done ? color : 'rgba(61,45,24,0.7)'}`,
          }}
        >
          {item.done && <Check size={10} style={{ color }} />}
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-sm font-medium"
              style={{
                color: item.done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecoration: item.done ? 'line-through' : 'none',
              }}
            >
              {item.title}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {item.cost && (
              <span className="text-xs font-mono" style={{ color: 'var(--color-teal)', fontSize: 10 }}>{item.cost}</span>
            )}
            {item.time && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>⏱ {item.time}</span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: `${color}12`, color, fontSize: 9 }}>
              {item.impact}
            </span>
          </div>
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="flex-shrink-0 mt-0.5">
          <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
            style={{ marginLeft: 16 }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {item.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ActionCenter() {
  const { simulation, crisisLevel } = useStore()
  const [actions, setActions] = useState<ActionItem[]>(() =>
    generateActions(simulation?.preparedness_score ?? 0, simulation)
  )
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  const score = simulation?.preparedness_score ?? 0
  const crisisColor = CRISIS_COLORS[crisisLevel] ?? '#00c4ae'
  const completedCount = actions.filter(a => a.done).length
  const completedScore = Math.min(100, score + completedCount * 5)

  const filtered = filter === 'all' ? actions : actions.filter(a => a.priority === filter)

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a))
  }

  const priorityCounts = {
    critical: actions.filter(a => a.priority === 'critical' && !a.done).length,
    high: actions.filter(a => a.priority === 'high' && !a.done).length,
    medium: actions.filter(a => a.priority === 'medium' && !a.done).length,
    low: actions.filter(a => a.priority === 'low' && !a.done).length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(61,45,24,0.4)' }}>
        <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
          Action Center
        </h1>
        <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {completedCount}/{actions.length} completed
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: score + summary */}
        <div className="flex-shrink-0 flex flex-col gap-4 p-5" style={{ width: 240, borderRight: '1px solid rgba(61,45,24,0.3)' }}>
          <div className="flex flex-col items-center">
            <BigGauge value={completedScore} label="PREPAREDNESS" crisisColor={crisisColor} />
            {completedCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-2 text-xs text-center" style={{ color: 'var(--color-teal)' }}>
                +{completedCount * 5} pts from actions
              </motion.div>
            )}
          </div>

          {/* Priority summary */}
          <div className="glass-panel p-4 flex flex-col gap-2.5">
            <div className="font-heading text-xs tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>OPEN ITEMS</div>
            {Object.entries(priorityCounts).map(([priority, count]) => (
              count > 0 && (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-xs capitalize flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>{priority}</span>
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] }}>
                    {count}
                  </span>
                </div>
              )
            ))}
          </div>

          {/* Days at risk context */}
          {simulation && (
            <div className="glass-panel p-4">
              <div className="font-heading text-xs tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>CONTEXT</div>
              <div className="text-sm font-mono font-bold" style={{ color: crisisColor }}>
                {simulation.days?.length ?? 0} days
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>without action</div>
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {simulation.daily_consumption?.toFixed(0)}L/day · {simulation.total_storage?.toFixed(0)}L stored
              </div>
            </div>
          )}
        </div>

        {/* Right: action list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(61,45,24,0.3)' }}>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-heading font-medium capitalize transition-all"
                style={{
                  background: filter === f ? (f === 'all' ? 'rgba(0,180,160,0.2)' : `${PRIORITY_COLORS[f as keyof typeof PRIORITY_COLORS] ?? '#00c4ae'}20`) : 'transparent',
                  color: filter === f ? (f === 'all' ? 'var(--color-teal)' : PRIORITY_COLORS[f as keyof typeof PRIORITY_COLORS] ?? 'var(--color-text-secondary)') : 'var(--color-text-muted)',
                  border: filter === f ? `1px solid ${f === 'all' ? 'rgba(0,180,160,0.3)' : `${PRIORITY_COLORS[f as keyof typeof PRIORITY_COLORS] ?? '#00c4ae'}40`}` : '1px solid transparent',
                }}>
                {f}
                {f !== 'all' && priorityCounts[f] > 0 && (
                  <span className="ml-1.5 text-xs" style={{ fontSize: 9, opacity: 0.7 }}>({priorityCounts[f]})</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
            <AnimatePresence>
              {filtered.map((action, i) => (
                <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <ActionCard item={action} onToggle={() => toggleAction(action.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
