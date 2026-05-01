import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { DecisionFork } from '../ui/DecisionFork'
import { ParticleBackground } from '../ui/ParticleBackground'
import { CrisisFlash } from '../ui/CrisisFlash'
import { GeminiChat } from '../ui/GeminiChat'
import { useCrisisTheme } from '../../hooks/useCrisisTheme'
import { useStore } from '../../store/useStore'

interface LayoutProps {
  children: React.ReactNode
}

function CrisisOverlay() {
  const { crisisLevel } = useStore()
  // Warm tint that deepens on critical/zero
  const tints: Record<string, string> = {
    safe:     'transparent',
    watch:    'transparent',
    warning:  'rgba(20,10,0,0.08)',
    critical: 'rgba(30,8,0,0.18)',
    zero:     'rgba(40,2,2,0.28)',
  }
  return (
    <motion.div
      animate={{ background: tints[crisisLevel] ?? 'transparent' }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}
    />
  )
}

export function Layout({ children }: LayoutProps) {
  const { activeDecision } = useStore()
  useCrisisTheme()

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--color-bg)', position: 'relative' }}>
      {/* Particle system layer */}
      <ParticleBackground />

      {/* Warm tint overlay when crisis deepens */}
      <CrisisOverlay />

      {/* Grid background */}
      <div className="bg-grid" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Main UI on top of effects */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', width: '100%', height: '100%' }}>
        <Sidebar />
        <motion.main
          key="main-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 overflow-hidden relative"
          style={{ marginRight: activeDecision ? 380 : 0, transition: 'margin-right 0.4s ease' }}
        >
          {children}
        </motion.main>
      </div>

      {/* Overlay layers */}
      <CrisisFlash />
      <DecisionFork />
      <GeminiChat />
    </div>
  )
}
