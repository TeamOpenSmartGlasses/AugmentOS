import time
import traceback
import math
import uuid
import asyncio

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_meta_agent import run_proactive_meta_agent_and_experts
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
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(n=240)
            for transcript in newTranscripts:
                if len(transcript['text']) < 400: # Around 75-100 words, no point to generate insight below this
                    print("Transcript too short, skipping...")
                    continue
                print("Run Insights generation with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                insightGenerationStartTime = time.time()
              
                # TODO: Test this quick n' dirty way of preventing proactive from running on explicit queries
                transcript_to_use = transcript['text']
                explicit_history = dbHandler.get_explicit_query_history_for_user(user_id=transcript['user_id'], device_id=None, should_consume=False, include_consumed=True)
                for hist_item in explicit_history:
                    transcript_to_use.replace(hist_item['query'], ' ... ')

                try:
                    insights_history = dbHandler.get_agent_insights_history_for_user(transcript['user_id'])
                    print("insights_history: {}".format(insights_history))
                    # [{'agent_name': 'Statistician', 'agent_insight': "Insight: Brain's processing limit challenges full Wikipedia integration. Neuralink trials show promising BCI advancements."}, ...]

                    #run proactive meta agent, get insights
                    insights = run_proactive_meta_agent_and_experts(transcript_to_use, insights_history)
                    print("insights: {}".format(insights))
                    # [{'agent_name': 'Statistician', 'agent_insight': "Insight: Brain's processing limit challenges full Wikipedia integration. Neuralink trials show promising BCI advancements."},
                    # {'agent_name': 'FactChecker', 'agent_insight': 'null'},
                    # {'agent_name': 'DevilsAdvocate', 'agent_insight': 'Insight: Is more information always beneficial, or could it lead to cognitive overload?'}]

                    for insight in insights:
                        if insight is None:
                            continue
                        #save this insight to the DB for the user
                        dbHandler.add_agent_insight_result_for_user(transcript['user_id'], insight["agent_name"], insight["agent_insight"], insight["reference_url"], insight["agent_motive"])

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

        time.sleep(15)
