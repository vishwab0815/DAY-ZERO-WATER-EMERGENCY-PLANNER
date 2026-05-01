from datetime import date, timedelta
from models.household import HouseholdProfile, StorageUnit
from models.simulation import (
    DayState, ConsumptionBreakdown, StorageSnapshot,
    HealthMetrics, DecisionEvent, DecisionOption, RationingLevel, MonteCarloResult
)
from .consumption import calculate_daily_consumption, get_survival_floor
from .storage import (
    get_quality, days_until_quality_change,
    effective_potable_liters, effective_utility_liters,
    apply_daily_consumption, STORAGE_PROFILES
)
from .health import dehydration_risk, hygiene_score, illness_risk, get_crisis_level
from .monte_carlo import run_monte_carlo, compare_strategies

DECISION_THRESHOLDS = [75, 50, 30, 15, 5]

# Recompute Monte Carlo every N days (cached between)
_MC_CACHE_INTERVAL = 3


def build_decision_event(
    threshold_pct: float,
    day: int,
    current_strategy: str,
    days_remaining_scenarios: dict,
    city_data: dict,
    crisis_day: int,
) -> DecisionEvent:
    from .alternatives import crisis_price_multiplier
    price_mult = crisis_price_multiplier(crisis_day)
    tanker_price = round(city_data.get("tanker_base_price_per_1000L", 600) * price_mult)

    if threshold_pct <= 15:
        urgency = "critical"
        msg = f"⚠ CRITICAL: Storage at {threshold_pct:.0f}%. Immediate action required."
    elif threshold_pct <= 30:
        urgency = "warning"
        msg = f"Storage at {threshold_pct:.0f}%. Begin rationing now."
    else:
        urgency = "info"
        msg = f"Storage at {threshold_pct:.0f}%. Consider your options."

    def projected_days(strategy: str) -> float:
        return days_remaining_scenarios.get(strategy, {}).get("median", 0)

    options = [
        DecisionOption(
            id="continue",
            label="Continue as normal",
            description="Keep current usage. No lifestyle change.",
            icon="arrow-right",
            projected_days_remaining=projected_days("none"),
            health_impact=0.0,
            hygiene_impact=0.0,
            cost_inr=0.0,
            rationing_level=RationingLevel.none,
            reversible=True,
        ),
        DecisionOption(
            id="mild_ration",
            label="Start mild rationing",
            description="Cut laundry. Bucket bath. Half-flush toilet.",
            icon="droplets",
            projected_days_remaining=projected_days("mild"),
            health_impact=-5.0,
            hygiene_impact=-8.0,
            cost_inr=0.0,
            rationing_level=RationingLevel.mild,
            reversible=True,
        ),
        DecisionOption(
            id="moderate_ration",
            label="Moderate rationing",
            description="Sponge baths. Pour flush. No laundry. Dry cooking mode.",
            icon="alert-triangle",
            projected_days_remaining=projected_days("moderate"),
            health_impact=-18.0,
            hygiene_impact=-25.0,
            cost_inr=0.0,
            rationing_level=RationingLevel.moderate,
            reversible=True,
        ),
        DecisionOption(
            id="severe_ration",
            label="Severe rationing",
            description="Survival mode. Drinking + minimal cooking only.",
            icon="alert-octagon",
            projected_days_remaining=projected_days("severe"),
            health_impact=-35.0,
            hygiene_impact=-55.0,
            cost_inr=0.0,
            rationing_level=RationingLevel.severe,
            reversible=True,
        ),
        DecisionOption(
            id="buy_tanker",
            label=f"Buy water tanker (₹{tanker_price:,})",
            description=f"Order 1000L tanker. Prices {price_mult:.1f}x baseline in current crisis.",
            icon="truck",
            projected_days_remaining=projected_days(current_strategy) + 8,
            health_impact=0.0,
            hygiene_impact=0.0,
            cost_inr=tanker_price,
            rationing_level=RationingLevel.none,
            reversible=True,
        ),
    ]

    return DecisionEvent(
        triggered=True,
        threshold_pct=threshold_pct,
        day=day,
        message=msg,
        urgency=urgency,
        options=options,
    )


