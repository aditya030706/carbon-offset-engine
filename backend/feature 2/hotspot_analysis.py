import pandas as pd
import os

def run_hotspot_analysis():
    """Runs the emission hotspot analysis and creates the CSV file."""
    print("\n--- Running Emission Hotspot Analysis ---")
    
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(script_dir, 'coal_dataset_10k_5years.csv')
        
        # Load and clean data
        df = pd.read_csv(csv_path)
        df = df.dropna(subset=['CO2_ppm', 'CH4_ppm', 'PM2_5', 'PM10'])

        # Calculate emission score
        df['Emission_Score'] = (
            0.4 * df['CO2_ppm'] +
            0.3 * df['CH4_ppm'] +
            0.15 * df['PM2_5'] +
            0.15 * df['PM10']
        )

        # Calculate thresholds
        mean_score = df['Emission_Score'].mean()
        std_score = df['Emission_Score'].std()
        low_thresh = mean_score - 0.5 * std_score
        high_thresh = mean_score + 0.5 * std_score

        # Classify emissions
        def classify_emission(x):
            if x > high_thresh:
                return 'Red'
            elif x > low_thresh:
                return 'Orange'
            else:
                return 'Yellow'

        df['Hotspot_Level'] = df['Emission_Score'].apply(classify_emission)

        # Save in the same folder (feature 2)
        output_path = os.path.join(script_dir, 'emission_analysis_results.csv')
        df.to_csv(output_path, index=False)

        print(f"✅ Hotspot analysis complete. CSV saved to: {output_path}")
        print(f"   Total records: {len(df)}")
        print(f"   Red zones: {len(df[df['Hotspot_Level'] == 'Red'])}")
        print(f"   Orange zones: {len(df[df['Hotspot_Level'] == 'Orange'])}")
        print(f"   Yellow zones: {len(df[df['Hotspot_Level'] == 'Yellow'])}")
        print(f"   Thresholds - Low: {round(low_thresh, 2)}, High: {round(high_thresh, 2)}")
        
        return True
    except FileNotFoundError as e:
        print(f"❌ Error: CSV file not found. Make sure 'coal_dataset_10k_5years.csv' is in the feature 2 folder.")
        print(f"   Looking for: {csv_path}")
        return False
    except Exception as e:
        print(f"❌ Error during hotspot analysis: {e}")
        return False

if __name__ == "__main__":
    run_hotspot_analysis()