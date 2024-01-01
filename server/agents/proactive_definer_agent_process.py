import time
import traceback
import asyncio
import uuid

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_definer_agent import run_proactive_definer_agent

def proactive_definer_processing_loop():
    print("START DEFINER PROCESSING LOOP")
    dbHandler = DatabaseHandler(parent_handler=False)

    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue
        
        #wait for some transcripts to load in
        time.sleep(15)

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            print("RUNNING DEFINER LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(n=25)

            for transcript in newTranscripts:
                if len(transcript['text']) < 80: # Around 20-30 words, like on a sentence level
                    print("Transcript too short, skipping...")
                    continue
                print("Run rare entity definition with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                entityDefinerStartTime = time.time()
              

                try:
                    # definition_history = dbHandler.get_definer_history_for_user(transcript['user_id'])
                    definition_history = dbHandler.get_recent_nminutes_definer_history_for_user(transcript['user_id'])

                    # run proactive meta agent, get definition
                    entities = run_proactive_definer_agent(transcript['text'], definitions_history=definition_history)
                    
                    if entities is not None:
                        entities = [entity for entity in entities if entity is not None]

                        #save entities to the DB for the user
                        print("Adding entities in proactive definer process:")
                        print(entities)
                        dbHandler.add_agent_proactive_definition_results_for_user(transcript['user_id'], entities)

                except Exception as e:
                    print("Exception in entity definer:")
                    print(e)
                    traceback.print_exc()
                    continue
                entityDefinerEndTime = time.time()
                print("=== definer loop completed in {} seconds ===".format(
                    round(entityDefinerEndTime - entityDefinerStartTime, 2)))
        except Exception as e:
            print("Exception in entity definer...:")
            print(e)
            traceback.print_exc()
        finally:
            #lock.release()
            pLoopEndTime = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(pLoopEndTime - pLoopStartTime, 2)))

        time.sleep(15)
