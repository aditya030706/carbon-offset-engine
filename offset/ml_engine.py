import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import json
import os
import io
def convert_safe(obj):
    import numpy as np
    import pandas as pd

    if isinstance(obj, dict):
        return {k: convert_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_safe(i) for i in obj]
    if isinstance(obj, (np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.float64, np.float32)):
        return float(obj)
    if isinstance(obj, pd.Period):
        return str(obj)
    return obj


EMISSIONS_FILE = 'coal_dataset_10k_5years.csv'
ML_TRAINING_FILE = 'ml_training_data.csv'
OPS_REGISTRY_FILE = 'operational_registry.csv'

def load_datasets():
    if not os.path.exists(EMISSIONS_FILE) or not os.path.exists(ML_TRAINING_FILE) or not os.path.exists(OPS_REGISTRY_FILE):
        print("Error: One or more CSV files are missing.")
        exit()
    
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
    ops_df['Mine_Name'] = ops_df['Mine_Name'].str.strip().str.title()

    return main_df, ml_df, ops_df

def train_regional_models(ml_df):
    region_models = {}
    unique_regions = ml_df['State'].unique()
    for region in unique_regions:
        local_data = ml_df[ml_df['State'] == region]
        if not local_data.empty:
            X = local_data[['Max_Height', 'NDVI', 'Age_Years']]
            y = local_data['CO2e_Stock_t_ha']
            model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            model.fit(X, y)
            region_models[region] = model
    return region_models

main_emissions_df, ml_library_df, operational_registry_df = load_datasets()
region_models = train_regional_models(ml_library_df)
available_mines = main_emissions_df['Mine_Name'].unique().tolist()

def get_dashboard_data(user_input_name):
    selected_mine_name = user_input_name.strip().title()
    
    mine_data = main_emissions_df[main_emissions_df['Mine_Name'].str.contains(selected_mine_name, case=False, na=False)].copy()
    
    if mine_data.empty:
        return {"error": f"Mine '{selected_mine_name}' not found.", "available_mines": available_mines}

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

    active_model = region_models.get(region_state, region_models.get('Odisha'))
    std_tree_features = pd.DataFrame({'Max_Height': [15], 'NDVI': [0.85], 'Age_Years': [10]})
    base_prediction = active_model.predict(std_tree_features)[0]
    
    asr_teak = (base_prediction * 1.2) / 10 / 1000 
    asr_acacia = (base_prediction * 1.0) / 10 / 1000
    asr_pioneer = (base_prediction * 0.8) / 10 / 1000

    pct_teak = 0.40
    pct_acacia = 0.30
    pct_pioneer = 0.30

    avg_mix_asr = (pct_teak * asr_teak) + (pct_acacia * asr_acacia) + (pct_pioneer * asr_pioneer)
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

    scenario_low_budget_trees = annual_target / asr_pioneer
    scenario_low_budget_cost = scenario_low_budget_trees * c_pioneer
    
    scenario_high_eff_trees = annual_target / asr_teak
    scenario_high_eff_cost = scenario_high_eff_trees * c_teak

    frontend_response = {
        "meta": {
            "mine_name": selected_mine_name,
            "region_state": region_state,
            "region_district": region_district,
            "data_status": "success"
        },
        "kpi_metrics": {
            "annual_offset_target_tonnes": round(annual_target, 0),
            "total_trees_planned_count": int(round(total_trees)),
            "estimated_budget_inr": round(total_cost, 2),
            "land_required_ha": round(land_required, 1),
            "land_available_ha": land_limit,
            "land_status_alert": "CRITICAL" if land_required > land_limit else "AVAILABLE"
        },
        "detailed_plan": {
             "teak": {"count": int(round(n_teak)), "cost_inr": round(cost_teak_total, 2), "asr_per_tree_kg": round(asr_teak * 1000, 2), "offset_tonnes": round(teak_offset_total, 2)},
             "acacia": {"count": int(round(n_acacia)), "cost_inr": round(cost_acacia_total, 2), "asr_per_tree_kg": round(asr_acacia * 1000, 2), "offset_tonnes": round(acacia_offset_total, 2)},
             "pioneer_mix": {"count": int(round(n_pioneer)), "cost_inr": round(cost_pioneer_total, 2), "asr_per_tree_kg": round(asr_pioneer * 1000, 2), "offset_tonnes": round(pioneer_offset_total, 2)}
        },
        "waste_to_wealth_conversion": {
            "description": "Methane Gas to Ethanol Fuel Conversion",
            "annual_methane_captured_kg": round(annual_methane_tonnes * 1000, 2),
            "ethanol_production_potential_liters": round(ethanol_potential_liters, 2),
            "process_water_required_liters": round(water_required_liters_ethanol, 2),
            "estimated_revenue_inr": round(estimated_fuel_revenue, 2)
        },
        "carbon_credit_potential": {
            "description": "Revenue from trading Carbon Offsets",
            "total_offset_credits_tonnes": round(annual_target, 0),
            "market_price_per_credit_inr": credit_price_inr,
            "potential_revenue_inr": round(carbon_revenue_potential, 2)
        },
        "water_conservation_impact": {
            "description": "Groundwater recharge and runoff reduction",
            "water_conserved_per_tree_liters_year": water_recharge_per_tree,
            "total_water_conserved_liters_year": round(total_water_conserved_liters, 0),
            "total_water_conserved_kiloliters_year": round(total_water_conserved_liters / 1000, 0)
        },
        "what_if_scenarios": {
            "scenario_low_budget": {
                "description": "100% Pioneer Mix (Cheapest)",
                "total_cost_inr": round(scenario_low_budget_cost, 2),
                "total_trees": int(round(scenario_low_budget_trees))
            },
            "scenario_high_efficiency": {
                "description": "100% Teak (Lowest Land Use)",
                "total_cost_inr": round(scenario_high_eff_cost, 2),
                "total_trees": int(round(scenario_high_eff_trees))
            }
        },
        "graphs": {
            "graph_1_financial_mix": {
                "chart_type": "pie",
                "labels": ["Teak", "Acacia", "Pioneer Mix"],
                "values": [round(cost_teak_total, 2), round(cost_acacia_total, 2), round(cost_pioneer_total, 2)],
                "colors": ["#4CAF50", "#8BC34A", "#FFC107"],
                "unit": "INR"
            },
            "graph_2_land_compliance": {
                "chart_type": "bar",
                "labels": ["Required Land", "Available Land"],
                "values": [round(land_required, 1), land_limit],
                "colors": ["#FF5733", "#36A2EB"],
                "unit": "Hectares"
            },
            "graph_3_emissions_trend": {
                "chart_type": "line",
                "x_axis_labels": monthly_trend['Month_Year'].tolist(),
                "y_axis_data": monthly_trend['Emission_Index'].round(2).tolist(),
                "label": "Emission Index (Monthly Avg)",
                "unit": "Index Value"
            }
        }
    }
    
    return convert_safe(frontend_response)


print(f"System Loaded. Available Mines: {available_mines}")
user_input = input("Enter Mine Name: ")
api_response = get_dashboard_data(user_input)
print(json.dumps(convert_safe(api_response), indent=4))
def convert_safe(obj):
    if isinstance(obj, dict):
        return {k: convert_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_safe(i) for i in obj]
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    if isinstance(obj, pd.Period):
        return str(obj)
    if pd.isna(obj):
        return None
    return obj