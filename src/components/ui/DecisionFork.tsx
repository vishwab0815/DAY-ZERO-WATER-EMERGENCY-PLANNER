import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, AlertTriangle, AlertOctagon, Truck, Droplets, ChevronRight } from 'lucide-react'
import type { DecisionEvent, DecisionOption } from '../../types'
import { useStore } from '../../store/useStore'

const ICONS: Record<string, React.ElementType> = {
  'arrow-right': ArrowRight,
  'droplets': Droplets,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
  'truck': Truck,
}

function OptionCard({ option, onSelect }: { option: DecisionOption; onSelect: () => void }) {
  const Icon = ICONS[option.icon] ?? ArrowRight

  const borderColor = option.health_impact < -30
    ? 'rgba(220,38,38,0.4)'
    : option.health_impact < -15
    ? 'rgba(245,158,11,0.4)'
    : 'rgba(0,180,160,0.3)'

  const accentColor = option.health_impact < -30
    ? '#dc2626'
    : option.health_impact < -15
    ? '#f59e0b'
    : '#00c4ae'

  return (
    <motion.button
      whileHover={{ scale: 1.015, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all duration-200 group"
      style={{
        background: 'rgba(26,19,10,0.8)',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
        >
          <Icon size={16} style={{ color: accentColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-heading font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {option.label}
            </span>
            <ChevronRight
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              style={{ color: accentColor }}
            />
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            {option.description}
          </p>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(125,211,252,0.08)' }}>
              <span className="text-xs" style={{ color: 'var(--color-ice)' }}>
                +{option.projected_days_remaining.toFixed(1)} days
              </span>
            </div>

            {option.health_impact < 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <span className="text-xs" style={{ color: '#f59e0b' }}>
                  Health {option.health_impact}
                </span>
              </div>
            )}

            {option.cost_inr > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(0,180,160,0.08)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--color-teal)' }}>
                  ₹{option.cost_inr.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {!option.reversible && (
              <div className="px-2 py-1 rounded-md" style={{ background: 'rgba(220,38,38,0.08)' }}>
                <span className="text-xs" style={{ color: '#dc2626' }}>Permanent change</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

export function DecisionFork() {
  const { activeDecision, setActiveDecision, recordDecision, currentDay } = useStore()

  if (!activeDecision) return null

  const urgencyColors = {
    info: { text: 'var(--color-ice)', bg: 'rgba(125,211,252,0.1)', border: 'rgba(125,211,252,0.3)' },
    warning: { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    critical: { text: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)' },
  }
  const uc = urgencyColors[activeDecision.urgency] ?? urgencyColors.info

  return (
    <AnimatePresence>
      <motion.div
        key="decision-fork"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 380,
          background: 'rgba(5,12,20,0.97)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(61,45,24,0.8)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(61,45,24,0.5)' }}>
          <div>
            <div className="font-heading font-semibold text-sm tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              DECISION POINT — DAY {activeDecision.day}
            </div>
            <div className="font-heading font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
              Water Threshold Reached
            </div>
          </div>
          <button
            onClick={() => setActiveDecision(null)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(61,45,24,0.4)' }}
          >
            <X size={15} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Alert message */}
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl" style={{ background: uc.bg, border: `1px solid ${uc.border}` }}>
          <p className="text-sm font-medium" style={{ color: uc.text }}>
            {activeDecision.message}
          </p>
        </div>

        {/* Storage indicator */}
        <div className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl glass-panel">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <span>Storage</span>
              <span className="font-mono">{activeDecision.threshold_pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(61,45,24,0.5)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${activeDecision.threshold_pct}%` }}
                style={{
                  background: activeDecision.threshold_pct < 20 ? '#dc2626' : activeDecision.threshold_pct < 40 ? '#f59e0b' : '#00c4ae'
                }}
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <div className="text-xs font-heading tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
            CHOOSE YOUR RESPONSE
          </div>
          {activeDecision.options.map((opt) => (
            <OptionCard
              key={opt.id}
              option={opt}
              onSelect={() => {
                recordDecision(currentDay, opt.id)
                setActiveDecision(null)
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(61,45,24,0.4)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            Each choice cascades through your survival timeline. Choose based on your actual situation.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
