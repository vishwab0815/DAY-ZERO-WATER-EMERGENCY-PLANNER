import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store/useStore'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Simulation } from './pages/Simulation'
import { Alternatives } from './pages/Alternatives'
import { ActionCenter } from './pages/ActionCenter'
import { CrisisIntel } from './pages/CrisisIntel'

// Unique enter/exit variants per page
const PAGE_VARIANTS = {
  dashboard: {
    initial:  { opacity: 0, y: 28, scale: 0.98 },
    animate:  { opacity: 1, y: 0,  scale: 1    },
    exit:     { opacity: 0, y: -14, scale: 0.99 },
  },
  simulation: {
    initial:  { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
    animate:  { opacity: 1, scale: 1,    filter: 'blur(0px)' },
    exit:     { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
  },
  alternatives: {
    initial:  { opacity: 0, x: 40  },
    animate:  { opacity: 1, x: 0   },
    exit:     { opacity: 0, x: -30 },
  },
  actions: {
    initial:  { opacity: 0, x: -40 },
    animate:  { opacity: 1, x: 0   },
    exit:     { opacity: 0, x: 30  },
  },
  intel: {
    initial:  { opacity: 0, rotateX: 6, y: 20 },
    animate:  { opacity: 1, rotateX: 0, y: 0  },
    exit:     { opacity: 0, rotateX: -4, y: -10 },
  },
}

const TRANSITION = { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }

const PAGES = {
  dashboard:    <Dashboard />,
  simulation:   <Simulation />,
  alternatives: <Alternatives />,
  actions:      <ActionCenter />,
  intel:        <CrisisIntel />,
}

function AppContent() {
  const { simulation, activeNav } = useStore()

  if (!simulation) return <Onboarding />

  const variants = PAGE_VARIANTS[activeNav] ?? PAGE_VARIANTS.dashboard

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNav}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={TRANSITION}
          style={{ width: '100%', height: '100%' }}
        >
          {PAGES[activeNav]}
        </motion.div>
      </AnimatePresence>
    </Layout>
  )
}

export default AppContent
