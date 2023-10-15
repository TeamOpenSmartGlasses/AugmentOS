import threading
from DatabaseHandler import DatabaseHandler
import time
import traceback
import multiprocessing
import os
import math
import uuid
import asyncio

from server.agents.statistician_agent import init_statistician_agent, statistician_agent_prompt_wrapper
from server.agents.fact_checker_agent import init_fact_checker_agent, fact_checker_agent_prompt_wrapper
from server.agents.devils_advocate_agent import init_devils_advocate_agent, devils_advocate_agent_prompt_wrapper


def agent_insights_processing_loop():
    #lock = threading.Lock()

    dbHandler = DatabaseHandler(parent_handler=False)
    statistician_agent = init_statistician_agent()
    fact_checker_agent = init_fact_checker_agent()
    devils_advocate_agent = init_devils_advocate_agent()

    print("START AGENT INSIGHT PROCESSING LOOP")
    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue
        #lock.acquire()
        
        #wait for some transcripts to load in
        time.sleep(10)

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            print("RUNNING INSIGHTS AGENT LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(
                n=120)
            for transcript in newTranscripts:
                #DEV if len(transcript['text']) < 800: # Around 150-200 words, no point to generate insight below this
                if len(transcript['text']) < 2: # Around 150-200 words, no point to generate insight below this
                    print("Transcript too short, skipping...")
                    continue
                print("Run Insights generation with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                insightGenerationStartTime = time.time()
                length = len(transcript['text'])
                new_chunk_length = int(length * 0.05)
                agent_transcript = f"<Old Transcript>{transcript['text'][:length-new_chunk_length]}<New Transcript>{transcript['text'][length-new_chunk_length:]}"
                try:
                    tasks = [
                        statistician_agent.arun(statistician_agent_prompt_wrapper(agent_transcript)),
                        fact_checker_agent.arun(fact_checker_agent_prompt_wrapper(agent_transcript)),
                        devils_advocate_agent.arun(devils_advocate_agent_prompt_wrapper(agent_transcript))
                    ]
                    
                    # will refactor the agents into classes properly later, then we don't have this ugly agent_order code
                    agent_order = ["statistician", "devils_advocate", "fact_checker"]
                    insights = asyncio.run(asyncio.gather(*tasks))
                    for idx, insight in enumerate(insights):
                        #save this insight to the DB for the user
                        insight_obj = {}
                        insight_obj['timestamp'] = math.trunc(time.time())
                        insight_obj['uuid'] = str(uuid.uuid4())
                        insight_obj['agent'] = agent_order[idx]
                        insight_obj['text'] = insight
                        dbHandler.add_agent_insights_results_for_user(transcript['user_id'], [insight_obj])

                    #insight = "Insight: Stuff is good and stuff that's right"
                except Exception as e:
                    print("Exception in agent.run()...:")
                    print(e)
                    traceback.print_exc()
                    continue
                insightGenerationEndTime = time.time()
                print("=== insightGeneration completed in {} seconds ===".format(
                    round(insightGenerationEndTime - insightGenerationStartTime, 2)))
                insightGenerationStartTime = time.time()
                length = len(transcript['text'])
                new_chunk_length = int(length * 0.05)
                agent_transcript = f"<Old Transcript>{transcript['text'][:length-new_chunk_length]}<New Transcript>{transcript['text'][length-new_chunk_length:]}"
                try:
                    tasks = [
                        statistician_agent.arun(statistician_agent_prompt_wrapper(agent_transcript)),
                        fact_checker_agent.arun(fact_checker_agent_prompt_wrapper(agent_transcript)),
                        devils_advocate_agent.arun(devils_advocate_agent_prompt_wrapper(agent_transcript))
                    ]
                    
                    insights = await asyncio.gather(*tasks)
                   

                    #insight = "Insight: Stuff is good and stuff that's right"

                    #save this insight to the DB for the user
                    insight_obj = {}
                    insight_obj['timestamp'] = math.trunc(time.time())
                    insight_obj['uuid'] = str(uuid.uuid4())
                    insight_obj['text'] = insight
                    dbHandler.add_agent_insights_results_for_user(transcript['user_id'], [insight_obj])
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
        finally:
            #lock.release()
            pLoopEndTime = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(pLoopEndTime - pLoopStartTime, 2)))

        time.sleep(50)
