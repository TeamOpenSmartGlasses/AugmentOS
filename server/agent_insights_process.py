import threading
from DatabaseHandler import DatabaseHandler
import time
import traceback
import multiprocessing
import os

dbHandler = DatabaseHandler()

from langchain.agents import initialize_agent
from langchain.tools import StructuredTool, Tool
from langchain.agents import AgentType
from langchain.chat_models import ChatOpenAI
from agent_tools import scrape_page, custom_search
from agent_insights_prompts import generate_prompt

llm = ChatOpenAI(temperature=0, openai_api_key=os.environ['OPENAI_API_KEY'], model="gpt-4-0613")

agent = initialize_agent([
    Tool(
        name="Search_Engine",
        func=custom_search,
        description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
    ),
    StructuredTool.from_function(scrape_page)
], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def processing_loop():
    lock = threading.Lock()
    print("START PROCESSING LOOP")
    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue
        lock.acquire()

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            newTranscripts = dbHandler.getRecentTranscriptsFromLastNSecondsForAllUsers(
                n=120)
            for transcript in newTranscripts:
                if len(transcript['text']) < 800: # Around 150-200 words, no point to generate insight below this
                    print("Transcript too short, skipping...")
                    continue
                print("Run Insights generation with... userId: '{}' ... text: '{}'".format(
                    transcript['userId'], transcript['text']))
                insightGenerationStartTime = time.time()
                length = len(transcript['text'])
                new_chunk_length = int(length * 0.05)
                insight = agent.run(generate_prompt(f"<Old Transcript>{transcript['text'][:length-new_chunk_length]}<New Transcript>{transcript['text'][length-new_chunk_length:]}"))
                insightGenerationEndTime = time.time()
                print("=== insightGeneration completed in {} seconds ===".format(
                    round(insightGenerationEndTime - insightGenerationStartTime, 2)))
                print(insight)
        except Exception as e:
            print("Exception in Insight generator...:")
            print(e)
            traceback.print_exc()
        finally:
            lock.release()
            pLoopEndTime = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(pLoopEndTime - pLoopStartTime, 2)))
        time.sleep(120)

background_process = multiprocessing.Process(target=processing_loop)
background_process.start()
background_process.join()