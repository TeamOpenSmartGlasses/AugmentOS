import json
import time
from datetime import datetime

date_time = datetime.fromtimestamp(time.time())
readable_date_time = date_time.strftime("%Y-%m-%d %H:%M:%S")

cost_data = {
    "start_time": readable_date_time,
    "proactive_definer_gpt3_cost": 0,
    "proactive_definer_gpt4_cost": 0
}

def update_cost_tracker(key=None, amount_to_increase=None):
    if key is None or amount_to_increase is None: return
    if key not in cost_data: raise

    cost_data[key] = cost_data[key] + amount_to_increase

    # Writing JSON data to a file, wiping any previous data
    with open('costs.json', 'w') as file:
        json.dump(cost_data, file, indent=4)
