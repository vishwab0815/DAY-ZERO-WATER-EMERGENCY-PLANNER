import numpy as np
from models.household import HouseholdProfile, StorageUnit
from .consumption import calculate_daily_consumption


def run_monte_carlo(
    household: HouseholdProfile,
    storages: list[StorageUnit],
    rationing_level: str,
    temp_celsius: float,
    n_sims: int = 300,
) -> dict:
    """
    Vectorized Monte Carlo — analytical closed-form per sim.
    ~100x faster than the loop version.

    Recurrence: s_{d+1} = s_d * (1-evap) - need
    Closed form day-zero: d = ln(need / (s0*evap + need)) / ln(1-evap)
    """
    base = calculate_daily_consumption(household, temp_celsius, rationing_level)
    daily_base = base["total"]
    s0 = sum(s.liters for s in storages)

    if s0 <= 0 or daily_base <= 0:
        return {"p5": 0, "p25": 0, "median": 0, "p75": 0, "p95": 0, "mean": 0, "std": 0}

    rng = np.random.default_rng()
    variances = np.clip(rng.normal(1.0, 0.10, n_sims), 0.7, 1.4)
    needs = daily_base * variances  # (n_sims,)

    evap = 0.012
    r = 1.0 - evap  # 0.988

    # Analytical solution: d = ln(ratio) / ln(r), ratio = need / (s0*evap + need)
    ratio = needs / (s0 * evap + needs)
    # ratio < 1 always → ln(ratio) < 0, ln(r) < 0 → d positive
    days_float = np.log(ratio) / np.log(r)
    days_arr = np.clip(np.ceil(days_float).astype(int), 1, 365)

    return {
        "p5":    round(float(np.percentile(days_arr, 5)), 1),
        "p25":   round(float(np.percentile(days_arr, 25)), 1),
        "median":round(float(np.percentile(days_arr, 50)), 1),
        "p75":   round(float(np.percentile(days_arr, 75)), 1),
        "p95":   round(float(np.percentile(days_arr, 95)), 1),
        "mean":  round(float(np.mean(days_arr.astype(float))), 1),
        "std":   round(float(np.std(days_arr.astype(float))), 1),
    }


def compare_strategies(
    household: HouseholdProfile,
    storages: list[StorageUnit],
    temp_celsius: float,
    n_sims: int = 300,
) -> dict:
    strategies = ["none", "mild", "moderate", "severe", "survival"]
    return {s: run_monte_carlo(household, storages, s, temp_celsius, n_sims) for s in strategies}
