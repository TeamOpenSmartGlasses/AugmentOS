import time
import traceback
import asyncio

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_definer_agent import run_proactive_entity_definer

def proactive_agents_processing_loop():
    print("START DEFINER PROCESSING LOOP")
    dbHandler = DatabaseHandler(parent_handler=False)
    loop = asyncio.get_event_loop()

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
                    definition_history = dbHandler.get_definer_history_for_user(transcript['user_id'])
                    print("definition_history: {}".format(definition_history))
                    # 

                    # run proactive meta agent, get definition
                    entities_res = run_proactive_entity_definer(transcript['text'], definition_history)
                    if entities_res is None:
                        continue

                    entities = entities_res.entities
                    print("entities: {}".format(entities))
                    # 

                    for entity in entities:
                        if entity is None:
                            continue
                        #save this entity to the DB for the user
                        dbHandler.add_entity_definition_result_for_user(transcript['user_id'], entity.entity, entity.definition)

                except Exception as e:
                    print("Exception in entity definer:")
                    print(e)
                    traceback.print_exc()
                    continue
                entityDefinerEndTime = time.time()
                print("=== entityDefiner completed in {} seconds ===".format(
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
