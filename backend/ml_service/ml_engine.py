import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import json
import os
import io

# ---------------------------------------------------------
# 1. PATH CONFIGURATION (Fixes "CSV missing" errors)
# ---------------------------------------------------------
# Get the directory where THIS script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define absolute paths for your datasets
EMISSIONS_FILE = os.path.join(BASE_DIR, 'coal_dataset_10k_5years.csv')
ML_TRAINING_FILE = os.path.join(BASE_DIR, 'ml_training_data.csv')
OPS_REGISTRY_FILE = os.path.join(BASE_DIR, 'operational_registry.csv')

def convert_safe(obj):
    """
    Helper to convert numpy/pandas types to standard Python types for JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: convert_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_safe(i) for i in obj]
    
    # Handle Numpy integers and floats
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    
    # Handle Pandas periods/timestamps
    if isinstance(obj, pd.Period):
        return str(obj)
    
    # Handle NaN/None
    if pd.isna(obj):
        return None
        
    return obj

def load_datasets():
    # Debug: Print where we are looking for files
    print(f"ML Engine loading CSVs from: {BASE_DIR}")
    
    if not os.path.exists(EMISSIONS_FILE) or not os.path.exists(ML_TRAINING_FILE) or not os.path.exists(OPS_REGISTRY_FILE):
        error_msg = f"Error: One or more CSV files are missing in {BASE_DIR}"
        print(error_msg)
        # We raise an error instead of exit() so the server can catch it
        raise FileNotFoundError(error_msg)
    
    main_df = pd.read_csv(EMISSIONS_FILE)
    main_df.columns = main_df.columns.str.strip()
    
    for col in ['State', 'District']:
        if col in main_df.columns:
            main_df[col] = main_df[col].astype(str).str.strip().str.title()
    
    if 'Date' in main_df.columns:
        main_df['Date'] = pd.to_datetime(main_df['Date'], errors='coerce')

    if 'Mine_Name' not in main_df.columns:
        if 'District' in main_df.columns:
            main_df['Mine_Name'] = main_df['District'] + " Mine"
        else:
            main_df['Mine_Name'] = "Unknown Mine"
    main_df['Mine_Name'] = main_df['Mine_Name'].str.strip().str.title()

    ml_df = pd.read_csv(ML_TRAINING_FILE)
    ops_df = pd.read_csv(OPS_REGISTRY_FILE)
    if 'Mine_Name' in ops_df.columns:
        ops_df['Mine_Name'] = ops_df['Mine_Name'].str.strip().str.title()

    return main_df, ml_df, ops_df

def train_regional_models(ml_df):
    region_models = {}
    if 'State' not in ml_df.columns:
        return region_models
        
    unique_regions = ml_df['State'].unique()
    for region in unique_regions:
        local_data = ml_df[ml_df['State'] == region]
        if not local_data.empty:
            # Ensure these columns exist in your training CSV
            needed_cols = ['Max_Height', 'NDVI', 'Age_Years', 'CO2e_Stock_t_ha']
            if all(col in local_data.columns for col in needed_cols):
                X = local_data[['Max_Height', 'NDVI', 'Age_Years']]
                y = local_data['CO2e_Stock_t_ha']
                model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
                model.fit(X, y)
                region_models[region] = model
    return region_models

# ---------------------------------------------------------
# GLOBAL INITIALIZATION
# ---------------------------------------------------------
# Load data and train models once when the file is imported
try:
    main_emissions_df, ml_library_df, operational_registry_df = load_datasets()
    region_models = train_regional_models(ml_library_df)
    available_mines = main_emissions_df['Mine_Name'].unique().tolist()
    print("ML Engine initialized successfully.")
except Exception as e:
    print(f"ML Engine Initialization Warning: {e}")
    # Initialize empty to prevent import crash, predictor will handle the error later
    main_emissions_df = pd.DataFrame()
    region_models = {}
    available_mines = []

# ---------------------------------------------------------
# MAIN PREDICTION FUNCTION (Called by API)
# ---------------------------------------------------------
# Renamed from get_dashboard_data to match predictor.py expectation
def generate_offset_plan(user_input_name):
    if main_emissions_df.empty:
        return {"error": "ML Datasets not loaded correctly."}

    selected_mine_name = user_input_name.strip().title()
    
    mine_data = main_emissions_df[main_emissions_df['Mine_Name'].str.contains(selected_mine_name, case=False, na=False)].copy()
    
    if mine_data.empty:
        # Return a structure indicating failure, or let predictor handle it
        # For now, we return a basic error structure that frontend can display
        return {
            "error": f"Mine '{selected_mine_name}' not found.", 
            "available_mines": available_mines[:10] # Limit list size
        }

    # --- Data Processing ---
    mine_data['Month_Year'] = mine_data['Date'].dt.to_period('M')
    monthly_trend = mine_data.groupby('Month_Year')['Emission_Index'].mean().reset_index()
    monthly_trend['Month_Year'] = monthly_trend['Month_Year'].astype(str)

    region_state = mine_data['State'].iloc[0]
    region_district = mine_data['District'].iloc[0]
    avg_daily_emission = mine_data['Emission_Index'].mean()
    annual_target = avg_daily_emission * 365

    ops = operational_registry_df[operational_registry_df['Mine_Name'] == selected_mine_name]
    
    if ops.empty:
        land_limit = 500.0
        c_teak = 8.0
        c_acacia = 5.0
        c_pioneer = 4.0
        max_teak = 0.50
    else:
        vals = ops.iloc[0]
        land_limit = vals['Available_Land_Ha']
        c_teak = vals['Cost_Teak']
        c_acacia = vals['Cost_Acacia']
        c_pioneer = vals['Cost_Pioneer']
        max_teak = vals['Max_Teak_Pct']

    # --- ML Prediction ---
    # Fallback to Odisha model or first available model if specific state not found
    active_model = region_models.get(region_state)
    if not active_model and region_models:
        active_model = list(region_models.values())[0]
    
    if active_model:
        std_tree_features = pd.DataFrame({'Max_Height': [15], 'NDVI': [0.85], 'Age_Years': [10]})
        base_prediction = active_model.predict(std_tree_features)[0]
    else:
        base_prediction = 150.0 # Fallback value

    asr_teak = (base_prediction * 1.2) / 10 / 1000 
    asr_acacia = (base_prediction * 1.0) / 10 / 1000
    asr_pioneer = (base_prediction * 0.8) / 10 / 1000

    pct_teak = 0.40
    pct_acacia = 0.30
    pct_pioneer = 0.30

    avg_mix_asr = (pct_teak * asr_teak) + (pct_acacia * asr_acacia) + (pct_pioneer * asr_pioneer)
    if avg_mix_asr == 0: avg_mix_asr = 0.001 # Prevent div by zero
        
    total_trees = annual_target / avg_mix_asr
    
    n_teak = total_trees * pct_teak
    n_acacia = total_trees * pct_acacia
    n_pioneer = total_trees * pct_pioneer
    
    total_cost = (n_teak * c_teak) + (n_acacia * c_acacia) + (n_pioneer * c_pioneer)
    land_required = total_trees / 2000 
    
    cost_teak_total = n_teak * c_teak
    cost_acacia_total = n_acacia * c_acacia
    cost_pioneer_total = n_pioneer * c_pioneer
    
    teak_offset_total = n_teak * asr_teak
    acacia_offset_total = n_acacia * asr_acacia
    pioneer_offset_total = n_pioneer * asr_pioneer

    annual_methane_tonnes = annual_target / 28
    ethanol_potential_liters = (annual_methane_tonnes * 1000) * 1.4
    water_required_liters_ethanol = ethanol_potential_liters * 4
    estimated_fuel_revenue = ethanol_potential_liters * 65.0

    credit_price_inr = 830 
    carbon_revenue_potential = annual_target * credit_price_inr
    
    water_recharge_per_tree = 1500 
    total_water_conserved_liters = total_trees * water_recharge_per_tree

    scenario_low_budget_trees = annual_target / (asr_pioneer if asr_pioneer > 0 else 1)
    scenario_low_budget_cost = scenario_low_budget_trees * c_pioneer
    
    scenario_high_eff_trees = annual_target / (asr_teak if asr_teak > 0 else 1)
    scenario_high_eff_cost = scenario_high_eff_trees * c_teak

    # --- Response Construction (Matches React Schema) ---
    frontend_response = {
        "mine_metadata": {
            "mine_name": selected_mine_name,
            "district": region_district,
            "state": region_state,
            "status": "success"
        },
        "kpis": {
            "annual_offset_target_tonnes": round(annual_target, 0),
            "total_trees_required": int(round(total_trees)),
            "estimated_budget_inr": round(total_cost, 2),
            "land_required_ha": round(land_required, 1),
            "land_available_ha": land_limit,
            "land_status": "CRITICAL" if land_required > land_limit else "AVAILABLE",
            "total_offset_achieved": round(annual_target, 0) # Assumption: plan meets target
        },
        "tree_plan": {
             "teak": {"count": int(round(n_teak)), "total_cost": round(cost_teak_total, 2), "asr_per_tree": round(asr_teak * 1000, 2), "offset_contribution_tonnes": round(teak_offset_total, 2)},
             "acacia": {"count": int(round(n_acacia)), "total_cost": round(cost_acacia_total, 2), "asr_per_tree": round(asr_acacia * 1000, 2), "offset_contribution_tonnes": round(acacia_offset_total, 2)},
             "pioneer": {"count": int(round(n_pioneer)), "total_cost": round(cost_pioneer_total, 2), "asr_per_tree": round(asr_pioneer * 1000, 2), "offset_contribution_tonnes": round(pioneer_offset_total, 2)}
        },
        "waste_to_wealth": {
            "annual_methane_captured_kg": round(annual_methane_tonnes * 1000, 2),
            "ethanol_production_litres": round(ethanol_potential_liters, 2),
            "water_required_litres": round(water_required_liters_ethanol, 2),
            "estimated_revenue_inr": round(estimated_fuel_revenue, 2)
        },
        "carbon_credits": {
            "total_offset_credits_tonnes": round(annual_target, 0),
            "market_price_per_credit_inr": credit_price_inr,
            "total_revenue_potential_inr": round(carbon_revenue_potential, 2)
        },
        "water_conservation": {
            "total_water_conserved_kilolitres": round(total_water_conserved_liters / 1000, 0),
            "status": "High Efficiency"
        },
        "what_if_scenarios": {
            "low_budget": {
                "total_trees": int(round(scenario_low_budget_trees)),
                "total_cost": round(scenario_low_budget_cost, 2),
                "offset_tonnes": round(annual_target, 2)
            },
            "high_efficiency": {
                "total_trees": int(round(scenario_high_eff_trees)),
                "total_cost": round(scenario_high_eff_cost, 2),
                "offset_tonnes": round(annual_target, 2)
            }
        },
        "graphs": {
            "monthly_emissions": monthly_trend.rename(columns={'Month_Year': 'month_year', 'Emission_Index': 'emission_index'}).to_dict(orient='records')
        }
    }
    
    return convert_safe(frontend_response)

# ---------------------------------------------------------
# STANDALONE TEST BLOCK
# ---------------------------------------------------------
if __name__ == "__main__":
    # This block only runs if you execute this file directly (not when imported)
    print(f"System Loaded. Available Mines: {available_mines[:5]}...")
    user_input = input("Enter Mine Name: ")
    api_response = generate_offset_plan(user_input)
    print(json.dumps(convert_safe(api_response), indent=4))