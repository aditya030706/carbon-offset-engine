import pandas as pd
from io import StringIO
from datetime import datetime, timedelta
from typing import List, Dict, Any

from motor.motor_asyncio import AsyncIOMotorDatabase 
from bson.objectid import ObjectId # Needed for ObjectId conversion

# Import schemas for typing and model definition
from app.schemas import EmissionRecord, EmissionRecordCreate

# --- CONFIGURATION ---
CORE_COLLECTION_NAME = 'emission_records' 
MONTHLY_COLLECTION_NAME = 'monthly_emissions'   
AVERAGE_COLLECTION_NAME = 'overall_averages'    

# --- CORE HELPER FUNCTION ---
def doc_helper(doc: dict) -> dict:
    """Converts MongoDB BSON document (including ObjectId) to a JSON-safe dictionary."""
    if doc:
        # Convert ObjectId to string for JSON serialization
        if '_id' in doc:
            doc["_id"] = str(doc["_id"])
    return doc

# --------------------------
# A. CORE RECORD CRUD (TONS Data)
# --------------------------

async def create_emission_record(db: AsyncIOMotorDatabase, record: EmissionRecordCreate) -> Dict[str, Any]:
    """Inserts a single new emission record (TONS) into the core collection."""
    record_dict = record.model_dump()
    if 'date' not in record_dict:
         record_dict['date'] = datetime.utcnow()
         
    result = await db[CORE_COLLECTION_NAME].insert_one(record_dict)
    
    # Retrieve and return the newly created document
    new_doc = await db[CORE_COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return doc_helper(new_doc)

async def get_latest_emissions(db: AsyncIOMotorDatabase, limit: int) -> List[Dict[str, Any]]:
    """Retrieves the most recent records, sorted by date."""
    cursor = db[CORE_COLLECTION_NAME].find().sort("date", -1).limit(limit)
    documents = await cursor.to_list(length=limit)
    return [doc_helper(doc) for doc in documents]

async def get_historical_data(db: AsyncIOMotorDatabase, mine_id: str, days: int) -> List[Dict[str, Any]]:
    """Retrieves data for a mine within a specific date range."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = {"mine_id": mine_id, "date": {"$gte": start_date}}
    
    cursor = db[CORE_COLLECTION_NAME].find(query).sort("date", 1)
    documents = await cursor.to_list(length=None)
    return [doc_helper(doc) for doc in documents]

# --------------------------
# B. SUMMARY CRUD (PPM Data - New CSV Pipeline)
# --------------------------

async def get_monthly_emissions_summary(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """Retrieves all monthly summary records (PPM)."""
    cursor = db[MONTHLY_COLLECTION_NAME].find().sort("month", 1) 
    documents = await cursor.to_list(length=None)
    return [doc_helper(doc) for doc in documents]

async def get_overall_averages_summary(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Retrieves the single overall average record (PPM)."""
    
    # --- CRUCIAL FIX HERE ---
    document = await db[AVERAGE_COLLECTION_NAME].find_one()
    
    # If the document is found, apply doc_helper to convert ObjectId
    # If the document is None (collection empty), return an empty dict {} 
    # so Pydantic fails gracefully with a 404/empty response instead of 500 crash.
    if document:
        return doc_helper(document)
    
    return {}
    # --- END CRUCIAL FIX ---


async def handle_csv_upload(file_stream: bytes, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Processes an uploaded CSV stream, validates, and replaces monthly data."""
    
    csv_data = StringIO(file_stream.decode('utf-8'))
    df = pd.read_csv(csv_data)
    
    # Validation (Check for required columns)
    required_cols = ['Month', 'CO2_ppm', 'CH4_ppm', 'PM2_5', 'PM10']
    if not all(col in df.columns for col in required_cols):
        raise ValueError(f"Uploaded CSV is missing required columns: {required_cols}")

    # Prepare data for MongoDB
    records_to_insert = df.to_dict(orient='records')
    ingestion_time = datetime.utcnow()
    
    for record in records_to_insert:
        record['ingested_at'] = ingestion_time
        # Clean up Pandas NaN values for BSON insertion
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
        
    # Insertion Strategy: Clear and Insert (Asynchronously)
    await db[MONTHLY_COLLECTION_NAME].delete_many({}) 
    result = await db[MONTHLY_COLLECTION_NAME].insert_many(records_to_insert)
    
    return {
        "status": "success",
        "inserted_count": len(result.inserted_ids),
        "collection": MONTHLY_COLLECTION_NAME,
        "timestamp": ingestion_time.isoformat()
    }