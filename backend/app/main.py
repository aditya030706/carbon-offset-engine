from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# FIX 1: Use relative import for core.config
from .core.config import settings
# FIX 2: Use correct relative import path for the router module
from .api.router import api_router # Imports the specific api_router object
from .database import init_db 

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
)

# Apply CORS Middleware using settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This asynchronous startup event connects to MongoDB before serving requests
@app.on_event("startup")
async def on_startup(): 
    print("Initializing MongoDB connection...")
    await init_db()

# Include the main API router with a version prefix
app.include_router(api_router, prefix="/api/v1") # FIX 3: Use the imported api_router object

# Basic root endpoint for health check
@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} is running! Visit /docs for the Swagger UI."}