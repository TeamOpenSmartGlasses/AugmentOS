import time
import traceback
import asyncio
import uuid
import logging

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_definer_agent import run_proactive_definer_agent
from logger_config import logger

from definer_stats.stat_tracker import *

from constants import DEFINER_AGENT

time_between_iterations = 5
timelength_of_usable_transcripts = time_between_iterations * 3

dbHandler = DatabaseHandler(parent_handler=False)

def start_proactive_definer_processing_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(proactive_definer_processing_loop())
    loop.close()

async def proactive_definer_processing_loop():
    print("START DEFINER PROCESSING LOOP")

    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            await time.sleep(0.1)
            continue
        
        #wait for some transcripts to load in
        await asyncio.sleep(time_between_iterations)

        try:
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(n=timelength_of_usable_transcripts)
            tasks = [process_transcript(transcript) for transcript in newTranscripts]
            await asyncio.gather(*tasks)
                
        except Exception as e:
            print("Exception in Insight generator...:")
            print(e)
            traceback.print_exc()

async def process_transcript(transcript):
    if not dbHandler.get_user_feature_enabled(transcript['user_id'], DEFINER_AGENT): return

    if len(transcript['text']) < 40: #80: # Around 20-30 words, like on a sentence level
        print("[DEFINER] Transcript too short, skipping...")
        return
    # print("Run rare entity definition with... user_id: '{}' ... text: '{}'".format(
    #     transcript['user_id'], transcript['text']))
    entityDefinerStartTime = time.time()

    try:
        # definition_history = dbHandler.get_definer_history_for_user(transcript['user_id'])
        definition_history = dbHandler.get_recent_nminutes_definer_history_for_user(transcript['user_id'], n_minutes=90)

        # logger.log(level=logging.DEBUG, msg="Runnin proactive definer with Definer history: {}".format(
        #     definition_history))

        # run proactive meta agent, get definition
        startt = time.time()
        entities = await run_proactive_definer_agent(transcript['user_id'], dbHandler, transcript['text'], definitions_history=definition_history)
        endt = time.time()
        if entities:
            print("ENTITIES = " + str(len(entities)))
            print("TIME TAKEN = " + str(endt - startt) + " SECONDS!!!")
            track_time_average(endt-startt)
        
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
        return
    entityDefinerEndTime = time.time()

