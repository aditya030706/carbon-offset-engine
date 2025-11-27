import pandas as pd
from pymongo import MongoClient, UpdateOne
import os
import time

# --- CONFIGURATION ---
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "carbon_tracker_db"
COLLECTION_NAME = "emission_hotspots"

# Path to your CSV
CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'feature 2', 'emission_analysis_results.csv')

def patch_coordinates_fast():
    print("🔌 Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # 1. PERFORMANCE BOOST: Create an Index
    # This makes finding the specific mine instant, rather than scanning the whole DB
    print("⚡ Creating search index on 'Mine_Name'...")
    collection.create_index("Mine_Name")

    print(f"📖 Reading CSV from: {CSV_FILE_PATH}")
    try:
        df = pd.read_csv(CSV_FILE_PATH)
    except FileNotFoundError:
        print("❌ Error: CSV file not found.")
        return

    # Handle column renaming if needed
    if 'Mine_Nam' in df.columns:
        df.rename(columns={'Mine_Nam': 'Mine_Name'}, inplace=True)

    # Prepare Bulk Operations
    print("🔄 Preparing data for bulk update...")
    operations = []
    
    for index, row in df.iterrows():
        mine_name = row.get('Mine_Name')
        lat = row.get('Latitude')
        lng = row.get('Longitude')

        # Skip invalid rows
        if pd.isna(lat) or pd.isna(lng) or not mine_name:
            continue

        # Create an update operation object
        op = UpdateOne(
            {"Mine_Name": mine_name},  # Filter
            {"$set": {                 # Update
                "Latitude": float(lat),
                "Longitude": float(lng)
            }}
        )
        operations.append(op)

    # Execute Bulk Write
    if operations:
        print(f"🚀 Sending {len(operations)} updates to database...")
        try:
            start_time = time.time()
            result = collection.bulk_write(operations)
            end_time = time.time()
            
            print(f"\n✅ DONE in {end_time - start_time:.2f} seconds!")
            print(f"   - Matched: {result.matched_count}")
            print(f"   - Modified: {result.modified_count}")
        except Exception as e:
            print(f"❌ Bulk write error: {e}")
    else:
        print("⚠️ No valid data found to update.")

    client.close()

if __name__ == "__main__":
    patch_coordinates_fast()