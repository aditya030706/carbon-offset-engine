from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime

# ----------------------------------------------------
# 1. CORE RECORD SCHEMAS (TONS Data - For /data-upload)
# ----------------------------------------------------

class EmissionRecord(BaseModel):
    """The full data structure for a single emission measurement document."""
    id: Optional[str] = Field(None, alias="_id")
    mine_id: str = Field(..., description="Unique identifier for the mine.")
    mine_name: str
    date: datetime = Field(default_factory=datetime.utcnow)
    co2_tons: float
    ch4_tons: float
    total_carbon_eq: float
    model_version: Optional[str] = None
    
    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class EmissionRecordCreate(BaseModel):
    """Schema for validating data when uploading a new record."""
    mine_id: str
    mine_name: str
    co2_tons: float
    ch4_tons: float
    total_carbon_eq: float
    model_version: Optional[str] = None
    
    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True
        
# ----------------------------------------------------
# 2. SUMMARY SCHEMAS (PPM Data - For CSV Ingestion Pipeline)
# ----------------------------------------------------

class MonthlyEmissionsSummary(BaseModel):
    """Schema for monthly average emission data (from CSV ingestion)."""
    id: Optional[str] = Field(None, alias="_id")
    
    # Mapped Fields
    month: str = Field(..., alias="Month", description="Three-letter month abbreviation.")
    co2_ppm: float = Field(..., alias="CO2_ppm")
    ch4_ppm: float = Field(..., alias="CH4_ppm")
    pm2_5: float = Field(..., alias="PM2_5")
    pm10: float = Field(..., alias="PM10")
    
    ingested_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class OverallAveragesSummary(BaseModel):
    """Schema for the single overall average emission record (from CSV ingestion)."""
    id: Optional[str] = Field(None, alias="_id")
    
    average_emissions_ppm: Dict[str, Any] = Field(..., description="Dictionary containing all gas averages.")
    
    ingested_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

# ----------------------------------------------------
# 3. HOTSPOT SCHEMAS (For Map Visualization)
# ----------------------------------------------------

class HotspotItem(BaseModel):
    """
    Schema for a single mine location on the map.
    All fields are Optional to ensure the API returns data even if some DB fields are missing.
    """
    # Identifiers
    Mine_Name: Optional[str] = "Unknown Mine"
    Hotspot_Level: Optional[str] = "Red"
    Emission_Score: Optional[float] = 0.0
    
    # --- 📍 COORDINATES ---
    Latitude: Optional[float] = None
    Longitude: Optional[float] = None
    
    # Location Details
    District: Optional[str] = "Unknown"
    State: Optional[str] = "Unknown"
    
    # Gas Metrics
    CO2_ppm: Optional[float] = 0.0
    CH4_ppm: Optional[float] = 0.0
    PM2_5: Optional[float] = 0.0
    PM10: Optional[float] = 0.0
    SO2_ppm: Optional[float] = 0.0
    NOx_ppm: Optional[float] = 0.0
    
    # Metadata
    Date: Optional[str] = None
    ingested_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        from_attributes = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}

class HotspotResponse(BaseModel):
    """Wrapper for the list of hotspots."""
    success: bool = True
    count: int
    data: List[HotspotItem]

# ----------------------------------------------------
# 4. MINE OFFSET SCHEMAS (For ML Predictions & Planning)
# ----------------------------------------------------

class TreePlan(BaseModel):
    count: int
    total_cost: float
    asr_per_tree: float
    offset_contribution_tonnes: float

class TreeStrategy(BaseModel):
    teak: TreePlan
    acacia: TreePlan
    pioneer: TreePlan

class KPIMetrics(BaseModel):
    annual_offset_target_tonnes: float
    total_trees_required: int
    estimated_budget_inr: float
    land_required_ha: float
    land_available_ha: float
    land_status: str
    total_offset_achieved: float

class WasteToWealth(BaseModel):
    annual_methane_captured_kg: float
    ethanol_production_litres: float
    water_required_litres: float
    estimated_revenue_inr: float

class CarbonCredits(BaseModel):
    total_offset_credits_tonnes: float
    market_price_per_credit_inr: float
    total_revenue_potential_inr: float

class ScenarioDetail(BaseModel):
    total_trees: int
    total_cost: float
    offset_tonnes: float

class WhatIfScenarios(BaseModel):
    low_budget: ScenarioDetail
    high_efficiency: ScenarioDetail

class GraphDataPoint(BaseModel):
    month_year: str
    emission_index: float

class Graphs(BaseModel):
    monthly_emissions: List[GraphDataPoint]

class MineOffsetResponse(BaseModel):
    """
    The Master Schema that matches the React 'data' state exactly.
    """
    mine_metadata: Dict[str, str]
    kpis: KPIMetrics
    tree_plan: TreeStrategy
    water_conservation: Dict[str, Any]
    waste_to_wealth: WasteToWealth
    carbon_credits: CarbonCredits
    what_if_scenarios: WhatIfScenarios
    graphs: Graphs