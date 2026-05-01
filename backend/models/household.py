from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class MemberType(str, Enum):
    adult = "adult"
    child = "child"
    elderly = "elderly"
    patient = "patient"


class MedicalCondition(str, Enum):
    kidney_disease = "kidney_disease"
    diabetes = "diabetes"
    dialysis = "dialysis"
    pregnancy = "pregnancy"
    heart_condition = "heart_condition"


class HouseholdMember(BaseModel):
    type: MemberType
    count: int = Field(ge=0, le=30)
    medical_conditions: list[MedicalCondition] = []


class StorageType(str, Enum):
    sealed_bottles = "sealed_bottles"
    overhead_tank = "overhead_tank"
    underground_sump = "underground_sump"
    open_drum = "open_drum"
    ro_output = "ro_output"
    clay_pot = "clay_pot"


class StorageUnit(BaseModel):
    type: StorageType
    liters: float = Field(gt=0)
    days_since_filled: int = Field(ge=0, default=0)


class ToiletType(str, Enum):
    flush = "flush"
    pour_flush = "pour_flush"
    dry = "dry"


class BathingHabit(str, Enum):
    shower = "shower"
    bucket = "bucket"
    mixed = "mixed"


class LaundryFrequency(str, Enum):
    daily = "daily"
    thrice_weekly = "thrice_weekly"
    weekly = "weekly"
    rare = "rare"


class WaterSource(str, Enum):
    municipal = "municipal"
    borewell = "borewell"
    tanker = "tanker"
    ro_shop = "ro_shop"
    mixed = "mixed"


class HouseholdProfile(BaseModel):
    id: Optional[str] = None
    city_id: str
    city_name: Optional[str] = None   # for dynamic/unknown cities
    lat: Optional[float] = None       # coordinates for any-city support
    lon: Optional[float] = None
    members: list[HouseholdMember]
    storages: list[StorageUnit]
    toilet_type: ToiletType = ToiletType.flush
    bathing_habit: BathingHabit = BathingHabit.bucket
    laundry_frequency: LaundryFrequency = LaundryFrequency.thrice_weekly
    water_source: WaterSource = WaterSource.municipal
    has_borewell: bool = False
    roof_area_sqm: Optional[float] = None
    has_ro_unit: bool = False

    @property
    def total_members(self) -> int:
        return sum(m.count for m in self.members)

    @property
    def has_vulnerable_members(self) -> bool:
        for m in self.members:
            if m.type in [MemberType.elderly, MemberType.patient]:
                return True
            if m.medical_conditions:
                return True
        return False
