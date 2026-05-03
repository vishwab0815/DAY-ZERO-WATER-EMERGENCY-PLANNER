from models.household import HouseholdProfile, MemberType, ToiletType, BathingHabit, LaundryFrequency

MEMBER_DRINKING_BASE = {
    MemberType.adult: 3.0,
    MemberType.child: 1.5,
    MemberType.elderly: 2.8,
    MemberType.patient: 3.5,
}

MEDICAL_DRINKING_EXTRA = {
    "kidney_disease": 0.5,
    "dialysis": 1.5,
    "diabetes": 0.5,
    "pregnancy": 0.8,
    "heart_condition": 0.3,
}

TOILET_LITERS = {
    ToiletType.flush: 12.0,
    ToiletType.pour_flush: 3.0,
    ToiletType.dry: 0.0,
}

BATHING_LITERS = {
    BathingHabit.shower: 60.0,
    BathingHabit.bucket: 15.0,
    BathingHabit.mixed: 35.0,
}

LAUNDRY_WEEKLY_LITERS = {
    LaundryFrequency.daily: 280.0,
    LaundryFrequency.thrice_weekly: 120.0,
    LaundryFrequency.weekly: 40.0,
    LaundryFrequency.rare: 10.0,
}

RATIONING_MULTIPLIERS = {
    "none": {
        "drinking": 1.0,
        "cooking": 1.0,
        "toilet": 1.0,
        "bathing": 1.0,
        "handwashing": 1.0,
        "laundry": 1.0,
        "vessels": 1.0,
    },
    "mild": {
        "drinking": 1.0,
        "cooking": 0.8,
        "toilet": 0.5,   # half flush
        "bathing": 0.25, # bucket instead of shower
        "handwashing": 0.8,
        "laundry": 0.3,
        "vessels": 0.7,
    },
    "moderate": {
        "drinking": 1.0,
        "cooking": 0.6,
        "toilet": 0.2,   # pour flush only
        "bathing": 0.1,  # sponge bath
        "handwashing": 0.6,
        "laundry": 0.0,  # cut completely
        "vessels": 0.4,
    },
    "severe": {
        "drinking": 1.0,
        "cooking": 0.4,  # dry cooking / minimal water
        "toilet": 0.0,   # dry toilet
        "bathing": 0.0,  # no bathing
        "handwashing": 0.5,
        "laundry": 0.0,
        "vessels": 0.2,
    },
    "survival": {
        "drinking": 0.9,  # slight reduction, not below floor
        "cooking": 0.25,
        "toilet": 0.0,
        "bathing": 0.0,
        "handwashing": 0.3,
        "laundry": 0.0,
        "vessels": 0.1,
    },
}


def heat_multiplier(temp_celsius: float) -> float:
    if temp_celsius <= 25:
        return 1.0
    elif temp_celsius <= 30:
        return 1.0 + (temp_celsius - 25) * 0.02
    elif temp_celsius <= 35:
        return 1.1 + (temp_celsius - 30) * 0.04
    elif temp_celsius <= 40:
        return 1.3 + (temp_celsius - 35) * 0.06
    elif temp_celsius <= 45:
        return 1.6 + (temp_celsius - 40) * 0.08
    else:
        return 2.0


def calculate_daily_consumption(
    household: HouseholdProfile,
    temp_celsius: float = 28.0,
    rationing_level: str = "none"
) -> dict:
    mult = RATIONING_MULTIPLIERS.get(rationing_level, RATIONING_MULTIPLIERS["none"])
    heat_mult = heat_multiplier(temp_celsius)
    n = household.total_members

    # Per-member drinking
    total_drinking = 0.0
    for member in household.members:
        base = MEMBER_DRINKING_BASE[member.type]
        extra = sum(MEDICAL_DRINKING_EXTRA.get(c.value, 0) for c in member.medical_conditions)
        drinking_per = (base + extra) * heat_mult * mult["drinking"]
        total_drinking += drinking_per * member.count

    # Cooking: base + per person
    cooking_base = 2.0 + (n * 1.5)
    cooking = cooking_base * mult["cooking"]

    # Toilet
    toilet_per_flush = TOILET_LITERS[household.toilet_type]
    flushes_per_person = 4.0
    toilet_total = n * toilet_per_flush * flushes_per_person * mult["toilet"]

    # Bathing
    bathing_per_person = BATHING_LITERS[household.bathing_habit]
    bathing_total = n * bathing_per_person * mult["bathing"]

    # Handwashing: per person, per event (6 events/day average)
    handwash_per_person = 0.5 * 6  # 0.5L per wash event
    handwash_total = n * handwash_per_person * mult["handwashing"]

    # Laundry: weekly total amortized to daily
    laundry_daily = LAUNDRY_WEEKLY_LITERS[household.laundry_frequency] / 7.0
    laundry_total = laundry_daily * mult["laundry"]

    # Vessel washing: per meal × 3 meals
    vessel_per_meal = 2.5 + (n * 0.5)
    vessel_total = vessel_per_meal * 3 * mult["vessels"]

    # Other: floor cleaning, misc (uses dedicated key if present, falls back to vessels)
    other = max(0, 2.0 * mult.get("other", mult.get("vessels", 0.5)))

    total = total_drinking + cooking + toilet_total + bathing_total + handwash_total + laundry_total + vessel_total + other

    return {
        "drinking": round(total_drinking, 2),
        "cooking": round(cooking, 2),
        "toilet": round(toilet_total, 2),
        "bathing": round(bathing_total, 2),
        "handwashing": round(handwash_total, 2),
        "laundry": round(laundry_total, 2),
        "vessel_washing": round(vessel_total, 2),
        "other": round(other, 2),
        "total": round(total, 2),
    }


def get_survival_floor(household: HouseholdProfile, temp_celsius: float) -> float:
    """Minimum potable water needed to survive — not comfortable, survival only."""
    heat_mult = heat_multiplier(temp_celsius)
    total = 0.0
    for member in household.members:
        base = MEMBER_DRINKING_BASE[member.type] * 0.7  # survival floor = 70% of normal
        extra = sum(MEDICAL_DRINKING_EXTRA.get(c.value, 0) for c in member.medical_conditions)
        total += (base + extra) * heat_mult * member.count
    return round(total, 2)
