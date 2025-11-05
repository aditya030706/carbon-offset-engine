from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

# --- 1. Schema for MongoDB Document Structure ---
# This mirrors the fields that will be stored for a *single* emission record
# (Note: This assumes your ML *can* generate data in 'tons' format now, 
# which overrides the 'ppm' data from previous steps for the core records.)
class EmissionRecord(BaseModel):
    """The full data structure for a single emission measurement document."""
    mine_id: str = Field(index=True)
    mine_name: str
    date: datetime = Field(default_factory=datetime.utcnow) # Auto-sets timestamp
    co2_tons: float
    ch4_tons: float
    total_carbon_eq: float
    
    model_version: Optional[str] = None
    
    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

# --- 2. Schema for Data Upload/Creation (POST Request Body) ---
class EmissionRecordCreate(BaseModel):
    """Schema for validating data when uploading a new record (e.g., via POST)."""
    mine_id: str
    mine_name: str
    co2_tons: float
    ch4_tons: float
    total_carbon_eq: float
    model_version: Optional[str] = None
    
    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True
        
# --- 3. Schema for Frontend Display (Monthly/Average Summaries) ---
# NOTE: These models are kept to support the CSV ingestion pipeline you built, 
# but they should ideally be adjusted to use 'tons' if the ML output changes.
class MonthlyEmissionsSummary(BaseModel):
    """Schema for monthly average emission data (from CSV ingestion)."""
    id: Optional[str] = Field(None, alias="_id")
    month: str = Field(..., description="Three-letter month abbreviation (e.g., 'Jan').")
    co2_ppm: float
    ch4_ppm: float
    pm2_5: float
    pm10: float
    ingested_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class OverallAveragesSummary(BaseModel):
    """Schema for the single overall average emission record (from CSV ingestion)."""
    id: Optional[str] = Field(None, alias="_id")
    average_emissions_ppm: dict[str, Any] = Field(..., description="Dictionary containing all gas averages.")
    ingested_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True
