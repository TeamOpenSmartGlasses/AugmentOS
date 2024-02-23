import time
import traceback
import asyncio

# custom
from DatabaseHandler import DatabaseHandler
from agents.ll_context_convo_agent import run_ll_context_convo_agent
from agents.helpers.get_nearby_places import get_user_location, get_nearby_places

run_period = 15


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
                
                user_ids.add(user_id)
                ctime = time.time()
                target_language = db_handler.get_user_option_value(user_id, "target_language")
                locations = db_handler.get_gps_location_results_for_user_device(user_id, device_id)
                transcripts = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n=60)

                if len(locations) > 1:
                    user_location = locations[-1]
                    past_location = locations[-2]
                    if abs(user_location['lat'] - past_location['lat']) < 2e-05 and (user_location['lng'] - past_location['lng']) < 1e-05:
                        print("User is not moving, skipping")
                        continue
                    elif transcripts[0]:
                        print("User is talking, skipping", transcripts)
                        continue
                else:
                    print("Not enough locations, please wait", locations)
                    continue

                places = get_nearby_places(user_location)

                if not places:
                    print("NO PLACES FOUND")
                    continue

                response = run_ll_context_convo_agent(places=places, target_language=target_language, fluency_level=35)

                # print("QUESTIONS#########################")
                loop_time = time.time() - ctime
                print(f"RAN LL CONTEXTUAL CONVO IN : {loop_time}")
                # print(response)

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
