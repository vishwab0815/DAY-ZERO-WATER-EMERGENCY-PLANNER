import { create } from 'zustand'
import type {
  HouseholdProfile, SimulationResult, DayState, CrisisLevel,
  OnboardingStep, DecisionEvent
} from '../types'

interface AppStore {
  // Onboarding
  onboardingStep: OnboardingStep
  setOnboardingStep: (step: OnboardingStep) => void

  // Household
  household: HouseholdProfile | null
  setHousehold: (h: HouseholdProfile) => void

  // Simulation
  simulation: SimulationResult | null
  setSimulation: (s: SimulationResult) => void
  isSimulating: boolean
  setIsSimulating: (v: boolean) => void

  // Current simulation day (for the timeline scrubber)
  currentDay: number
  setCurrentDay: (d: number) => void
  currentDayState: DayState | null

  // Active decision fork
  activeDecision: DecisionEvent | null
  setActiveDecision: (d: DecisionEvent | null) => void
  decisionHistory: { day: number; choiceId: string }[]
  recordDecision: (day: number, choiceId: string) => void

  // UI
  activeNav: string
  setActiveNav: (n: string) => void
  isPlaying: boolean
  setIsPlaying: (v: boolean) => void
  simulationError: string | null
  setSimulationError: (e: string | null) => void

  // Computed helpers
  crisisLevel: CrisisLevel
  storagePercent: number
  daysRemaining: number
}

export const useStore = create<AppStore>((set, get) => ({
  onboardingStep: 'welcome',
  setOnboardingStep: (step) => set({ onboardingStep: step }),

  household: null,
  setHousehold: (household) => set({ household }),

  simulation: null,
  setSimulation: (simulation) => {
    const day0 = simulation.days[0]
    set({
      simulation,
      currentDay: 0,
      currentDayState: day0,
      crisisLevel: day0?.crisis_level ?? 'safe',
      storagePercent: day0?.storage_pct ?? 100,
      daysRemaining: simulation.days.length,
    })
  },
  isSimulating: false,
  setIsSimulating: (isSimulating) => set({ isSimulating }),

  currentDay: 0,
  setCurrentDay: (day) => {
    const sim = get().simulation
    if (!sim) return
    const dayState = sim.days[day] ?? null
    set({
      currentDay: day,
      currentDayState: dayState,
      crisisLevel: dayState?.crisis_level ?? 'safe',
      storagePercent: dayState?.storage_pct ?? 0,
      daysRemaining: sim.days.length - day,
      activeDecision: dayState?.decision_event ?? null,
    })
  },

  currentDayState: null,

  activeDecision: null,
  setActiveDecision: (activeDecision) => set({ activeDecision }),
  decisionHistory: [],
  recordDecision: (day, choiceId) =>
    set((s) => ({ decisionHistory: [...s.decisionHistory, { day, choiceId }] })),

  activeNav: 'dashboard',
  setActiveNav: (activeNav) => set({ activeNav }),
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  simulationError: null,
  setSimulationError: (simulationError) => set({ simulationError }),

  crisisLevel: 'safe',
  storagePercent: 100,
  daysRemaining: 0,
}))
