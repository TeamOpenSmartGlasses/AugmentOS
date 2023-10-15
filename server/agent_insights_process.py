import threading
from DatabaseHandler import DatabaseHandler
import time
import traceback
import multiprocessing
import os
import math
import uuid
import asyncio

from server_config import openai_api_key
from agent_configs import agent_config_list, agent_prompt_maker
from langchain.chat_models import ChatOpenAI
from langchain.agents.tools import Tool
from langchain.agents import initialize_agent
from langchain.agents import AgentType
from agent_tools import custom_search

llm = ChatOpenAI(temperature=0, openai_api_key=openai_api_key, model="gpt-4-0613")
agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
        ),
    ], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=3, early_stopping_method="generate", verbose=True)

async def agent_arun_wrapper(agent_config, test_transcript):
    return {
        "agent_name": agent_config["agent_name"],
        "agent_insight": await agent.arun(agent_prompt_maker(agent_config, test_transcript))
    } 

def agent_insights_processing_loop():
    print("START MULTI AGENT PROCESSING LOOP")
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
            print("RUNNING MULTI-AGENT LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(
                n=120)
            for transcript in newTranscripts:
                #DEV if len(transcript['text']) < 800: # Around 150-200 words, no point to generate insight below this
                if len(transcript['text']) < 20: # Around 150-200 words, no point to generate insight below this
                    print("Transcript too short, skipping...")
                    continue
                print("Run Insights generation with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                insightGenerationStartTime = time.time()
              
                try:
                    tasks = [agent_arun_wrapper(agent_config, transcript) for agent_config in agent_config_list]
                    insights_tasks = asyncio.gather(*tasks)
                    insights = loop.run_until_complete(insights_tasks)

                    print("insights: {}".format(insights))
                    # [{'agent_name': 'Statistician', 'agent_insight': "Insight: Brain's processing limit challenges full Wikipedia integration. Neuralink trials show promising BCI advancements."},
                    # {'agent_name': 'FactChecker', 'agent_insight': 'null'},
                    # {'agent_name': 'DevilsAdvocate', 'agent_insight': 'Insight: Is more information always beneficial, or could it lead to cognitive overload?'}]

                    for insight in insights:
                        #save this insight to the DB for the user
                        insight_obj = {}
                        insight_obj['timestamp'] = math.trunc(time.time())
                        insight_obj['uuid'] = str(uuid.uuid4())
                        insight_obj['agent_name'] = insight["agent_name"]
                        insight_obj['text'] = insight["agent_insight"]
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
