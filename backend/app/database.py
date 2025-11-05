from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import AsyncGenerator
from .core.config import settings
from .schemas import EmissionRecord # Still needed for model typing (Pydantic)

# Global variables to hold the client and database instance
client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

async def init_db():
    """
    Initializes the MongoDB connection using the asynchronous Motor client.
    This is called when the FastAPI app starts up.
    """
    global client, database
    try:
        # 1. Create asynchronous client
        client = AsyncIOMotorClient(settings.MONGO_URI)
        
        # 2. Extract database name from the URI
        # This safely handles connection strings like the Atlas SRV format
        db_name = settings.MONGO_URI.split('/')[-1].split('?')[0] 
        database = client[db_name]
        
        # Optional: Ping the database to confirm connection is live
        await database.command('ping') 
        
        print("✅ MongoDB connection successful (Pure Motor).")

    except Exception as e:
        print(f"❌ Error connecting to MongoDB. Please ensure your local server is running: {e}")
        # NOTE: We keep the app running even on failure, but the get_db dependency 
        # will handle the failure downstream.

async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    FastAPI Dependency: Yields the database client object for endpoints.
    This replaces the need for Beanie access in the endpoints.
    """
    if database is None:
        # If database failed to initialize during startup, raise HTTP 500 error
        # This handles cases where the app starts but the DB is offline.
        raise ConnectionError("Database connection is not initialized or failed to connect.")
    
    yield database