from DatabaseHandler import DatabaseHandler
import time
import traceback
from agents.wake_words import *
from agents.explicit_meta_agent import run_explicit_meta_agent, run_explicit_meta_agent_async, explicit_meta_agent_prompt_blueprint
import asyncio

dbHandler = DatabaseHandler(parent_handler=False)

pause_query_time = 8
force_query_time = 16

def stringify_history(insight_history):
    history = ""
    for c in insight_history:
        history += "User: {}\nLLM:{}\n\n".format(c['query'], c['insight'])
    return history

def explicit_agent_processing_loop():
    #lock = threading.Lock()

    print("START AGENT INSIGHT PROCESSING LOOP")
    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue

        try:
            users = dbHandler.get_users_with_recent_wake_words()
            for user in users:
                last_wake_word_time = user['last_wake_word_time']

                is_query_ready = False
                current_time = time.time()

                # If wake word is old, just run on what we have
                if current_time > last_wake_word_time + force_query_time:
                    is_query_ready = True

                # If there has been a pause (the latest transcript is old)
                latest_transcript = dbHandler.get_latest_transcript_from_user_obj(user)
                if latest_transcript and (current_time > latest_transcript['timestamp'] + pause_query_time):
                    is_query_ready = True

                if not is_query_ready: continue
                
                dbHandler.reset_wake_word_time_for_user(user['user_id'])

                # Because last_wake_word_time is set when the wake word is found, and NOT when the wake word actually occured,
                # we need to add a high number such as force_query_time to offset that inaccuracy
                num_seconds_to_get = round(current_time - last_wake_word_time) + force_query_time
                text = dbHandler.get_transcripts_from_last_nseconds_for_user_as_string(user_id=user['user_id'], n=num_seconds_to_get)#, transcript_list=user['final_transcripts'])

                # Pull query out of the text
                query = get_explicit_query_from_transcript(text)
                if query is None: 
                    print("THE QUERY IS NOTHING?!?! TEXT: " + text)
                    continue
                
                asyncio.run(call_explicit_agent(user, query))

        except Exception as e:
            print("Exception in EXPLITT QUERY STUFF..:")
            print(e)
            traceback.print_exc()
        time.sleep(0.2)

async def call_explicit_agent(user_obj, query):
    user = user_obj

    print("Run EXPLICIT QUERY STUFF with... user_id: '{}' ... text: '{}'".format(
        user['user_id'], query))
    
    query_uuid = dbHandler.add_explicit_query_for_user(user['user_id'], query)

    # Set up prompt for Meta Agent
    insight_history = dbHandler.get_explicit_insights_history_for_user(user['user_id'], device_id=None, should_consume=False, include_consumed=True)
    chat_history = stringify_history(insight_history)
    
    insightGenerationStartTime = time.time()
    try:
        print(" RUN THE INSIGHT FOR EXPLICIT ")
        insight = await run_explicit_meta_agent_async(chat_history, query)
        
        print("========== 200 IQ INSIGHT ===========")
        print(insight)
        print("=====================================")
        
        #save this insight to the DB for the user
        dbHandler.add_explicit_insight_result_for_user(user['user_id'], query, insight)
    except Exception as e:
        print("Exception in agent.run()...:")
        print(e)
        traceback.print_exc()
        dbHandler.reset_wake_word_time_for_user(user['user_id'])

    dbHandler.reset_wake_word_time_for_user(user['user_id'])

    insightGenerationEndTime = time.time()
    print("=== insightGeneration completed in {} seconds ===".format(
        round(insightGenerationEndTime - insightGenerationStartTime, 2)))
