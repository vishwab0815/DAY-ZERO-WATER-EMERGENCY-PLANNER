import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'simulation',
    label: 'Simulation',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'alternatives',
    label: 'Alternatives',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    id: 'actions',
    label: 'Action Plan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    id: 'intel',
    label: 'Crisis Intel',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
]

// Pulse speed and glow radius scale with crisis intensity
const CRISIS_PULSE: Record<string, { duration: number; glowMax: number; borderAlpha: number }> = {
  safe:     { duration: 3.2, glowMax: 18, borderAlpha: 0.3 },
  watch:    { duration: 2.6, glowMax: 22, borderAlpha: 0.35 },
  warning:  { duration: 1.7, glowMax: 32, borderAlpha: 0.5  },
  critical: { duration: 1.1, glowMax: 44, borderAlpha: 0.65 },
  zero:     { duration: 0.7, glowMax: 60, borderAlpha: 0.85 },
}

export function Sidebar() {
  const { activeNav, setActiveNav, simulation, crisisLevel } = useStore()

  const crisisColors: Record<string, string> = {
    safe: '#00c4ae',
    watch: '#7dd3fc',
    warning: '#f59e0b',
    critical: '#f97316',
    zero: '#dc2626',
  }
  const indicatorColor = crisisColors[crisisLevel] ?? '#00b4a0'
  const pulse = CRISIS_PULSE[crisisLevel] ?? CRISIS_PULSE.safe

  const logoGlowMin = `0 0 8px ${indicatorColor}30`
  const logoGlowMax = `0 0 ${pulse.glowMax}px ${indicatorColor}${Math.round(pulse.borderAlpha * 255).toString(16).padStart(2, '0')}`

  return (
    <motion.div
      className="flex flex-col items-center h-full py-5 gap-2"
      animate={{
        borderRightColor: [`rgba(61,45,24,${pulse.borderAlpha * 0.4})`, `rgba(61,45,24,${pulse.borderAlpha * 0.9})`, `rgba(61,45,24,${pulse.borderAlpha * 0.4})`],
      }}
      transition={{ duration: pulse.duration * 1.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 64,
        background: 'rgba(10,8,5,0.97)',
        borderRight: '1px solid rgba(61,45,24,0.5)',
        flexShrink: 0,
      }}
    >
      {/* Logo — breathes with crisis */}
      <div className="mb-3 flex flex-col items-center gap-1">
        <motion.div
          animate={{ boxShadow: [logoGlowMin, logoGlowMax, logoGlowMin] }}
          transition={{ duration: pulse.duration, repeat: Infinity, ease: 'easeInOut' }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${indicatorColor}15`, border: `1px solid ${indicatorColor}40` }}
        >
          <motion.svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: pulse.duration, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke={indicatorColor} strokeWidth="1.5" />
            <path d="M12 6v6l4 2" stroke={indicatorColor} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 17c1-2 3-3 5-3s4 1 5 3" stroke={indicatorColor} strokeWidth="1.5" strokeLinecap="round" />
          </motion.svg>
        </motion.div>
      </div>

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id
          const isDisabled = !simulation && item.id !== 'dashboard'

          return (
            <div key={item.id} className="relative group">
              <motion.button
                whileHover={!isDisabled ? { scale: 1.1, x: 2 } : {}}
                whileTap={!isDisabled ? { scale: 0.93 } : {}}
                onClick={() => !isDisabled && setActiveNav(item.id)}
                disabled={isDisabled}
                className="w-11 h-11 rounded-xl flex items-center justify-center relative"
                animate={isActive ? {
                  boxShadow: [
                    `0 0 0px ${indicatorColor}00`,
                    `0 0 12px ${indicatorColor}35`,
                    `0 0 0px ${indicatorColor}00`,
                  ],
                } : {}}
                transition={isActive ? { duration: pulse.duration, repeat: Infinity, ease: 'easeInOut' } : {}}
                style={{
                  background: isActive ? `${indicatorColor}18` : 'transparent',
                  color: isActive ? indicatorColor : isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                  border: isActive ? `1px solid ${indicatorColor}40` : '1px solid transparent',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.35 : 1,
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                }}
              >
                {item.icon}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full"
                    style={{ background: indicatorColor, height: 20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tooltip */}
              <div
                className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                style={{
                  background: 'rgba(10,8,5,0.97)',
                  border: '1px solid rgba(61,45,24,0.8)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {item.label}
                {isDisabled && <span style={{ color: 'var(--color-text-muted)' }}> (run simulation first)</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Crisis dot — pulse speed = crisis intensity */}
      {simulation && (
        <div className="mt-auto flex flex-col items-center gap-1.5">
          <div style={{ position: 'relative', width: 10, height: 10 }}>
            {/* Ripple ring */}
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: pulse.duration * 0.8, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `1px solid ${indicatorColor}`,
              }}
            />
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: pulse.duration, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: indicatorColor, margin: 1 }}
            />
          </div>
          <span
            className="font-heading"
            style={{ fontSize: 7, color: indicatorColor, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {crisisLevel}
          </span>
        </div>
      )}
    </motion.div>
  )
}
