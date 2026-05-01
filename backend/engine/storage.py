from models.household import StorageUnit, StorageType

STORAGE_PROFILES = {
    StorageType.sealed_bottles: {
        "daily_evaporation_pct": 0.0,
        "potable_days": 730,
        "utility_days": 730,
        "contamination_risk": "negligible",
    },
    StorageType.overhead_tank: {
        "daily_evaporation_pct": 1.2,
        "potable_days": 4,
        "utility_days": 14,
        "contamination_risk": "algae/bacteria after day 4",
    },
    StorageType.underground_sump: {
        "daily_evaporation_pct": 0.3,
        "potable_days": 6,
        "utility_days": 21,
        "contamination_risk": "bacteria after day 6, sediment",
    },
    StorageType.open_drum: {
        "daily_evaporation_pct": 2.5,
        "potable_days": 2,
        "utility_days": 5,
        "contamination_risk": "mosquito larvae, bacteria within 48h in heat",
    },
    StorageType.ro_output: {
        "daily_evaporation_pct": 0.0,
        "potable_days": 1,
        "utility_days": 2,
        "contamination_risk": "recontamination after 24h",
    },
    StorageType.clay_pot: {
        "daily_evaporation_pct": 3.0,
        "potable_days": 3,
        "utility_days": 3,
        "contamination_risk": "natural cooling but porous, absorbs contaminants",
    },
}


def get_quality(storage_type: StorageType, days_since_filled: int) -> str:
    profile = STORAGE_PROFILES[storage_type]
    if days_since_filled <= profile["potable_days"]:
        return "potable"
    elif days_since_filled <= profile["utility_days"]:
        return "utility_only"
    else:
        return "unsafe"


def days_until_quality_change(storage_type: StorageType, days_since_filled: int) -> int:
    profile = STORAGE_PROFILES[storage_type]
    current_quality = get_quality(storage_type, days_since_filled)
    if current_quality == "potable":
        return profile["potable_days"] - days_since_filled
    elif current_quality == "utility_only":
        return profile["utility_days"] - days_since_filled
    return 0


def effective_potable_liters(storages: list[StorageUnit]) -> float:
    total = 0.0
    for s in storages:
        quality = get_quality(s.type, s.days_since_filled)
        if quality == "potable":
            total += s.liters
    return round(total, 2)


def effective_utility_liters(storages: list[StorageUnit]) -> float:
    total = 0.0
    for s in storages:
        quality = get_quality(s.type, s.days_since_filled)
        if quality in ["potable", "utility_only"]:
            total += s.liters
    return round(total, 2)


def apply_daily_consumption(
    storages: list[StorageUnit],
    consumption: dict,
    day: int
) -> tuple[list[StorageUnit], float]:
    """
    Deduct consumption from storage, prioritizing:
    1. Use utility-only water for toilet/bathing/laundry
    2. Use potable water for drinking/cooking/handwashing
    Returns updated storages and any deficit (if consumption > storage).
    """
    storages = [s.model_copy(update={"days_since_filled": s.days_since_filled + 1}) for s in storages]

    potable_need = consumption["drinking"] + consumption["cooking"] + consumption["handwashing"] + consumption["vessel_washing"]
    utility_need = consumption["toilet"] + consumption["bathing"] + consumption["laundry"] + consumption["other"]

    # Deduct utility-quality or better for utility needs
    utility_remaining = utility_need
    for s in storages:
        if utility_remaining <= 0:
            break
        quality = get_quality(s.type, s.days_since_filled)
        if quality in ["potable", "utility_only"]:
            deduct = min(s.liters, utility_remaining)
            s = s.model_copy(update={"liters": s.liters - deduct})
            utility_remaining -= deduct

    # Deduct potable for drinking needs
    potable_remaining = potable_need
    for s in storages:
        if potable_remaining <= 0:
            break
        quality = get_quality(s.type, s.days_since_filled)
        if quality == "potable":
            deduct = min(s.liters, potable_remaining)
            s = s.model_copy(update={"liters": s.liters - deduct})
            potable_remaining -= deduct

    # If potable deficit, try utility water (risky but last resort)
    if potable_remaining > 0:
        for s in storages:
            if potable_remaining <= 0:
                break
            quality = get_quality(s.type, s.days_since_filled)
            if quality == "utility_only" and s.liters > 0:
                deduct = min(s.liters, potable_remaining)
                s = s.model_copy(update={"liters": s.liters - deduct})
                potable_remaining -= deduct

    deficit = max(0, potable_remaining + utility_remaining)

    # Remove empty / evaporation
    updated = []
    for s in storages:
        profile = STORAGE_PROFILES[s.type]
        evap = s.liters * (profile["daily_evaporation_pct"] / 100.0)
        new_liters = max(0, s.liters - evap)
        updated.append(s.model_copy(update={"liters": new_liters}))

    return updated, deficit
