import time
import traceback
import asyncio

# custom
from DatabaseHandler import DatabaseHandler
from agents.question_asker_agent import run_question_asker_agent
from agents.helpers.get_nearby_places import get_user_location, get_nearby_places

run_period = 30


def question_asker_agents_processing_loop():
    print("START QUESTION ASKER PROCESSING LOOP")
    dbHandler = DatabaseHandler(parent_handler=False)
    loop = asyncio.get_event_loop()

    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue

        # wait for some transcripts to load in
        time.sleep(1)

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            print("RUNNING QUESTION ASKER LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(
                n=run_period)

            questions = None
            for transcript in newTranscripts:
                if transcript['text']:
                    print(transcript)
                    continue

                ctime = time.time()
                # TODO - remove this line and get location from user's device
                location = get_user_location()
                places = get_nearby_places(location)
                questions = run_question_asker_agent(places)
                loop_time = time.time() - ctime
                print(f"RAN LL IN : {loop_time}")
                print(questions)

                if questions:
                    final_questions = list(filter(None, questions))
                    print("QUESTIONS TO ASK")
                    print(final_questions)
                    dbHandler.add_language_learning_questions_for_user(
                        transcript['user_id'], final_questions)

        except Exception as e:
            print("Exception in Question Asker loop...:")
            print(e)
            traceback.print_exc()

        finally:
            # lock.release()
            pLoopEndTime = time.time()
            print("=== Question Asker loop completed in {} seconds overall ===".format(
                round(pLoopEndTime - pLoopStartTime, 2)))

        time.sleep(run_period)
