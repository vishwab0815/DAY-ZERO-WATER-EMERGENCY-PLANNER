export type MemberType = 'adult' | 'child' | 'elderly' | 'patient'
export type StorageType = 'sealed_bottles' | 'overhead_tank' | 'underground_sump' | 'open_drum' | 'ro_output' | 'clay_pot'
export type ToiletType = 'flush' | 'pour_flush' | 'dry'
export type BathingHabit = 'shower' | 'bucket' | 'mixed'
export type LaundryFrequency = 'daily' | 'thrice_weekly' | 'weekly' | 'rare'
export type WaterSource = 'municipal' | 'borewell' | 'tanker' | 'ro_shop' | 'mixed'
export type RationingLevel = 'none' | 'mild' | 'moderate' | 'severe' | 'survival'
export type CrisisLevel = 'safe' | 'watch' | 'warning' | 'critical' | 'zero'
export type QualityLevel = 'potable' | 'utility_only' | 'unsafe'

export interface HouseholdMember {
  type: MemberType
  count: number
  medical_conditions: string[]
}

export interface StorageUnit {
  type: StorageType
  liters: number
  days_since_filled: number
}

export interface HouseholdProfile {
  id?: string
  city_id: string
  city_name?: string
  lat?: number
  lon?: number
  members: HouseholdMember[]
  storages: StorageUnit[]
  toilet_type: ToiletType
  bathing_habit: BathingHabit
  laundry_frequency: LaundryFrequency
  water_source: WaterSource
  has_borewell: boolean
  roof_area_sqm?: number
  has_ro_unit: boolean
}

export interface GeocodeResult {
  name: string
  state: string
  country: string
  lat: number
  lon: number
  population: number
}

export interface ConsumptionBreakdown {
  drinking: number
  cooking: number
  toilet: number
  bathing: number
  handwashing: number
  laundry: number
  vessel_washing: number
  other: number
  total: number
}

export interface StorageSnapshot {
  type: string
  liters_remaining: number
  quality: QualityLevel
  days_until_unsafe: number
}

export interface HealthMetrics {
  dehydration_risk: number
  illness_risk: number
  hygiene_score: number
  survival_floor_liters: number
}

export interface DecisionOption {
  id: string
  label: string
  description: string
  icon: string
  projected_days_remaining: number
  health_impact: number
  hygiene_impact: number
  cost_inr: number
  rationing_level: RationingLevel
  reversible: boolean
}

export interface DecisionEvent {
  triggered: boolean
  threshold_pct: number
  day: number
  message: string
  urgency: 'info' | 'warning' | 'critical'
  options: DecisionOption[]
}

export interface MonteCarloResult {
  p5: number
  p25: number
  median: number
  p75: number
  p95: number
  mean: number
  std: number
}

export interface DayState {
  day: number
  date: string
  storage_total_liters: number
  storage_potable_liters: number
  storage_utility_liters: number
  storage_pct: number
  containers: StorageSnapshot[]
  consumption: ConsumptionBreakdown
  temperature_celsius: number
  health: HealthMetrics
  decision_event?: DecisionEvent
  days_remaining_scenarios: Record<string, MonteCarloResult>
  monte_carlo?: MonteCarloResult
  rationing_level: RationingLevel
  crisis_level: CrisisLevel
}

export interface SimulationResult {
  household_id: string
  days: DayState[]
  strategy_comparison: Record<string, { days_until_zero: number; median_estimate: number }>
  preparedness_score: number
  daily_consumption: number
  total_storage: number
  survival_floor: number
  alternatives: Alternative[]
  city: CityData
  live_temp?: number
  forecast_7d?: number[]
}

export interface Alternative {
  id: string
  type: string
  title: string
  icon: string
  available: boolean
  cost_inr: number
  liters: number
  cost_per_liter: number
  quality: string
  potable: boolean
  delivery_hours?: number
  notes: string
  crisis_price_warning: boolean
  quality_risk?: string
  roof_area_sqm?: number
  latency_days?: number
}

export interface CityData {
  id: string
  name: string
  state: string
  monthly_temp: number[]
  monthly_rainfall_mm: number[]
  crisis_risk: string
  tanker_base_price_per_1000L: number
  ro_shop_price_per_20L: number
  notes: string
}

export interface Crisis {
  id: string
  city: string
  country: string
  year: number
  title: string
  population_affected: number
  duration_days: number
  peak_severity: string
  reservoir_level_at_onset_pct: number
  timeline: { day: number; event: string }[]
  what_worked: string[]
  what_failed: string[]
  survival_strategies: {
    liters_per_day_target: number
    priority_order: string[]
    key_insight: string
  }
}

export type OnboardingStep = 'welcome' | 'members' | 'storage' | 'location' | 'source' | 'habits' | 'calculating'
