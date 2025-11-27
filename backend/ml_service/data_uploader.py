import pandas as pd
from pymongo import MongoClient
from io import StringIO
from datetime import datetime
from typing import List, Dict, Any
import os

# --- Configuration (MUST match your setup) ---
MONGO_URI = "mongodb://localhost:27017/" 
DB_NAME = "carbon_tracker_db"          
MONTHLY_COLLECTION = "monthly_emissions"   
AVERAGE_COLLECTION = "overall_averages"
HOTSPOT_COLLECTION = "emission_hotspots"  # NEW

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# CSV file paths
MONTHLY_CSV_FILE = os.path.join(script_dir, '..', 'feature 1', 'monthly_emissions_summary.csv')
AVERAGE_CSV_FILE = os.path.join(script_dir, '..', 'feature 1', 'average_emissions.csv')
HOTSPOT_CSV_FILE = os.path.join(script_dir, '..', 'feature 2', 'emission_analysis_results.csv')  # NEW

def ingest_data():
    """Reads CSV files and uploads their contents to designated MongoDB collections."""
    
    # 1. Connect to MongoDB
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        print(f"✅ Connected successfully to database: {DB_NAME}")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB. Ensure your local server is running: {e}")
        return

    # --- Helper Function for Monthly Data ---
    def process_and_insert_monthly(csv_path: str):
        collection = db[MONTHLY_COLLECTION]
        print(f"\n--- Processing '{csv_path}' for collection '{MONTHLY_COLLECTION}' ---")

        try:
            df = pd.read_csv(csv_path)
            
            data_records: List[Dict] = df.to_dict(orient='records')

            if not data_records:
                print("No monthly data found. Skipping.")
                return
            
            ingestion_time = datetime.utcnow()
            
            for record in data_records:
                record['ingested_at'] = ingestion_time
                for key, value in record.items():
                    if pd.isna(value): record[key] = None
                    
            collection.delete_many({}) 
            result = collection.insert_many(data_records)
            print(f"✅ Successfully inserted {len(result.inserted_ids)} monthly documents.")

        except FileNotFoundError:
            print(f"❌ Error: CSV file not found at {csv_path}. Skipping ingestion.")
        except Exception as e:
            print(f"❌ Error during monthly insertion: {e}")

    # --- Helper Function for Average Data ---
    def process_and_insert_average(csv_path: str):
        collection = db[AVERAGE_COLLECTION]
        print(f"\n--- Processing '{csv_path}' for collection '{AVERAGE_COLLECTION}' ---")
        
        try:
            df = pd.read_csv(csv_path)
            
            if df.empty:
                print("No average data found. Skipping.")
                return

            average_metrics = df.iloc[0].to_dict()
            ingestion_time = datetime.utcnow()
            
            document_to_insert = {
                "average_emissions_ppm": average_metrics,
                "ingested_at": ingestion_time
            }
            
            collection.replace_one(
                filter={},
                replacement=document_to_insert,
                upsert=True
            )
            print(f"✅ Successfully replaced/inserted 1 average document.")

        except FileNotFoundError:
            print(f"❌ Error: CSV file not found at {csv_path}. Skipping ingestion.")
        except Exception as e:
            print(f"❌ Error during average insertion: {e}")

    # --- NEW: Helper Function for Hotspot Data (UPDATED) ---
    def process_and_insert_hotspots(csv_path: str):
        collection = db[HOTSPOT_COLLECTION]
        print(f"\n--- Processing '{csv_path}' for collection '{HOTSPOT_COLLECTION}' ---")

        try:
            df = pd.read_csv(csv_path)
            print(f"   📊 Columns found in CSV: {df.columns.tolist()}")

            # --- 🛠️ FIX 1: Handle truncated column names ---
            # If CSV has "Mine_Nam" instead of "Mine_Name", fix it
            if 'Mine_Nam' in df.columns and 'Mine_Name' not in df.columns:
                print("   ⚠️  Renaming 'Mine_Nam' to 'Mine_Name'")
                df.rename(columns={'Mine_Nam': 'Mine_Name'}, inplace=True)

            # --- 🛠️ FIX 2: Ensure Lat/Long are Floats ---
            # This prevents "text" coordinates from breaking the map
            if 'Latitude' in df.columns:
                df['Latitude'] = pd.to_numeric(df['Latitude'], errors='coerce')
            if 'Longitude' in df.columns:
                df['Longitude'] = pd.to_numeric(df['Longitude'], errors='coerce')

            # Check if we have valid coordinates
            valid_coords = df.dropna(subset=['Latitude', 'Longitude'])
            print(f"   ✅ Found {len(valid_coords)} rows with valid Latitude/Longitude.")

            data_records: List[Dict] = df.to_dict(orient='records')

            if not data_records:
                print("No hotspot data found. Skipping.")
                return
            
            ingestion_time = datetime.utcnow()
            
            for record in data_records:
                record['ingested_at'] = ingestion_time
                for key, value in record.items():
                    if pd.isna(value): 
                        record[key] = None
                    
            collection.delete_many({}) 
            result = collection.insert_many(data_records)
            print(f"✅ Successfully inserted {len(result.inserted_ids)} hotspot documents.")

        except FileNotFoundError:
            print(f"❌ Error: CSV file not found at {csv_path}. Skipping ingestion.")
        except Exception as e:
            print(f"❌ Error during hotspot insertion: {e}")
            
    
    # --- Execute Ingestion for All Files ---
    process_and_insert_monthly(MONTHLY_CSV_FILE)
    process_and_insert_average(AVERAGE_CSV_FILE)
    process_and_insert_hotspots(HOTSPOT_CSV_FILE)  # NEW

    # 3. Close Connection
    client.close()
    print("\nMongoDB connection closed.")

if __name__ == "__main__":
    ingest_data()