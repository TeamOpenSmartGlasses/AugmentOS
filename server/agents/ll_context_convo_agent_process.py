import time
import traceback
import asyncio
from math import radians, cos, sin, sqrt, atan2
import warnings

# custom
from DatabaseHandler import DatabaseHandler
from agents.ll_context_convo_agent import run_ll_context_convo_agent
from agents.helpers.get_nearby_places import get_user_location, get_nearby_places
from constants import TESTING_LL_CONTEXT_CONVO_AGENT, LL_CONTEXT_CONVO_AGENT

response_period = 10 # how long of a pause to wait before we send the user's response to the agent
break_convo_time_limit = 20 # how long of silence/no response before breaking out of the conversation
wpm_threshold = 5 # wpm, if greater than this, don't run a contextual convo
speed_threshold = 0.72 # speed of movement, if less than this, don't run a contextual convo

if TESTING_LL_CONTEXT_CONVO_AGENT:
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


async def cleanup_conversation(user_id, db_handler):
    print("Ending ll context convo with user: ", user_id)
    db_handler.update_single_user_setting(user_id, "is_having_language_learning_contextual_convo", False)
    db_handler.update_single_user_setting(user_id, "use_dynamic_transcribe_language", False) # conversation ending, so stop using dynamic transcribe language
    db_handler.update_single_user_setting(user_id, "should_update_settings", True)
    return


async def handle_user_conversation(user_id, device_id, db_handler):
    print("CHECKING IF WE SHOULD RUN A CONTEXTUAL CONVO FOR USER: ", user_id)
    target_language = db_handler.get_user_settings_value(user_id, "target_language")
    locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)
    transcripts = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=transcript_period)

    # this block checks if the user is moving or talking, if so, it skips the conversation
    if len(locations) > 1:
        user_location = locations[-1]
        past_location = locations[-2]

        displacement = lat_lng_to_meters(lat1=past_location['lat'], lng1=past_location['lng'], lat2=user_location['lat'], lng2=user_location['lng'])
        delta_time = user_location['timestamp'] - past_location['timestamp']
        speed = displacement / delta_time if delta_time > 0 else 0

        current_wpm = len(transcripts[0].split(" ")) / (transcript_period / 60)
        print("Current user WPM is: ", current_wpm)
        print("Current user SPEED is: ", speed)

        if TESTING_LL_CONTEXT_CONVO_AGENT:
            warnings.warn("Currently in testing mode, skipping speed and trascription checks, please remove TESTING flag to run normally.")
        elif current_wpm > wpm_threshold: # compute words per minute
            print("User is talking, skipping", transcripts)
            await cleanup_conversation(user_id, db_handler)
            return
        elif speed < speed_threshold:
            #print("User is not moving, running anyway")
            print("User is not moving, skipping")
            await cleanup_conversation(user_id, db_handler)
            return
    else:
        print("Not enough locations, please wait")
        await cleanup_conversation(user_id, db_handler)
        return

    conversation_history = []

    # conversation starting, so change the user's transcribe language to the target language
    db_handler.update_single_user_setting(user_id, "dynamic_transcribe_language", target_language)
    db_handler.update_single_user_setting(user_id, "use_dynamic_transcribe_language", True)
    db_handler.update_single_user_setting(user_id, "is_having_language_learning_contextual_convo", True)
    db_handler.update_single_user_setting(user_id, "should_update_settings", True)

    # this block runs the contextual conversation agent until the conversation ends
    print("NOW RUNNING CONTEXTUAL CONVO FOR USER: ", user_id)
    while True:
        places = get_nearby_places(user_location)
        places = places[:min(len(places), 3)] #get max 3 nearby places
        print("LOOP ll contextual conversation")
        response = run_ll_context_convo_agent(places=places, target_language=target_language, fluency_level=35, conversation_history=conversation_history)

        if response:
            db_handler.add_ll_context_convo_results_for_user(
                user_id, response)
        else:
            await cleanup_conversation(user_id, db_handler)
            return

        conversation_history.append({"role": "agent", "content": response['ll_context_convo_response']})

        await asyncio.sleep(response_period)
        user_reponse = []
        new_response = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=response_period)

        start = time.time()
        # This block waits for the user to respond
        while new_response[0] or not user_reponse:
            if not user_reponse:
                if time.time() - start > break_convo_time_limit:
                    print("LL CONTEXT CONVO - No new user response and we passed the conversational break time, so exiting")
                    await cleanup_conversation(user_id, db_handler )
                    return

            if new_response[0]:
                print("NEW RESPONSE")
                user_reponse.append(new_response[0])
            else:
                print("NO NEW RESPONSE")
                if time.time() - start > 120:
                    break

            await asyncio.sleep(response_period)
            new_response = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=response_period)

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

    await cleanup_conversation(user_id, db_handler)
    return


async def ll_context_convo_agent_processing_loop_async():
    print("START CONTEXTUAL CONVO PROCESSING LOOP ASYNC")
    db_handler = DatabaseHandler(parent_handler=False)

    # Ensure we are using an async event loop
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()

    # wait for some transcripts to load in
    await asyncio.sleep(30)

    # This block initiates the contextual conversation agent for each active user
    while True:
        if not db_handler.ready:
            print("db_handler not ready")
            await asyncio.sleep(0.1)
            continue

        try:
            pLoopStartTime = time.time()
            # print("RUNNING CONTEXTUAL CONVO LOOP ASYNC")

            active_users = db_handler.get_active_users()
            tasks = []

            # start a conversation for each active user
            for user in active_users:
                if not db_handler.get_user_feature_enabled(user['user_id'], LL_CONTEXT_CONVO_AGENT): continue

                user_id = user['user_id']
                device_id = user['device_id']

                if db_handler.get_user_settings_value(user['user_id'], "is_having_language_learning_contextual_convo"):
                    print("Found ongoing conversation for user: ", user_id)
                    continue
                print("STARTING CONTEXTUAL CONVO FOR USER: ", user_id)

                tasks.append(handle_user_conversation(user_id, device_id, db_handler))

            if tasks:
                await asyncio.gather(*tasks)

        except Exception as e:
            print("Exception in CONTEXTUAL CONVO loop...:")
            print(e)
            traceback.print_exc()

        finally:
            pLoopEndTime = time.time()
            # print(f"=== CONTEXTUAL CONVO loop completed in {round(pLoopEndTime - pLoopStartTime, 2)} seconds overall ===")

        await asyncio.sleep(run_period)


def ll_context_convo_agent_processing_loop():
    asyncio.run(ll_context_convo_agent_processing_loop_async())
