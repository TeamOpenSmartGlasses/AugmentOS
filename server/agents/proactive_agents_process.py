import time
import traceback
import math
import uuid
import asyncio
import logging

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_meta_agent import run_proactive_meta_agent_and_experts
from server_config import openai_api_key
from logger_config import logger
from constants import PROACTIVE_AGENTS

time_between_iterations = 5
timelength_of_usable_transcripts = time_between_iterations * 8
min_words_to_run = 8

def is_transcript_long_enough(transcript: str):
    if len(transcript.split()) < min_words_to_run:
        if "?" not in transcript:
            return False
    return True


def proactive_agents_processing_loop():
    print("START MULTI AGENT PROCESSING LOOP")
    dbHandler = DatabaseHandler(parent_handler=False)
    loop = asyncio.get_event_loop()

    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue
        
        #wait for some transcripts to load in
        time.sleep(time_between_iterations)

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            # print("RUNNING MULTI-AGENT LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(n=timelength_of_usable_transcripts)
            for transcript in newTranscripts:
                if not dbHandler.get_user_feature_enabled(transcript['user_id'], PROACTIVE_AGENTS): continue

                # Check if transcripts are recent enough, TODO: this is inefficient
                if not dbHandler.get_transcripts_from_last_nseconds_for_user(transcript['user_id'], time_between_iterations + 1):
                    continue

                # Don't run if the transcript is too short
                if not is_transcript_long_enough(transcript['text']):
                    print("Transcript too short, skipping...")
                    continue

                # Don't run if in the middle of an explicit query
                if dbHandler.get_wake_word_time_for_user(transcript['user_id']) != -1:
                    continue
              
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
                    continue

                insightGenerationStartTime = time.time()

                try:
                    # Get proactive insight history
                    insights_history = dbHandler.get_recent_nminutes_agent_insights_history_for_user(transcript['user_id'], n_minutes=90)
                    # print("insights_history: {}".format(insights_history))
                    logger.log(level=logging.DEBUG, msg="Insights history: {}".format(insights_history))

                    # Run proactive meta agent, get insights
                    insights = run_proactive_meta_agent_and_experts(transcript_to_use, insights_history, transcript['user_id'])
                    
                    if insights:
                        print("insights: {}".format(insights))

                    for insight in insights:
                        if insight is None:
                            continue
                        #save this insight to the DB for the user
                        dbHandler.add_agent_insight_result_for_user(transcript['user_id'], insight["agent_name"], insight["agent_insight"], insight["reference_url"])

                except Exception as e:
                    print("Exception in agent.run()...:")
                    print(e)
                    traceback.print_exc()
                    continue
                insightGenerationEndTime = time.time()
                print("=== insightGeneration completed in {} seconds ===".format(
                    round(insightGenerationEndTime - insightGenerationStartTime, 2)))
        except Exception as e:
            print("Exception in Insight generator...:")
            print(e)
            traceback.print_exc()
