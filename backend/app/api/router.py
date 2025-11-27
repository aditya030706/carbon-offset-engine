import sys
import os
from fastapi import APIRouter

# --- CRITICAL ENVIRONMENT FIX START ---
# 1. Manually add the project root to sys.path to guarantee absolute imports work.
# This prevents ModuleNotFoundError when running via uvicorn.
# Assumes this file is at 'backend/app/api/router.py'
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # The project root (the directory containing the 'app' folder) is two levels up
    project_root = os.path.dirname(os.path.dirname(current_dir))
    if project_root not in sys.path:
        sys.path.append(project_root)
except Exception as e:
    print(f"Path setting failed during import: {e}")
# --- CRITICAL ENVIRONMENT FIX END ---


# Import the emissions router
# This absolute path (app.api...) should now work consistently.
from app.api.endpoints.emissions import emissions_router 

# Import the hotspots router
from app.api.endpoints.hotspots import hotspots_router 

# Initialize the main API router that all sub-routers plug into
api_router = APIRouter()

# Register the emissions router
# Endpoints will be accessible at /api/v1/emissions/...
api_router.include_router(emissions_router, tags=["Emissions"], prefix="/emissions")

# Register the hotspots router
# Endpoints will be accessible at /api/v1/hotspots/...
api_router.include_router(hotspots_router, tags=["Hotspots"], prefix="/hotspots")