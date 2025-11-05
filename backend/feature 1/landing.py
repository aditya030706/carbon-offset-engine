import pandas as pd

# Load the dataset (The input file must be relative to the CWD, which is /backend)
try:
    # FIX: Use the explicit path 'feature 1/...' so Python can find the file 
    # when the command is executed from the /backend directory.
    df = pd.read_csv("feature 1/coal_dataset_10k_5years.csv")
    
except FileNotFoundError:
    print("Error: 'coal_dataset_10k_5years.csv' not found. Please check the file path.")
    exit()

# --- Data Cleaning and Preprocessing ---
gas_columns = ['CO2_ppm', 'CH4_ppm', 'SO2_ppm', 'NOx_ppm', 'PM2_5', 'PM10']
df = df.dropna(subset=gas_columns + ['Date'])
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df = df.dropna(subset=['Date'])

# --- 1. Calculate and Round Average Emissions (Overall) ---
# CRITICAL FIX: Rounding the calculated mean to 2 decimal places here
avg_emissions = df[gas_columns].mean().round(2).to_dict() 
average_df = pd.DataFrame([avg_emissions]) 

# --- 2. Calculate and Round Monthly Average Emissions ---
df['Month'] = df['Date'].dt.month_name().str[:3]
monthly_avg_raw = (
    df.groupby('Month')[['CO2_ppm', 'CH4_ppm', 'PM2_5', 'PM10']]
    .mean()
    .reindex(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])
)

# CRITICAL FIX: Rounding all monthly data to 2 decimal places before saving
monthly_avg = monthly_avg_raw.round(2).reset_index()


# --- 3. Save DataFrames to CSV Files ---
# Output files are saved inside the 'feature 1' folder.
MONTHLY_OUTPUT_FILE = 'feature 1/monthly_emissions_summary.csv' 
AVERAGE_OUTPUT_FILE = 'feature 1/average_emissions.csv'     

# Save Monthly Averages
monthly_avg.to_csv(MONTHLY_OUTPUT_FILE, index=False)
print(f"✅ Monthly Summary data saved to: {MONTHLY_OUTPUT_FILE}")

# Save Overall Averages
average_df.to_csv(AVERAGE_OUTPUT_FILE, index=False)
print(f"✅ Overall Average data saved to: {AVERAGE_OUTPUT_FILE}")