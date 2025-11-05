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
# --- FIX APPLIED HERE: MAPPING UPPERCASE DB KEYS TO LOWERCASE SCHEMA FIELDS ---
# ----------------------------------------------------

class MonthlyEmissionsSummary(BaseModel):
    """Schema for monthly average emission data (from CSV ingestion)."""
    id: Optional[str] = Field(None, alias="_id")
    
    # --- Mapped Fields ---
    # The aliases (alias="...") tell Pydantic to look for the uppercase key in the MongoDB document.
    month: str = Field(..., alias="Month", description="Three-letter month abbreviation (e.g., 'Jan').")
    co2_ppm: float = Field(..., alias="CO2_ppm")
    ch4_ppm: float = Field(..., alias="CH4_ppm")
    pm2_5: float = Field(..., alias="PM2_5")
    pm10: float = Field(..., alias="PM10")
    
    ingested_at: Optional[datetime] = None
    
    class Config:
        # This setting is vital for aliases to work when reading the document
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class OverallAveragesSummary(BaseModel):
    """Schema for the single overall average emission record (from CSV ingestion)."""
    id: Optional[str] = Field(None, alias="_id")
    
    # This dictionary field does not need aliases, as its internal structure is flexible
    average_emissions_ppm: Dict[str, Any] = Field(..., description="Dictionary containing all gas averages.")
    
    ingested_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True