from collections import defaultdict
import time
import traceback
import math
import uuid
import asyncio
import logging

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_meta_agent import run_proactive_meta_agent_and_experts
from agents.expert_agent_configs import default_expert_agent_list
from logger_config import logger
from constants import PROACTIVE_AGENTS

time_between_iterations = 5
timelength_of_usable_transcripts = time_between_iterations * 8
min_words_to_run = 8

dbHandler = DatabaseHandler(parent_handler=False)

def is_transcript_long_enough(transcript: str):
    if len(transcript.split()) < min_words_to_run:
        if "?" not in transcript:
            return False
    return True

def start_proactive_agents_processing_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(proactive_agents_processing_loop())
    loop.close()

async def proactive_agents_processing_loop():
    print("START MULTI AGENT PROCESSING LOOP")

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

async def process_transcript(transcript: str):
    if not dbHandler.get_user_feature_enabled(transcript['user_id'], PROACTIVE_AGENTS): return

    # Check if transcripts are recent enough, TODO: this is inefficient
    if not dbHandler.get_transcripts_from_last_nseconds_for_user(transcript['user_id'], time_between_iterations + 1):
        return

    # Don't run if the transcript is too short
    if not is_transcript_long_enough(transcript['text']):
        print("[META] Transcript too short, skipping...")
        return

    # Don't run if in the middle of an explicit query
    if dbHandler.get_wake_word_time_for_user(transcript['user_id']) != -1:
        return
    
    transcript_to_use = transcript['text']
    
    # Filter out recent explicit queries
    explicit_history = dbHandler.get_recent_n_seconds_explicit_query_history_for_user(user_id=transcript['user_id'], n_seconds=timelength_of_usable_transcripts)
    for hist_item in explicit_history:
        transcript_to_use = transcript_to_use.replace(hist_item['query'], '')

    # Filter out recent proactive queries
    proactive_query_history = dbHandler.get_recent_n_seconds_agent_insights_query_history_for_user(user_id=transcript['user_id'], n_seconds=timelength_of_usable_transcripts)
    for hist_item in proactive_query_history:
        transcript_to_use = transcript_to_use.replace(hist_item['query'], '')

    if not is_transcript_long_enough(transcript_to_use):
        print("Transcript too short after removing explicit+proactive queries:\n'{}'\nSkipping...".format(transcript_to_use))
        return

    insightGenerationStartTime = time.time()

    try:
        # Get proactive insight history
        insights_history = dbHandler.get_recent_nminutes_agent_insights_history_for_user(transcript['user_id'], n_minutes=90)
        logger.log(level=logging.DEBUG, msg="Insights history: {}".format(insights_history))
        
        ### These agents have their own fast mini-gatekeepers ### 
        insights_history_dict = defaultdict(list)
        for insight in insights_history:
            insights_history_dict[insight["agent_name"]].append(
                insight["agent_insight"])

        agents_to_run_list = dbHandler.get_user_settings_value(transcript['user_id'], "enabled_proactive_agents")
        
        experts_to_run = [ea for ea in default_expert_agent_list if (ea.agent_name in agents_to_run_list)]

        # Run all the agents in parallel
        agents_to_run_tasks = [expert_agent.run_aio_agent_gatekeeper_async(transcript['user_id'], transcript_to_use, insights_history_dict[expert_agent.agent_name]) for expert_agent in experts_to_run]
        await asyncio.gather(*agents_to_run_tasks)

        if len(dbHandler.get_recent_n_seconds_agent_insights_query_history_for_user(user_id=transcript['user_id'], n_seconds=time_between_iterations)) < 2:
            # Run proactive meta agent, get insights
            meta_start_time = time.time()
            insights = run_proactive_meta_agent_and_experts(transcript_to_use, insights_history, transcript['user_id'])
            print("=== the PROACTIVE AGENT GENERATION META ended in {} seconds ===".format(round(time.time() - meta_start_time, 2)))

            if insights:
                print("insights: {}".format(insights))

            for insight in insights:
                if insight is None:
                    continue
                dbHandler.add_agent_insight_result_for_user(transcript['user_id'], insight["agent_name"], insight["agent_insight"], insight["reference_url"])
            # parse insights history into a dict of agent_name: [agent_insights] so expert agent won't repeat the same insights
        else:
            print("Proactive query history not empty, skipping meta agent...")


    except Exception as e:
        print("Exception in agent.run()...:")
        print(e)
        traceback.print_exc()
        return
    insightGenerationEndTime = time.time()
    print("=== insightGeneration completed in {} seconds ===".format(
        round(insightGenerationEndTime - insightGenerationStartTime, 2)))
