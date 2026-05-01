from models.household import HouseholdProfile, MemberType, ToiletType, BathingHabit


def dehydration_risk(
    daily_drinking_liters: float,
    household: HouseholdProfile,
    temp_celsius: float
) -> float:
    """
    Returns 0.0 (safe) to 1.0 (critical dehydration risk).
    Based on WHO survival minimums, heat-adjusted.
    """
    SURVIVAL_MIN = {
        MemberType.adult: 2.0,
        MemberType.child: 1.0,
        MemberType.elderly: 2.2,
        MemberType.patient: 2.5,
    }
    COMFORT_MIN = {
        MemberType.adult: 3.0,
        MemberType.child: 1.5,
        MemberType.elderly: 2.8,
        MemberType.patient: 3.5,
    }

    heat_mult = 1.0 + max(0, (temp_celsius - 25) / 10 * 0.25)

    weighted_risk = 0.0
    total_members = 0

    for member in household.members:
        if member.count == 0:
            continue
        survival = SURVIVAL_MIN[member.type] * heat_mult
        comfort = COMFORT_MIN[member.type] * heat_mult
        # Per-person drinking allocation (proportional share)
        per_person = daily_drinking_liters / household.total_members if household.total_members > 0 else 0

        if per_person >= comfort:
            risk = 0.0
        elif per_person >= survival:
            risk = ((comfort - per_person) / (comfort - survival)) * 0.4
        else:
            shortfall = survival - per_person
            risk = 0.4 + min(0.6, shortfall / survival * 0.8)

        # Vulnerable multipliers
        vuln_mult = 1.0
        if member.type == MemberType.elderly:
            vuln_mult = 1.3
        elif member.type == MemberType.patient:
            vuln_mult = 1.5
        if member.medical_conditions:
            vuln_mult *= 1.2

        weighted_risk += min(1.0, risk * vuln_mult) * member.count
        total_members += member.count

    return round(min(1.0, weighted_risk / max(1, total_members)), 3)


def hygiene_score(
    daily_handwash_liters: float,
    toilet_mode: str,
    bathing_mode: str,
    days_in_crisis: int,
    n_members: int
) -> float:
    """
    Returns 0–100. Decays progressively as water cuts deepen and crisis duration extends.
    """
    per_person_handwash = daily_handwash_liters / max(1, n_members)
    handwash_score = min(per_person_handwash / 3.0, 1.0) * 30  # max 30 pts

    toilet_scores = {
        "flush": 25,
        "half_flush": 20,
        "pour_flush": 12,
        "pour": 12,
        "dry": 0,
        "none": 0,
    }
    bathing_scores = {
        "shower": 35,
        "bucket": 28,
        "mixed": 32,
        "sponge": 12,
        "none": 0,
    }

    toilet_s = toilet_scores.get(toilet_mode, 15)
    bathing_s = bathing_scores.get(bathing_mode, 20)

    raw = handwash_score + toilet_s + bathing_s  # max 90

    # Progressive decay for sustained crisis
    decay = min(20, days_in_crisis * 1.5)

    return round(max(0.0, raw - decay), 1)


def illness_risk(
    hygiene: float,
    days_below_threshold: int,
    using_questionable_water: bool = False,
    is_summer: bool = False
) -> float:
    """
    Waterborne/hygiene-related illness probability.
    Threshold: hygiene < 60 opens the risk window.
    Incubation: ~3 days.
    """
    if hygiene >= 75:
        base_risk = 0.0
    elif hygiene >= 60:
        base_risk = (75 - hygiene) / 75 * 0.08
    elif hygiene >= 40:
        base_risk = 0.08 + (60 - hygiene) / 60 * 0.25
    else:
        base_risk = 0.33 + (40 - hygiene) / 40 * 0.35

    # Contaminated water source multiplier
    water_mult = 2.5 if using_questionable_water else 1.0

    # Duration amplifier — illness compounds over time
    duration_amp = min(2.0, 1.0 + days_below_threshold / 10.0)

    # Heat amplifies bacterial growth
    heat_amp = 1.3 if is_summer else 1.0

    total = base_risk * water_mult * duration_amp * heat_amp
    return round(min(0.95, total), 3)


def get_crisis_level(storage_pct: float, health_risk: float) -> str:
    if storage_pct > 60 and health_risk < 0.1:
        return "safe"
    elif storage_pct > 40 or health_risk < 0.15:
        return "watch"
    elif storage_pct > 20 or health_risk < 0.35:
        return "warning"
    elif storage_pct > 5 or health_risk < 0.6:
        return "critical"
    else:
        return "zero"
