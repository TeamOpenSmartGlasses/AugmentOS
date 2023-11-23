import time
import traceback
import asyncio
import uuid

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_definer_agent import run_proactive_entity_definer

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
                    # definition_history = []
                    # print("definition_history: {}".format(definition_history))
                    # 

                    # run proactive meta agent, get definition
                    entities_res = run_proactive_entity_definer(transcript['text'], [])
                    if entities_res is None:
                        continue

                    entities = entities_res.entities
                    # print("entities: {}".format(entities))
                    
                    # Save results like CSE
                    results = []
                    for entity in entities:
                        if entity is None:
                            continue

                        # Follow this shape
                        # {'mid': '/m/04sv4', 'image_url': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCLC4S8YEmi62S2wg7iKSUh1G2iBHxExeS9NArjqG76lqQZo_V', 'name': 'Microsoft Corporation', 'category': 'Technology corporation', 'type': 'CORPORATION', 'summary': '\nTech giant with popular software and products.', 'url': 'https://en.wikipedia.org/wiki/Microsoft', 'timestamp': 1700719963, 'uuid': '17e300a2-5c60-4352-af56-54706f1a2923'}
                        res = {}
                        res['name'] = entity.entity
                        res['summary'] = entity.definition
                        res['timestamp'] = int(time.time())
                        res['uuid'] = str(uuid.uuid4())
                        results.append(res)
                        
                    #save entities to the DB for the user
                    dbHandler.add_cse_results_for_user(transcript['user_id'], results)

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
