import threading
from DatabaseHandler import DatabaseHandler
import time
import traceback
import multiprocessing
import os
import math
import uuid

from server_config import openai_api_key

from langchain.agents import initialize_agent
from langchain.tools import StructuredTool, Tool
from langchain.agents import AgentType
from langchain.chat_models import ChatOpenAI
from agent_tools import scrape_page, custom_search
from agent_insights_prompts import generate_prompt

llm = ChatOpenAI(temperature=0, openai_api_key=openai_api_key, model="gpt-4-0613")

agent = initialize_agent([
    Tool(
        name="Search_Engine",
        func=custom_search,
        description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
    ),
    #StructuredTool.from_function(scrape_page)
], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def agent_insights_processing_loop():
    #lock = threading.Lock()

    dbHandler = DatabaseHandler(parent_handler=False)

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
                try:
                    insight = agent.run(generate_prompt(f"<Old Transcript>{transcript['text'][:length-new_chunk_length]}<New Transcript>{transcript['text'][length-new_chunk_length:]}"))
                    #insight = "Insight: Stuff is good and stuff that's right"
                    print(insight)
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
