import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'

const URGENCY_COLORS = {
  info: 'rgba(125,211,252,0.18)',
  warning: 'rgba(245,158,11,0.22)',
  critical: 'rgba(220,38,38,0.28)',
}

export function CrisisFlash() {
  const { activeDecision } = useStore()
  const [flash, setFlash] = useState<{ color: string; label: string; pct: number } | null>(null)
  const prevDecisionRef = useRef<typeof activeDecision>(null)

  useEffect(() => {
    if (activeDecision && !prevDecisionRef.current) {
      const color = URGENCY_COLORS[activeDecision.urgency] ?? URGENCY_COLORS.warning
      setFlash({ color, label: activeDecision.message, pct: activeDecision.threshold_pct })
      const t = setTimeout(() => setFlash(null), 1800)
      return () => clearTimeout(t)
    }
    prevDecisionRef.current = activeDecision
  }, [activeDecision])

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key="crisis-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 0] }}
          transition={{ duration: 1.6, times: [0, 0.15, 0.5, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            pointerEvents: 'none',
            background: flash.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: [0.85, 1.05, 1], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, times: [0, 0.15, 0.5, 1] }}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 22,
              fontWeight: 700,
              color: '#f0f9ff',
              letterSpacing: 2,
              textShadow: '0 0 40px rgba(255,255,255,0.4)',
              textAlign: 'center',
              padding: '0 40px',
            }}
          >
            STORAGE AT {flash.pct.toFixed(0)}%
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Day Zero overlay — triggered when simulation reaches 0L
export function DayZeroOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(10,2,2,0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        cursor: 'pointer',
      }}
      onClick={onDismiss}
    >
      {/* Pulsing rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: '1px solid rgba(220,38,38,0.4)',
          }}
          animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 80,
          fontWeight: 700,
          color: '#dc2626',
          letterSpacing: -2,
          lineHeight: 1,
          textShadow: '0 0 60px rgba(220,38,38,0.6)',
        }}
      >
        DAY ZERO
      </motion.div>

      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: '#94a3b8', letterSpacing: 4 }}>
        WATER SUPPLY DEPLETED
      </div>

      <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
        click to continue
      </div>
    </motion.div>
  )
}
