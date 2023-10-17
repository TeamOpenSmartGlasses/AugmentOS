import time
import math
import uuid
import asyncio

#custom
from DatabaseHandler import DatabaseHandler
from agents.expert_agent_configs import expert_agent_config_list, expert_agent_prompt_maker
from agents.search_tool_for_agents import get_search_tool_for_agents
from server_config import openai_api_key

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
                    #loop through all expert agents and run them all
                    agent_list = list(expert_agent_config_list.values())
                    tasks = [agent_arun_wrapper(expert_agent_config, transcript) for expert_agent_config in expert_agent_list]
                    insights_tasks = asyncio.gather(*tasks)
                    insights = loop.run_until_complete(insights_tasks)

                    print("insights: {}".format(insights))
                    #cut off the prompts first "Insight: " words
                    for insight in insights:
                        insight["agent_insight"] = insight["agent_insight"][len("Insight:"):]
                    # [{'agent_name': 'Statistician', 'agent_insight': "Insight: Brain's processing limit challenges full Wikipedia integration. Neuralink trials show promising BCI advancements."},
                    # {'agent_name': 'FactChecker', 'agent_insight': 'null'},
                    # {'agent_name': 'DevilsAdvocate', 'agent_insight': 'Insight: Is more information always beneficial, or could it lead to cognitive overload?'}]

                    for insight in insights:
                        #save this insight to the DB for the user
                        insight_obj = {}
                        insight_obj['timestamp'] = math.trunc(time.time())
                        insight_obj['uuid'] = str(uuid.uuid4())
                        insight_obj['agent_name'] = insight["agent_name"]
                        insight_obj['agent_insight'] = insight["agent_insight"]
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
