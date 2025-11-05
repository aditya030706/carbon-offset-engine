from fastapi import APIRouter
# This import must use the absolute path from the project root (app)
# to resolve package issues when Uvicorn runs.
from app.api.endpoints.emissions import emissions_router 

# The object name is changed to api_router here to match the object name 
# exported by this file and expected by main.py.
api_router = APIRouter()

# Include the emissions router under the /emissions path. 
# This means your endpoints will be available at /api/v1/emissions/...
api_router.include_router(emissions_router, tags=["Emissions"], prefix="/emissions")