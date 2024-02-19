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
    time.sleep(5)
    
    while True:
        if not db_handler.ready:
            print("db_handler not ready")
            time.sleep(0.1)
            continue

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            print("RUNNING CONTEXTUAL CONVO LOOP")
            newTranscripts = db_handler.get_recent_transcripts_from_last_nseconds_for_all_users(
                n=run_period)

            questions = None
            user_ids = set()
            for transcript in newTranscripts:
                if user_ids.__contains__(transcript['user_id']):
                    continue

                user_ids.add(transcript['user_id'])
                ctime = time.time()
                location = db_handler.get_gps_location_results_for_user_device(transcript['user_id'], transcript['device_id'])
                places = get_nearby_places(location[0])
                questions = run_ll_context_convo_agent(places)
                print("QUESTIONS#########################")
                print(questions)
                loop_time = time.time() - ctime
                print(f"RAN LL CONTEXTUAL CONVO IN : {loop_time}")
                print(questions)

                if questions:
                    final_questions = list(filter(None, questions))
                    print("QUESTIONS TO ASK")
                    print(final_questions)
                    db_handler.add_ll_context_convo_results_for_user(
                        transcript['user_id'], final_questions)

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
