import pandas as pd
from pymongo import MongoClient
from io import StringIO
from datetime import datetime
from typing import List, Dict, Any

# --- Configuration (MUST match your setup) ---
MONGO_URI = "mongodb://localhost:27017/" 
DB_NAME = "carbon_tracker_db"          
MONTHLY_COLLECTION = "monthly_emissions"  
AVERAGE_COLLECTION = "overall_averages"   

# CSV files created by ml_model_script.py (Paths are correct for your structure)
MONTHLY_CSV_FILE = './feature 1/monthly_emissions_summary.csv'
AVERAGE_CSV_FILE = './feature 1/average_emissions.csv'

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

    # --- Helper Function for Monthly Data (CRITICAL FIX APPLIED HERE) ---
    def process_and_insert_monthly(csv_path: str):
        collection = db[MONTHLY_COLLECTION]
        print(f"\n--- Processing '{csv_path}' for collection '{MONTHLY_COLLECTION}' ---")

        try:
            df = pd.read_csv(csv_path)
            
            # CRITICAL FIX: Ensure ALL rows are read and inserted
            data_records: List[Dict] = df.to_dict(orient='records')

            if not data_records:
                print("No monthly data found. Skipping.")
                return
            
            ingestion_time = datetime.utcnow()
            
            for record in data_records:
                record['ingested_at'] = ingestion_time
                for key, value in record.items():
                    if pd.isna(value): record[key] = None
                    
            # Strategy: Clear and Insert all 12 months
            collection.delete_many({}) 
            result = collection.insert_many(data_records)
            print(f"✅ Successfully inserted {len(result.inserted_ids)} monthly documents.")

        except FileNotFoundError:
            print(f"❌ Error: CSV file not found at {csv_path}. Skipping ingestion.")
        except Exception as e:
            print(f"❌ Error during monthly insertion: {e}")

    # --- Helper Function for Average Data (Single Record Fix) ---
    def process_and_insert_average(csv_path: str):
        collection = db[AVERAGE_COLLECTION]
        print(f"\n--- Processing '{csv_path}' for collection '{AVERAGE_COLLECTION}' ---")
        
        try:
            df = pd.read_csv(csv_path)
            
            if df.empty:
                print("No average data found. Skipping.")
                return

            # CRITICAL FIX: Nest the single row data structure for the schema
            average_metrics = df.iloc[0].to_dict()
            ingestion_time = datetime.utcnow()
            
            document_to_insert = {
                "average_emissions_ppm": average_metrics,
                "ingested_at": ingestion_time
            }
            
            # Strategy: Use replace_one for guaranteed single-document overwrite
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
            
    
    # --- Execute Ingestion for Both Files ---
    process_and_insert_monthly(MONTHLY_CSV_FILE)
    process_and_insert_average(AVERAGE_CSV_FILE)

    # 3. Close Connection
    client.close()
    print("\nMongoDB connection closed.")

if __name__ == "__main__":
    ingest_data()