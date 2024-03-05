import time
import traceback
import asyncio
from math import radians, cos, sin, sqrt, atan2

# custom
from DatabaseHandler import DatabaseHandler
from agents.ll_context_convo_agent import run_ll_context_convo_agent
from agents.helpers.get_nearby_places import get_user_location, get_nearby_places
from constants import TESTING_LL_CONTEXT_CONVO_AGENT

import warnings


if TESTING_LL_CONTEXT_CONVO_AGENT:
    run_period = 10
else:
    run_period = 10

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


async def handle_user_conversation(user_id, device_id, db_handler, ongoing_conversations):
    print("RUNNING CONTEXTUAL CONVO FOR USER: ", user_id)
    target_language = db_handler.get_user_option_value(user_id, "target_language")
    locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)
    transcripts = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=transcript_period)
    ongoing_conversations.add(user_id)


    # this block checks if the user is moving or talking, if so, it skips the conversation
    if len(locations) > 1:
        user_location = locations[-1]
        past_location = locations[-2]

        displacement = lat_lng_to_meters(lat1=past_location['lat'], lng1=past_location['lng'], lat2=user_location['lat'], lng2=user_location['lng'])
        delta_time = user_location['timestamp'] - past_location['timestamp']
        
        speed = displacement / delta_time
        print(speed)

        wpm_threshold = 30
        print(transcripts)

        if TESTING_LL_CONTEXT_CONVO_AGENT:
            warnings.warn("Currently in testing mode, skipping speed and trascription checks, please remove TESTING flag to run normally.")
        elif speed < 0:
            print("User is not moving, skipping")
            ongoing_conversations.remove(user_id)
            return
        elif (len(transcripts[0].split(" ")) / (transcript_period / 60)) > wpm_threshold: # compute words per minute
            print("User is talking, skipping", transcripts)
            ongoing_conversations.remove(user_id)
            return
    else:
        print("Not enough locations, please wait")
        ongoing_conversations.remove(user_id)
        return


    # if not places:
    #     print("NO PLACES FOUND")
    #     ongoing_conversations.remove(user_id)
    #     return

    conversation_history = []

    # this block runs the contextual conversation agent until the conversation ends
    while True:
        places = get_nearby_places(user_location)
        print("START ll contextual conversation")
        response = run_ll_context_convo_agent(places=places, target_language=target_language, fluency_level=35, conversation_history=conversation_history)

        if response:
            db_handler.add_ll_context_convo_results_for_user(
                user_id, response)
        else:
            ongoing_conversations.remove(user_id)
            return

        conversation_history.append({"role": "agent", "content": response['ll_context_convo_response']})

        await asyncio.sleep(5)
        user_reponse = []
        new_response = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=5)

        # This block waits for the user to respond
        while new_response[0] or not user_reponse:
            
            if new_response[0]:
                print("NEW RESPONSE")
                user_reponse.append(new_response[0])
            
            await asyncio.sleep(5)
            new_response = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=5)
            # print("NEW RESPONSE 2")
            # print(new_response)
            # print("USER RESPONSE 2")
            # print(user_reponse)

        user_reponse = " ".join(user_reponse)

        print("USER RESPONSE")
        print(user_reponse)

        conversation_history.append({"role": "user", "content": user_reponse})

        locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)

        if len(locations) > 1:
            places = get_nearby_places(locations[-1])

            if places:
                continue

        places = None

    ongoing_conversations.remove(user_id)
    return


async def ll_context_convo_agent_processing_loop_async():
    print("START CONTEXTUAL CONVO PROCESSING LOOP ASYNC")
    db_handler = DatabaseHandler(parent_handler=False)
    
    # Ensure we are using an async event loop
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()

    # wait for some transcripts to load in
    await asyncio.sleep(20)
    ongoing_conversations = set()

    # This block initiates the contextual conversation agent for each active user
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

            # start a conversation for each active user
            for user in active_users:
                user_id = user['user_id']
                device_id = user['device_id']

                if user_id in ongoing_conversations:
                    continue

                tasks.append(handle_user_conversation(user_id, device_id, db_handler, ongoing_conversations))

            if tasks:
                await asyncio.gather(*tasks)

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
