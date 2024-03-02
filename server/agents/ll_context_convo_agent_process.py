import time
import traceback
import asyncio
from math import radians, cos, sin, sqrt, atan2

# custom
from DatabaseHandler import DatabaseHandler
from agents.ll_context_convo_agent import run_ll_context_convo_agent
from agents.helpers.get_nearby_places import get_user_location, get_nearby_places

run_period = 30
transcript_period = 1

def lat_lng_to_meters(lat1, lng1, lat2, lng2):
    # Radius of the Earth in km
    R = 6371.0

    # Convert latitude and longitude from degrees to radians
    lat1_rad = radians(lat1)
    lng1_rad = radians(lng1)
    lat2_rad = radians(lat2)
    lng2_rad = radians(lng2)

    # Difference in coordinates
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    # Haversine formula
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    # Distance in kilometers
    distance_km = R * c

    # Convert km to meters
    distance_meters = distance_km * 1000

    return distance_meters


def ll_context_convo_agent_processing_loop():
    print("START CONTEXTUAL CONVO PROCESSING LOOP")
    db_handler = DatabaseHandler(parent_handler=False)
    loop = asyncio.get_event_loop()

    # wait for some transcripts to load in
    time.sleep(20)
    
    while True:
        if not db_handler.ready:
            print("db_handler not ready")
            time.sleep(0.1)
            continue

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            print("RUNNING CONTEXTUAL CONVO LOOP")
            # newTranscripts = db_handler.get_recent_transcripts_from_last_nseconds_for_all_users(
            #     n=run_period)

            response = None
            user_ids = set()
            for user in db_handler.get_active_users():
                user_id = user['user_id']
                device_id = user['device_id']

                if user_ids.__contains__(user_id):
                    continue
                print("here")
                user_ids.add(user_id)
                ctime = time.time()
                target_language = db_handler.get_user_option_value(user_id, "target_language")
                locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)
                transcripts = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=60*transcript_period)

                if len(locations) > 1:
                    user_location = locations[-1]
                    past_location = locations[-2]
                    
                    displacement = lat_lng_to_meters(lat1=past_location['lat'], lng1=past_location['lng'], lat2=user_location['lat'], lng2=user_location['lng'])
                    delta_time = user_location['timestamp'] - past_location['timestamp']
                    
                    speed = displacement / delta_time
                    print(speed)

                    wpm_threshold = 30
                    print(transcripts)
                    print("Speed is: " + str(speed))
                    if speed < 0.00001:
                        print("User is not moving, skipping")
                        continue
                    elif ((len(transcripts[0].split(" ")) / transcript_period)) > wpm_threshold: # compute words per minute
                        print("User is talking, skipping", transcripts)
                        continue
                else:
                    print("Not enough locations, please wait")
                    continue

                places = get_nearby_places(user_location)

                if not places:
                    print("NO PLACES FOUND")
                    continue

                response = run_ll_context_convo_agent(places=places, target_language=target_language, fluency_level=35)

                print("LL Contextual convo output #########################")
                print(response)
                loop_time = time.time() - ctime
                print(f"RAN LL CONTEXTUAL CONVO IN : {loop_time}")

                if response:
                    db_handler.add_ll_context_convo_results_for_user(
                        user_id, response)

        except Exception as e:
            print("Exception in CONTEXTUAL CONVO loop...:")
            print(e)
            traceback.print_exc()

        finally:
            # lock.release()
            pLoopEndTime = time.time()
            print("=== CONTEXTUAL CONVO loop completed in {} seconds overall ===".format(
                round(pLoopEndTime - pLoopStartTime, 2)))

        time.sleep(run_period)