class WaterSimulator:
    def __init__(
        self,
        household: HouseholdProfile,
        storages: list[StorageUnit],
        city_data: dict,
        temperature_override: float | None = None,
    ):
        self.household = household
        self.initial_storages = storages
        self.city_data = city_data
        self.temperature_override = temperature_override

    def _get_temp(self, day: int) -> float:
        if self.temperature_override:
            return self.temperature_override
        month_idx = (date.today() + timedelta(days=day)).month - 1
        temps = self.city_data.get("monthly_temp", [30] * 12)
        return float(temps[month_idx])

    def run(
        self,
        days: int = 30,
        rationing_level: str = "none",
        start_date: date | None = None,
    ) -> list[DayState]:
        if start_date is None:
            start_date = date.today()

        current_storages = [s.model_copy() for s in self.initial_storages]
        total_initial = sum(s.liters for s in self.initial_storages)
        triggered_thresholds = set()

        day_states: list[DayState] = []
        days_below_hygiene_threshold = 0
        current_hygiene = 100.0
        cumulative_illness = 0.0   # tracks compounding illness risk

        # Cache Monte Carlo results — recomputed every _MC_CACHE_INTERVAL days
        cached_mc: dict | None = None
        cached_scenarios: dict | None = None
        last_mc_day = -999

        for day in range(days):
            temp = self._get_temp(day)
            current_date = (start_date + timedelta(days=day)).isoformat()

            consumption_dict = calculate_daily_consumption(self.household, temp, rationing_level)

            toilet_modes = {
                "none": "flush", "mild": "half_flush",
                "moderate": "pour_flush", "severe": "dry", "survival": "dry",
            }
            bathing_modes = {
                "none": self.household.bathing_habit.value,
                "mild": "bucket", "moderate": "sponge",
                "severe": "none", "survival": "none",
            }
            toilet_mode = toilet_modes.get(rationing_level, "flush")
            bathing_mode = bathing_modes.get(rationing_level, "bucket")

            current_storages, deficit = apply_daily_consumption(current_storages, consumption_dict, day)

            total_liters = sum(s.liters for s in current_storages)
            potable = effective_potable_liters(current_storages)
            utility = effective_utility_liters(current_storages)
            storage_pct = (total_liters / total_initial * 100) if total_initial > 0 else 0

            # Health metrics — with cumulative illness compounding
            survival_floor = get_survival_floor(self.household, temp)
            dehyd_risk = dehydration_risk(consumption_dict["drinking"], self.household, temp)

            current_hygiene = hygiene_score(
                consumption_dict["handwashing"],
                toilet_mode,
                bathing_mode,
                day,
                self.household.total_members,
            )
            if current_hygiene < 60:
                days_below_hygiene_threshold += 1
            else:
                days_below_hygiene_threshold = max(0, days_below_hygiene_threshold - 1)

            is_summer = temp > 33
            base_ill_risk = illness_risk(current_hygiene, days_below_hygiene_threshold, False, is_summer)

            # Cumulative illness: once sick, risk compounds (slow recovery)
            cumulative_illness = cumulative_illness * 0.90 + base_ill_risk * 0.10
            ill_risk = min(1.0, max(base_ill_risk, cumulative_illness))

            crisis_lvl = get_crisis_level(storage_pct, max(dehyd_risk, ill_risk))

            # Monte Carlo: recompute only every N days
            if cached_mc is None or (day - last_mc_day) >= _MC_CACHE_INTERVAL:
                cached_mc = run_monte_carlo(self.household, current_storages, rationing_level, temp, n_sims=300)
                cached_scenarios = {
                    strat: run_monte_carlo(self.household, current_storages, strat, temp, n_sims=150)
                    for strat in ["none", "mild", "moderate", "severe"]
                }
                last_mc_day = day

            mc_result = cached_mc
            scenarios = cached_scenarios

            # Decision events at thresholds
            decision_event = None
            for threshold in DECISION_THRESHOLDS:
                if storage_pct <= threshold and threshold not in triggered_thresholds:
                    triggered_thresholds.add(threshold)
                    decision_event = build_decision_event(
                        threshold_pct=float(threshold),
                        day=day,
                        current_strategy=rationing_level,
                        days_remaining_scenarios=scenarios,
                        city_data=self.city_data,
                        crisis_day=day,
                    )
                    break

            containers = []
            for s in current_storages:
                quality = get_quality(s.type, s.days_since_filled)
                dtc = days_until_quality_change(s.type, s.days_since_filled)
                containers.append(StorageSnapshot(
                    type=s.type.value,
                    liters_remaining=round(s.liters, 1),
                    quality=quality,
                    days_until_unsafe=dtc,
                ))

            state = DayState(
                day=day,
                date=current_date,
                storage_total_liters=round(total_liters, 1),
                storage_potable_liters=round(potable, 1),
                storage_utility_liters=round(utility, 1),
                storage_pct=round(storage_pct, 1),
                containers=containers,
                consumption=ConsumptionBreakdown(**consumption_dict),
                temperature_celsius=temp,
                health=HealthMetrics(
                    dehydration_risk=dehyd_risk,
                    illness_risk=ill_risk,
                    hygiene_score=current_hygiene,
                    survival_floor_liters=survival_floor,
                ),
                decision_event=decision_event,
                days_remaining_scenarios={k: v for k, v in scenarios.items()},
                monte_carlo=MonteCarloResult(**mc_result),
                rationing_level=RationingLevel(rationing_level),
                crisis_level=crisis_lvl,
            )

            day_states.append(state)

            if total_liters <= 0:
                break

        return day_states
