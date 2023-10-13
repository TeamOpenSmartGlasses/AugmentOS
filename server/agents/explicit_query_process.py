import threading
from DatabaseHandler import DatabaseHandler
import time
import traceback
import multiprocessing
import os
import math
import uuid

from server_config import openai_api_key
from agents.the_people_in_your_head import *
from langchain.agents import initialize_agent
from langchain.tools import StructuredTool, Tool
from langchain.agents import AgentType
from langchain.chat_models import ChatOpenAI
from agents.agent_tools import scrape_page, custom_search
from agents.agent_prompts import generate_prompt, generate_master_prompt

# llm = ChatOpenAI(temperature=0, openai_api_key=openai_api_key, model="gpt-4-0613")

history = dict()

wake_terms = [
    "hey convoscope",
    "hey conboscope",
    "hey comboscope",
    "hey condoscope",
    "hey convo scope",
    "hello" #temporary
]

def get_query_from_transcript(transcript):
    for term in wake_terms:
        if term in transcript:
            # print("SHEEEEE")
            index = transcript.find(term) + len(term)
            return transcript[index:]
    return None

def stringify_history(chathistory):
    history = ""
    for c in chathistory:
        history += c + "\n\n"
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
        
        # time.sleep(10)

        try:
            # Check for new transcripts
            print("RUNNING EXPLICIT QUERY LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(
                n=5)
            for transcript in newTranscripts:
                print("Run EXPLICIT QUERY STUFF with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                user_id = transcript['user_id']

                if user_id not in history:
                    history[user_id] = []
                
                query = get_query_from_transcript(transcript['text'].lower())
                if query is None: 
                    # print("QQQQ QUERY ISS NONE $$$$$$QQQ")
                    continue

                print("YO! THE QUERY IS: " + query)

                insightGenerationStartTime = time.time()
                length = len(transcript['text'])
                new_chunk_length = int(length * 0.05)
                history = transcript['text'][:length-new_chunk_length]
                # history = stringify_history(history[user_id])
                # prompt = generate_prompt(f"<Old Transcript>{transcript['text'][:length-new_chunk_length]}<New Transcript>{transcript['text'][length-new_chunk_length:]}")
                mprompt = generate_master_prompt(history + " " + transcript['text'][length-new_chunk_length:])
                try:
                    insight = master_agent.run(mprompt)
                    insight = "Insight: Stuff is good and stuff that's right"
                    print(insight)
                    #save this insight to the DB for the user
                    # insight_obj = {}
                    # insight_obj['timestamp'] = math.trunc(time.time())
                    # insight_obj['uuid'] = str(uuid.uuid4())
                    # insight_obj['text'] = insight
                    # dbHandler.add_agent_insights_results_for_user(transcript['user_id'], [insight_obj])
                    print("running running and running running and running running")
                except Exception as e:
                    print("Exception in agent.run()...:")
                    print(e)
                    traceback.print_exc()
                    continue
                insightGenerationEndTime = time.time()
                print("=== insightGeneration completed in {} seconds ===".format(
                    round(insightGenerationEndTime - insightGenerationStartTime, 2)))
        except Exception as e:
            print("Exception in EXPLITT QUERY STUFF..:")
            print(e)
            traceback.print_exc()
        time.sleep(2)
