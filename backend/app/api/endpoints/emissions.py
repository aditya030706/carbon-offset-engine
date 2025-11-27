from fastapi import APIRouter, HTTPException, status, File, UploadFile, Depends, Query
from typing import List, Any
import os
import sys
import importlib.util

# Standard Imports
from app.schemas import (
    EmissionRecord, 
    EmissionRecordCreate, 
    MonthlyEmissionsSummary, 
    OverallAveragesSummary,
    MineOffsetResponse
)
from app.api.crud import emission_data as crud 
from app.database import get_db 

# -------------------------------------------------------------------------
# ROBUST PREDICTOR LOADER (Bypasses "ModuleNotFoundError")
# -------------------------------------------------------------------------
# This block manually finds 'predictor.py' relative to this file and loads it.
# It ignores whether 'app.ml_service' is recognized as a package or not.

predictor = None

try:
    # 1. Get the path to the current file (emissions.py)
    current_file_path = os.path.abspath(__file__)
    
    # 2. Navigate up 4 levels to find the 'backend' folder (project root)
    # From: app/api/endpoints/emissions.py -> app/api/endpoints -> app/api -> app -> backend
    # We need to go to 'backend' because 'ml_service' is a sibling of 'app', not inside it.
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file_path))))
    
    # 3. Construct the path to predictor.py
    # Path becomes: .../backend/ml_service/predictor.py
    predictor_path = os.path.join(backend_root, "ml_service", "predictor.py")
    
    if os.path.exists(predictor_path):
        # 4. Manually load the file
        spec = importlib.util.spec_from_file_location("dynamic_predictor", predictor_path)
        predictor_module = importlib.util.module_from_spec(spec)
        sys.modules["dynamic_predictor"] = predictor_module
        spec.loader.exec_module(predictor_module)
        
        # 5. Get the predictor object
        predictor = predictor_module.predictor
        print(f"SUCCESS: Loaded predictor manually from {predictor_path}")
    else:
        print(f"ERROR: Predictor file not found at {predictor_path}")

except Exception as e:
    print(f"CRITICAL ERROR loading predictor: {e}")

# 6. Safety Net: If loading failed, use a dummy to prevent server crash
if predictor is None:
    class DummyPredictor:
        def predict(self, name):
            raise HTTPException(status_code=500, detail="ML Predictor failed to load on server startup.")
    predictor = DummyPredictor()

# -------------------------------------------------------------------------

emissions_router = APIRouter()

# ----------------------------------------------------
# EXISTING ENDPOINTS
# ----------------------------------------------------

@emissions_router.post("/data-upload", response_model=EmissionRecord, status_code=status.HTTP_201_CREATED)
async def upload_emission_data(record: EmissionRecordCreate, db: Any = Depends(get_db)):
    try:
        new_record = await crud.create_emission_record(db, record)
        return new_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data: {e}")

@emissions_router.get("/latest", response_model=List[EmissionRecord])
async def get_latest_emissions(db: Any = Depends(get_db)):
    return await crud.get_latest_emissions(db, limit=20)

@emissions_router.get("/historical/{mine_id}", response_model=List[EmissionRecord])
async def get_historical_emissions(mine_id: str, days: int = 30, db: Any = Depends(get_db)):
    if not mine_id:
        raise HTTPException(status_code=400, detail="Mine ID is required.")
    records = await crud.get_historical_data(db, mine_id=mine_id, days=days)
    if not records:
        raise HTTPException(status_code=404, detail=f"No historical data found for mine ID: {mine_id}")
    return records

@emissions_router.get("/monthly/", response_model=List[MonthlyEmissionsSummary])
async def get_monthly_emissions_summary(db: Any = Depends(get_db)):
    data = await crud.get_monthly_emissions_summary(db)
    if not data:
        raise HTTPException(status_code=404, detail="Monthly summary data not found.")
    return data

@emissions_router.get("/average/", response_model=OverallAveragesSummary)
async def get_overall_average_emissions_summary(db: Any = Depends(get_db)):
    data = await crud.get_overall_averages_summary(db)
    if not data:
        raise HTTPException(status_code=404, detail="Overall average data not found.")
    return data

@emissions_router.post("/upload/")
async def upload_emissions_csv(file: UploadFile = File(...), db: Any = Depends(get_db)):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file type.")
    try:
        contents = await file.read()
        result = await crud.handle_csv_upload(contents, db)
        return {"message": "CSV uploaded successfully.", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Validation error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {e}")

# ----------------------------------------------------
# 4. ML OFFSET PREDICTION ENDPOINT
# ----------------------------------------------------

@emissions_router.get("/mine-offsets", response_model=MineOffsetResponse)
async def get_mine_offsets_prediction(name: str = Query(..., description="Name of the mine")):
    try:
        # Calls the manually loaded predictor
        result = predictor.predict(name)
        return result
    except Exception as e:
        print(f"Prediction Runtime Error: {e}")
        raise HTTPException(status_code=500, detail=f"ML Model Error: {str(e)}")