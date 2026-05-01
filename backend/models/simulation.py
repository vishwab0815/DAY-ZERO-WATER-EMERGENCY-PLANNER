from pydantic import BaseModel
from typing import Optional
from enum import Enum


class RationingLevel(str, Enum):
    none = "none"
    mild = "mild"
    moderate = "moderate"
    severe = "severe"
    survival = "survival"


class DecisionOption(BaseModel):
    id: str
    label: str
    description: str
    icon: str
    projected_days_remaining: float
    health_impact: float       # -100 to 0
    hygiene_impact: float      # -100 to 0
    cost_inr: float
    rationing_level: RationingLevel
    reversible: bool = True


class DecisionEvent(BaseModel):
    triggered: bool
    threshold_pct: float
    day: int
    message: str
    urgency: str  # "info" | "warning" | "critical"
    options: list[DecisionOption] = []


class ConsumptionBreakdown(BaseModel):
    drinking: float
    cooking: float
    toilet: float
    bathing: float
    handwashing: float
    laundry: float
    vessel_washing: float
    other: float
    total: float


class StorageSnapshot(BaseModel):
    type: str
    liters_remaining: float
    quality: str  # "potable" | "utility_only" | "unsafe"
    days_until_unsafe: int


class HealthMetrics(BaseModel):
    dehydration_risk: float    # 0.0 – 1.0
    illness_risk: float        # 0.0 – 1.0
    hygiene_score: float       # 0 – 100
    survival_floor_liters: float  # minimum potable needed today


class MonteCarloResult(BaseModel):
    p5: float
    p25: float
    median: float
    p75: float
    p95: float
    mean: float
    std: float


class DayState(BaseModel):
    day: int
    date: Optional[str] = None
    storage_total_liters: float
    storage_potable_liters: float
    storage_utility_liters: float
    storage_pct: float
    containers: list[StorageSnapshot]
    consumption: ConsumptionBreakdown
    temperature_celsius: float
    health: HealthMetrics
    decision_event: Optional[DecisionEvent] = None
    days_remaining_scenarios: dict
    monte_carlo: Optional[MonteCarloResult] = None
    rationing_level: RationingLevel
    crisis_level: str  # "safe" | "watch" | "warning" | "critical" | "zero"


class SimulationRequest(BaseModel):
    household_id: str
    days: int = 30
    strategy: RationingLevel = RationingLevel.none
    pre_decisions: dict = {}


class SimulationResult(BaseModel):
    household_id: str
    total_days_simulated: int
    day_zero_reached: bool
    day_zero_on_day: Optional[int]
    days: list[DayState]
    preparedness_score: float
    summary: dict
