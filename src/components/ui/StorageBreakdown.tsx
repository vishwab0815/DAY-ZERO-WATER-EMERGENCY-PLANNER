import { motion } from 'framer-motion'
import type { StorageSnapshot } from '../../types'

const STORAGE_LABELS: Record<string, string> = {
  sealed_bottles: 'Sealed Bottles',
  overhead_tank: 'Overhead Tank',
  underground_sump: 'Underground Sump',
  open_drum: 'Open Drum',
  ro_output: 'RO Output',
  clay_pot: 'Clay Pot',
}

const STORAGE_ICONS: Record<string, string> = {
  sealed_bottles: '🧴',
  overhead_tank: '🏗️',
  underground_sump: '🌊',
  open_drum: '🛢️',
  ro_output: '💧',
  clay_pot: '🏺',
}

const QUALITY_COLORS: Record<string, string> = {
  potable: '#00c4ae',
  utility_only: '#f59e0b',
  unsafe: '#dc2626',
}

const QUALITY_LABELS: Record<string, string> = {
  potable: 'Drinkable',
  utility_only: 'Non-potable',
  unsafe: 'Unsafe',
}

interface StorageBreakdownProps {
  containers: StorageSnapshot[]
  totalInitial: number
}

export function StorageBreakdown({ containers, totalInitial }: StorageBreakdownProps) {
  const totalCurrent = containers.reduce((s, c) => s + c.liters_remaining, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-heading tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
          STORAGE INVENTORY
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--color-teal)' }}>
          {totalCurrent.toFixed(0)}L remaining
        </span>
      </div>

      {containers.filter(c => c.liters_remaining > 0.1).map((container, i) => {
        const pct = totalInitial > 0 ? (container.liters_remaining / totalInitial) * 100 : 0
        const color = QUALITY_COLORS[container.quality] ?? '#00c4ae'

        return (
          <motion.div
            key={`${container.type}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-lg p-3"
            style={{ background: 'rgba(26,19,10,0.6)', border: '1px solid rgba(61,45,24,0.4)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>{STORAGE_ICONS[container.type] ?? '💧'}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {STORAGE_LABELS[container.type] ?? container.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background: `${color}15`, color, fontSize: 9 }}
                >
                  {QUALITY_LABELS[container.quality] ?? container.quality}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>
                  {container.liters_remaining.toFixed(0)}L
                </span>
              </div>
            </div>

            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(61,45,24,0.5)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, pct)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.08 }}
                style={{ background: color }}
              />
            </div>

            {container.quality !== 'unsafe' && container.days_until_unsafe > 0 && container.days_until_unsafe < 7 && (
              <div className="mt-1.5 text-xs" style={{ color: '#f59e0b', fontSize: 9 }}>
                ⚠ Quality degrades in {container.days_until_unsafe}d
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export function ConsumptionDonut({ breakdown }: { breakdown: Record<string, number> }) {
  const COLORS: Record<string, string> = {
    drinking: '#00d4c8',
    cooking: '#7dd3fc',
    toilet: '#94a3b8',
    bathing: '#0a9396',
    handwashing: '#00c4ae',
    laundry: '#475569',
    vessel_washing: '#64748b',
    other: '#334155',
  }

  const entries = Object.entries(breakdown).filter(([k, v]) => k !== 'total' && v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-heading tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
        DAILY USE BREAKDOWN
      </div>
      {entries.map(([key, value]) => {
        const pct = total > 0 ? (value / total) * 100 : 0
        const color = COLORS[key] ?? '#475569'
        const label = key.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())

        return (
          <div key={key} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)', fontSize: 10 }}>{label}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-primary)', fontSize: 10 }}>
                {value.toFixed(1)}L
              </span>
            </div>
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(61,45,24,0.5)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
