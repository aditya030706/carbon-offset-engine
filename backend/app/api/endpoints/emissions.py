from fastapi import APIRouter, HTTPException, status, File, UploadFile, Depends
from typing import List, Any
import io

# Imports for schemas and CRUD functions relative to your project structure
from ...schemas import (
    EmissionRecord, 
    EmissionRecordCreate, 
    MonthlyEmissionsSummary, 
    OverallAveragesSummary
)
from ..crud import emission_data as crud 
# CORRECTED IMPORT PATH: get_db is defined directly in app/database.py
from ...database import get_db 

emissions_router = APIRouter()

# ----------------------------------------------------
# EXISTING ENDPOINTS (Core Record TONS data) 
# ----------------------------------------------------

# 1. Endpoint to upload ML-generated data (POST - TONS data)
@emissions_router.post(
    "/data-upload", 
    response_model=EmissionRecord, 
    status_code=status.HTTP_201_CREATED
)
async def upload_emission_data(record: EmissionRecordCreate, db: Any = Depends(get_db)):
    """Accepts new single emission data record (in tons) and saves it to MongoDB."""
    try:
        # Note: This calls the CRUD function that uses the raw 'db' client
        new_record = await crud.create_emission_record(db, record)
        return new_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data: {e}")

# 2. Endpoint to fetch the latest data for the main dashboard (GET)
@emissions_router.get("/latest", response_model=List[EmissionRecord])
async def get_latest_emissions(db: Any = Depends(get_db)):
    """Retrieves the 20 most recent emission records across all mines."""
    return await crud.get_latest_emissions(db, limit=20)

# 3. Endpoint to fetch historical data (GET with Path and Query Parameters)
@emissions_router.get("/historical/{mine_id}", response_model=List[EmissionRecord])
async def get_historical_emissions(mine_id: str, days: int = 30, db: Any = Depends(get_db)):
    """Returns historical emission data for a specific mine over a given period (in days)."""
    if not mine_id:
        raise HTTPException(status_code=400, detail="Mine ID is required.")
        
    records = await crud.get_historical_data(db, mine_id=mine_id, days=days)
    
    if not records:
        raise HTTPException(status_code=404, detail=f"No historical data found for mine ID: {mine_id}")
        
    return records

# ----------------------------------------------------
# NEW CSV SUMMARY ENDPOINTS (PPM data)
# ----------------------------------------------------

@emissions_router.get(
    "/monthly/", 
    response_model=List[MonthlyEmissionsSummary],
    summary="Get monthly average emissions data for charts (from CSV pipeline)"
)
async def get_monthly_emissions_summary(db: Any = Depends(get_db)):
    """Retrieves all monthly average emission records (PPM)."""
    data = await crud.get_monthly_emissions_summary(db)
    if not data:
        raise HTTPException(status_code=404, detail="Monthly summary data not found. Run ingestion script.")
    return data

@emissions_router.get(
    "/average/", 
    response_model=OverallAveragesSummary,
    summary="Get overall average emissions (single record) for display (from CSV pipeline)"
)
async def get_overall_average_emissions_summary(db: Any = Depends(get_db)):
    """Retrieves the single record containing overall average emission data (PPM)."""
    data = await crud.get_overall_averages_summary(db)
    if not data:
        raise HTTPException(status_code=404, detail="Overall average data not found. Run ingestion script.")
    return data

@emissions_router.post(
    "/upload/",
    summary="Manually upload a CSV file with monthly emission summaries (PPM)"
)
async def upload_emissions_csv(
    file: UploadFile = File(..., description="CSV file containing monthly emission summaries"),
    db: Any = Depends(get_db)
):
    """
    Receives a CSV file, processes it, and replaces the existing monthly emission data.
    """
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV is supported.")
    
    try:
        contents = await file.read()
        
        # Calls the function that handles CSV processing and database replacement
        result = await crud.handle_csv_upload(contents, db)
        
        return {
            "message": "CSV uploaded and processed successfully.",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Data validation error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {e}")