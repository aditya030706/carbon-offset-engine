import sys
import os
import logging
import importlib.util

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------------
# DIRECT ML ENGINE LOADER
# -------------------------------------------------------------------------
# Since ml_engine.py is now in the same folder (app/ml_service/),
# we just load it directly from the current directory.

current_dir = os.path.dirname(os.path.abspath(__file__))
generate_offset_plan = None

def load_ml_engine():
    global generate_offset_plan
    target_filename = "ml_engine.py"
    engine_path = os.path.join(current_dir, target_filename)
    
    if os.path.exists(engine_path):
        try:
            # Load module from file path (bypassing relative import issues)
            spec = importlib.util.spec_from_file_location("ml_engine_module", engine_path)
            ml_module = importlib.util.module_from_spec(spec)
            sys.modules["ml_engine_module"] = ml_module
            spec.loader.exec_module(ml_module)
            
            if hasattr(ml_module, "generate_offset_plan"):
                generate_offset_plan = ml_module.generate_offset_plan
                logger.info(f"Successfully loaded ML Engine from: {engine_path}")
            else:
                logger.error(f"Error: 'generate_offset_plan' function missing in {target_filename}")
        except Exception as e:
            logger.error(f"Failed to load ML Engine: {e}")
    else:
        logger.warning(f"Could not find '{target_filename}' in {current_dir}")

load_ml_engine()

# -------------------------------------------------------------------------
# PREDICTOR CLASS
# -------------------------------------------------------------------------

class OffsetPredictor:
    def predict(self, mine_name: str):
        # 1. Real Model
        if generate_offset_plan:
            try:
                logger.info(f"Running ML Prediction for: {mine_name}")
                return generate_offset_plan(mine_name)
            except Exception as e:
                logger.error(f"ML Engine Runtime Error: {e}")
                return self._run_simulation(mine_name)
        
        # 2. Fallback Simulation
        else:
            logger.warning("ML Engine unavailable. Using simulation.")
            return self._run_simulation(mine_name)

    def _run_simulation(self, mine_name: str):
        """Fallback dummy data generator."""
        seed = len(mine_name) if mine_name else 5
        target = 150000 + (seed * 1000)
        trees = int(target * 1.2)
        budget = trees * 150
        
        return {
            "mine_metadata": { "mine_name": mine_name or "Unknown", "district": "Angul", "state": "Odisha", "status": "Simulation Mode" },
            "kpis": {
                "annual_offset_target_tonnes": target,
                "total_trees_required": trees,
                "estimated_budget_inr": budget,
                "land_required_ha": trees / 1000.0,
                "land_available_ha": (trees / 1000.0) * 1.2,
                "land_status": "Available",
                "total_offset_achieved": target * 0.9
            },
            "tree_plan": {
                "teak": { "count": int(trees * 0.3), "total_cost": budget * 0.5, "asr_per_tree": 15, "offset_contribution_tonnes": target * 0.4 },
                "acacia": { "count": int(trees * 0.4), "total_cost": budget * 0.3, "asr_per_tree": 8, "offset_contribution_tonnes": target * 0.35 },
                "pioneer": { "count": int(trees * 0.3), "total_cost": budget * 0.2, "asr_per_tree": 10, "offset_contribution_tonnes": target * 0.25 }
            },
            "water_conservation": { "total_water_conserved_kilolitres": trees * 0.5, "status": "High Efficiency" },
            "waste_to_wealth": { "annual_methane_captured_kg": 45000, "ethanol_production_litres": 12000, "water_required_litres": 5000, "estimated_revenue_inr": 800000 },
            "carbon_credits": { "total_offset_credits_tonnes": target * 0.5, "market_price_per_credit_inr": 1200, "total_revenue_potential_inr": (target * 0.5) * 1200 },
            "what_if_scenarios": {
                "low_budget": { "total_trees": int(trees * 0.8), "total_cost": budget * 0.6, "offset_tonnes": target * 0.7 },
                "high_efficiency": { "total_trees": int(trees * 1.1), "total_cost": budget * 1.3, "offset_tonnes": target * 1.2 }
            },
            "graphs": { "monthly_emissions": [{"month_year": "Jan 24", "emission_index": 100}, {"month_year": "Feb 24", "emission_index": 102}] }
        }

predictor = OffsetPredictor()