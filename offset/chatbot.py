import json
from gtts import gTTS
from ml_engine import get_dashboard_data


def generate_detailed_hindi_summary(data):
    try:
        mine = data.get('meta', {}).get('mine_name', 'चयनित खान')
        state = data.get('meta', {}).get('region_state', '')
        dist = data.get('meta', {}).get('region_district', '')

        kpi = data.get("kpi_metrics", {})
        total_trees = kpi.get("total_trees_planned_count", 0)
        budget = kpi.get("estimated_budget_inr", 0)
        land_req = kpi.get("land_required_ha", 0)
        land_avl = kpi.get("land_available_ha", 0)

        plan = data.get("detailed_plan", {})
        teak = plan.get("teak", {}).get("count", 0)
        acacia = plan.get("acacia", {}).get("count", 0)
        pioneer = plan.get("pioneer_mix", {}).get("count", 0)

        carbon = data.get("carbon_credit_potential", {})
        carbon_income = carbon.get("potential_revenue_inr", 0)

        ethanol = data.get("waste_to_wealth_conversion", {})
        ethanol_liters = ethanol.get("ethanol_production_potential_liters", 0)
        ethanol_revenue = ethanol.get("estimated_revenue_inr", 0)

        water = data.get("water_conservation_impact", {})
        water_kl = water.get("total_water_conserved_kiloliters_year", 0)

        summary = f"""
{mine} खान के लिए विस्तृत पर्यावरणीय रिपोर्ट तैयार है।

यह खान {dist} जिला, {state} राज्य में स्थित है। वार्षिक CO₂ उत्सर्जन को संतुलित करने के लिए कुल {total_trees} पेड़ों की आवश्यकता है। पूरी परियोजना का कुल बजट लगभग ₹{budget} रहेगा। इस काम को पूरा करने के लिए {land_req} हेक्टेयर भूमि चाहिए, जबकि उपलब्ध भूमि {land_avl} हेक्टेयर है।

पेड़ लगाने की योजना —
• {teak} सागवान
• {acacia} अकासिया
• {pioneer} पायनियर मिश्रण

एथेनॉल उत्पादन: {ethanol_liters} लीटर (वार्षिक), अनुमानित राजस्व ₹{ethanol_revenue}।

कार्बन क्रेडिट आय: ₹{carbon_income} प्रति वर्ष।

जल संरक्षण: {water_kl} किलोलीटर भूजल रिचार्ज।

समग्र रूप से, यह परियोजना उत्सर्जन नियंत्रण, आर्थिक लाभ और पर्यावरण सुधार तीनों क्षेत्रों में महत्वपूर्ण प्रभाव डालती है।
"""
        return summary.strip()

    except Exception as e:
        return f"सारांश बनाने में त्रुटि: {str(e)}"


def generate_audio_file(text, filename="output.mp3"):
    tts = gTTS(text=text, lang="hi")
    tts.save(filename)
    return filename


if __name__ == "__main__":
    mine_name = input("Enter Mine Name: ")
    data = get_dashboard_data(mine_name)

    summary = generate_detailed_hindi_summary(data)

    audio_file = generate_audio_file(summary)
    print("Audio saved as:", audio_file)
