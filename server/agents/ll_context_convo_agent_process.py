import time
import traceback
import asyncio
from math import radians, cos, sin, sqrt, atan2

# custom
from DatabaseHandler import DatabaseHandler
from agents.ll_context_convo_agent import run_ll_context_convo_agent
from agents.helpers.get_nearby_places import get_user_location, get_nearby_places
from constants import TESTING

import warnings


if TESTING:
    run_period = 10
else:
    run_period = 30

transcript_period = 60


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


async def handle_user_conversation(user_id, device_id, db_handler):
    print("RUNNING CONTEXTUAL CONVO FOR USER: ", user_id)
    target_language = db_handler.get_user_option_value(user_id, "target_language")
    locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)
    transcripts = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=transcript_period)

    if len(locations) > 1:
        user_location = locations[-1]
        past_location = locations[-2]

        displacement = lat_lng_to_meters(lat1=past_location['lat'], lng1=past_location['lng'], lat2=user_location['lat'], lng2=user_location['lng'])
        delta_time = user_location['timestamp'] - past_location['timestamp']
        
        speed = displacement / delta_time
        print(speed)

        wpm_threshold = 30
        print(transcripts)

        if TESTING:
            warnings.warn("Currently in testing mode, skipping speed and trascription checks, please remove TESTING flag to run normally.")
        elif speed < 0.01:
            print("User is not moving, skipping")
            return user_id
        elif (len(transcripts[0].split(" ")) / (transcript_period / 60)) > wpm_threshold: # compute words per minute
            print("User is talking, skipping", transcripts)
            return user_id
    else:
        print("Not enough locations, please wait")
        return user_id

    places = get_nearby_places(user_location)
    conversation_history = []

    if not places:
        print("NO PLACES FOUND")
        return user_id

    conversation_history = []
    while True:
        response = run_ll_context_convo_agent(places=places, target_language=target_language, fluency_level=35, conversation_history=conversation_history)

        if response:
            db_handler.add_ll_context_convo_results_for_user(
                user_id, response)
        else:
            return
        
        conversation_history.append({"role": "ll_context_convo_agent", "content": response['ll_context_convo_response']})
        
        user_reponse = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=transcript_period)

        if "end conversation" in user_reponse: # provisional conversation ender
            break

        conversation_history.append({"role": "user", "content": user_reponse})
        
        locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)

        if len(locations) > 1:
            places = get_nearby_places(locations[-1])

            if places:
                continue

        places = None

    return user_id


async def ll_context_convo_agent_processing_loop_async():
    print("START CONTEXTUAL CONVO PROCESSING LOOP ASYNC")
    db_handler = DatabaseHandler(parent_handler=False)
    
    # Ensure we are using an async event loop
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()

    # wait for some transcripts to load in
    await asyncio.sleep(20)
    ongoing_conversations = []

    while True:
        if not db_handler.ready:
            print("db_handler not ready")
            await asyncio.sleep(0.1)
            continue

        try:
            pLoopStartTime = time.time()
            print("RUNNING CONTEXTUAL CONVO LOOP ASYNC")
            
            active_users = db_handler.get_active_users()
            tasks = []
            for user in active_users:
                user_id = user['user_id']
                device_id = user['device_id']
                tasks.append(handle_user_conversation(user_id, device_id, db_handler))
            
            if tasks:
                completed, pending = await asyncio.wait(tasks, return_when=asyncio.ALL_COMPLETED)
                for task in completed:
                    ongoing_conversations.append(task)

        except Exception as e:
            print("Exception in CONTEXTUAL CONVO loop...:")
            print(e)
            traceback.print_exc()

        finally:
            pLoopEndTime = time.time()
            print(f"=== CONTEXTUAL CONVO loop completed in {round(pLoopEndTime - pLoopStartTime, 2)} seconds overall ===")

        await asyncio.sleep(run_period)


def ll_context_convo_agent_processing_loop():
    asyncio.run(ll_context_convo_agent_processing_loop_async())
