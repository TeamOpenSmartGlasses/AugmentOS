from DatabaseHandler import DatabaseHandler
import time
import traceback
from agents.wake_words import *
from agents.explicit_meta_agent import run_explicit_meta_agent, explicit_meta_agent_prompt_blueprint

pause_query_time = 4
force_query_time = 8

def stringify_history(insight_history):
    history = ""
    for c in insight_history:
        history += "User: {}\nLLM:{}\n\n".format(c['query'], c['insight'])
    return history

def explicit_query_processing_loop():
    #lock = threading.Lock()
    dbHandler = DatabaseHandler(parent_handler=False)

    print("START AGENT INSIGHT PROCESSING LOOP")
    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue

        try:
            users = dbHandler.get_users_with_recent_wake_words()    
            for user in users:
                is_query_ready = False
                current_time = time.time()

                # If wake word is old, just run on what we have
                if current_time > user['last_wake_word_time'] + force_query_time:
                    is_query_ready = True

                # If there has been a pause
                elif current_time > user['final_transcripts'][-1]['timestamp'] + pause_query_time:
                    is_query_ready = True

                if not is_query_ready: continue

                num_seconds_to_get = round(current_time - user['last_wake_word_time']) + 1
                text = dbHandler.get_transcripts_from_last_nseconds_for_user_as_string(user_id=user['user_id'], n=num_seconds_to_get, transcript_list=user['final_transcripts'])

                # Pull query out of the text
                query = get_explicit_query_from_transcript(text)
                if query is None: 
                    print("THE QUERY IS NOTHING!!!!")
                    continue

                print("Run EXPLICIT QUERY STUFF with... user_id: '{}' ... text: '{}'".format(
                    user['user_id'], query))
                
                query_uuid = dbHandler.add_explicit_query_for_user(user['user_id'], query)
                
                # Set up prompt for Meta Agent
                insight_history = dbHandler.get_explicit_insights_history_for_user(user['user_id'])
                chat_history = stringify_history(insight_history)
                
                insightGenerationStartTime = time.time()
                try:
                    print(" RUN THE INSIGHT FOR EXPLICIT ")
                    insight = run_explicit_meta_agent(chat_history, query)
                    
                    print("===========200 IQ INSIGHT============")
                    print(insight)
                    print("=====================================")
                    
                    #save this insight to the DB for the user
                    dbHandler.add_explicit_insight_result_for_user(user['user_id'], query, insight)
                except Exception as e:
                    print("Exception in agent.run()...:")
                    print(e)
                    traceback.print_exc()
                    dbHandler.reset_wake_word_time_for_user(user['user_id'])
                    continue

                dbHandler.reset_wake_word_time_for_user(user['user_id'])

                insightGenerationEndTime = time.time()
                print("=== insightGeneration completed in {} seconds ===".format(
                    round(insightGenerationEndTime - insightGenerationStartTime, 2)))
        except Exception as e:
            print("Exception in EXPLITT QUERY STUFF..:")
            print(e)
            traceback.print_exc()
        time.sleep(2)
