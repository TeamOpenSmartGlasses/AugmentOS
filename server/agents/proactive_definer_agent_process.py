import time
import traceback
import asyncio
import uuid

#custom
from DatabaseHandler import DatabaseHandler
from agents.proactive_definer_agent import run_proactive_definer_agent

def proactive_definer_processing_loop():
    print("START DEFINER PROCESSING LOOP")
    dbHandler = DatabaseHandler(parent_handler=False)

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
            print("RUNNING DEFINER LOOP")
            newTranscripts = dbHandler.get_recent_transcripts_from_last_nseconds_for_all_users(n=25)

            if len(newTranscripts) > 0:
                newTranscripts[0]["text"] = """That's just for starters. You could break Bitcoin and every other cryptocurrency, or, you know, mine as much Bitcoin as you wanted, right? You know, become a super duper billionaire, right? And then plot your next move. Right. That's just for starters. That's a good point. Now, your next move might be something like, you know, you now have, like, a theoretically, optimal way to train any neural network, to find parameters for any neural network, right? So you could now say, like, is there any small neural network that generates the entire content of Wikipedia, right? If, you know, and now the question is not, can you find it? The question has been reduced to, does that exist or not? If it does exist, then the answer would be,, yes, you can find it, okay? If you had this algorithm in your hands, okay? You could ask your computer, you know, I mean, P versus NP is one of these seven problems that carries this million dollar prize from the Clay Foundation. You know, if you solve it, you know, and others are the Riemann hypothesis, the Poincare conjecture, which was solved,, although the solver turned down the prize, right, and four others. But what I like to say, the way that we can see that P versus NP is the biggest of all of these questions is that if you had this fast algorithm, then you could solve all seven of them, okay? You just ask your computer, you know, is there a short proof of the Riemann hypothesis, right? You know, that a machine could, in a language where a machine could verify it,
    and provided that such a proof exists, then your computer finds it in a short amount of time without having to do a brute force search, okay? So, I mean, those are the stakes of what we're talking about. But I hope that also helps to give your listeners some intuition of why I and most of my colleagues would put our money on P not equaling NP. Is it possible, I apologize this is a really dumb question, but is it possible to,"""

            for transcript in newTranscripts:
                if len(transcript['text']) < 80: # Around 20-30 words, like on a sentence level
                    print("Transcript too short, skipping...")
                    continue
                print("Run rare entity definition with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                entityDefinerStartTime = time.time()
              

                try:
                    definition_history = dbHandler.get_definer_history_for_user(transcript['user_id'])
                    definition_history = []
                    print("definition_history: {}".format(definition_history))

                    # run proactive meta agent, get definition
                    entities = run_proactive_definer_agent(transcript['text'], definitions_history=definition_history)
                    
                    if entities is not None:
                        print("entities: {}".format(entities))
                        
                        #save entities to the DB for the user
                        dbHandler.add_agent_proactive_definition_results_for_user(transcript['user_id'], entities)

                except Exception as e:
                    print("Exception in entity definer:")
                    print(e)
                    traceback.print_exc()
                    continue
                entityDefinerEndTime = time.time()
                print("=== entityDefiner completed in {} seconds ===".format(
                    round(entityDefinerEndTime - entityDefinerStartTime, 2)))
        except Exception as e:
            print("Exception in entity definer...:")
            print(e)
            traceback.print_exc()
        finally:
            #lock.release()
            pLoopEndTime = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(pLoopEndTime - pLoopStartTime, 2)))

        time.sleep(15)
