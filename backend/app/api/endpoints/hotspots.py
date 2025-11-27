from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
# Schema import is good to keep, even if not strictly enforcing response_model
from app.schemas import HotspotResponse 

hotspots_router = APIRouter()

@hotspots_router.get("/test")
async def test_connection(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Simple test to check MongoDB connection"""
    try:
        count = await db.emission_hotspots.count_documents({})
        return {"success": True, "message": f"Found {count} hotspots in database"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- ✅ 2. TOP HOTSPOTS ENDPOINT (Validation Removed) ---
@hotspots_router.get("/top")
async def get_top_hotspots(
    # FIX: Removed 'Query(le=1000)'. Now it's just a plain int. 
    # FastAPI will accept ANY number, so 422 is impossible here.
    limit: int = 1000, 
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get top N hotspots with highest emission scores"""
    try:
        # We purposefully exclude _id to keep the response clean
        cursor = db.emission_hotspots.find({}, {"_id": 0}).sort("Emission_Score", -1).limit(limit)
        hotspots = await cursor.to_list(length=limit)
        
        # --- DEBUGGING STEP ---
        # If you see this print in your terminal, the endpoint is working!
        if hotspots and ("Latitude" not in hotspots[0]):
            print("⚠️ WARNING: The first hotspot retrieved has NO Latitude/Longitude field!")
        
        return {"success": True, "count": len(hotspots), "data": hotspots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. GET ALL HOTSPOTS (Paginated) ---
@hotspots_router.get("")
async def get_hotspots(
    level: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    # Increased limit safety here as well
    limit: int = 1000,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    try:
        filter_query = {}
        if level: filter_query["Hotspot_Level"] = level
        if state: filter_query["State"] = state
        if district: filter_query["District"] = district
        
        skip = (page - 1) * limit
        total = await db.emission_hotspots.count_documents(filter_query)
        
        cursor = db.emission_hotspots.find(filter_query, {"_id": 0}).skip(skip).limit(limit)
        hotspots = await cursor.to_list(length=limit)
        
        return {
            "success": True,
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 0,
            "count": len(hotspots),
            "data": hotspots
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. STATISTICS ENDPOINT ---
@hotspots_router.get("/stats")
async def get_hotspot_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        pipeline = [
            {"$group": {
                "_id": "$Hotspot_Level",
                "count": {"$sum": 1},
                "avgScore": {"$avg": "$Emission_Score"},
                "maxScore": {"$max": "$Emission_Score"},
                "minScore": {"$min": "$Emission_Score"}
            }}
        ]
        cursor = db.emission_hotspots.aggregate(pipeline)
        stats = await cursor.to_list(length=None)
        formatted_stats = {"Red": {}, "Orange": {}, "Yellow": {}, "total": 0}
        for stat in stats:
            level = stat["_id"]
            if level:
                formatted_stats[level] = {
                    "count": stat["count"],
                    "avgScore": round(stat["avgScore"], 2),
                    "maxScore": round(stat["maxScore"], 2),
                    "minScore": round(stat["minScore"], 2)
                }
                formatted_stats["total"] += stat["count"]
        return {"success": True, "stats": formatted_stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@hotspots_router.get("/by-state")
async def get_hotspots_by_state(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        pipeline = [
            {"$group": {"_id": {"state": "$State", "level": "$Hotspot_Level"}, "count": {"$sum": 1}}},
            {"$group": {"_id": "$_id.state", "levels": {"$push": {"level": "$_id.level", "count": "$count"}}, "total": {"$sum": "$count"}}},
            {"$sort": {"total": -1}}
        ]
        cursor = db.emission_hotspots.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@hotspots_router.get("/geo")
async def get_hotspots_geo(
    min_lat: Optional[float] = Query(None), max_lat: Optional[float] = Query(None),
    min_lng: Optional[float] = Query(None), max_lng: Optional[float] = Query(None),
    limit: int = 1000, 
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    try:
        filter_query = {}
        if all([min_lat is not None, max_lat is not None, min_lng is not None, max_lng is not None]):
            filter_query["Latitude"] = {"$gte": min_lat, "$lte": max_lat}
            filter_query["Longitude"] = {"$gte": min_lng, "$lte": max_lng}
        cursor = db.emission_hotspots.find(filter_query, {"_id": 0}).limit(limit)
        hotspots = await cursor.to_list(length=limit)
        return {"success": True, "count": len(hotspots), "limit": limit, "data": hotspots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))