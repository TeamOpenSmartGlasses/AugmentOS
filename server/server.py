from aiohttp import web
import asyncio
import math
import uuid
from aiohttp.web_response import Response
from pathlib import Path
import json
import time
import traceback
import pandas as pd

# multiprocessing
import multiprocessing
import logging
import logging.handlers
from concurrent.futures import ThreadPoolExecutor

# CORS
import aiohttp_cors
from aiohttp import web, web_exceptions

#Convoscope
from server_config import server_port
from constants import USE_GPU_FOR_INFERENCING, IMAGE_PATH
from ContextualSearchEngine import ContextualSearchEngine
from DatabaseHandler import DatabaseHandler
from agents.proactive_agents_process import proactive_agents_processing_loop
from agents.expert_agents import run_single_expert_agent, arun_single_expert_agent
from agents.explicit_agent_process import explicit_agent_processing_loop, call_explicit_agent
import agents.wake_words
from Modules.RelevanceFilter import RelevanceFilter

global agent_executor
global db_handler
global relevance_filter
global app

#handle new transcripts coming in
async def chat_handler(request):
    start_time = time.time()

    body = await request.json()
    is_final = body.get('isFinal')
    text = body.get('text')
    timestamp = time.time() # Never use client's timestamp ### body.get('timestamp')
    user_id = body.get('userId')

    # 400 if missing params
    if text is None or text == '':
        print("Text none in chat_handler, exiting with error response 400.")
        return web.Response(text='no text in request', status=400)
    if timestamp is None or timestamp == '':
        print("Timestamp none in chat_handler, exiting with error response 400.")
        return web.Response(text='no timestamp in request', status=400)
    if user_id is None or user_id == '':
        print("user_id none in chat_handler, exiting with error response 400.")
        return web.Response(text='no user_id in request', status=400)

    # print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format(
    #     "FINAL" if is_final else "INTERMEDIATE", text, timestamp, user_id))
    if is_final and False:
        print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format("FINAL", text, timestamp, user_id))
    start_save_db_time = time.time()
    db_handler.save_transcript_for_user(user_id=user_id, text=text, timestamp=timestamp, is_final=is_final)
    end_save_db_time = time.time()
    # print("=== CHAT_HANDLER's save DB done in {} SECONDS ===".format(
    #    round(end_save_db_time - start_save_db_time, 2)))

    end_time = time.time()
    # print("=== CHAT_HANDLER COMPLETED IN {} SECONDS ===".format(
    #    round(end_time - start_time, 2)))
    return web.Response(text=json.dumps({'success': True, 'message': ""}), status=200)


# runs when button is pressed on frontend - right now button ring on wearable or button in TPA
async def button_handler(request):
    body = await request.json()
    button_num = body.get('buttonNum')
    button_activity = body.get('buttonActivity')
    timestamp = body.get('timestamp')
    user_id = body.get('userId')
    print('\n=== New Request ===\n', button_num,
          button_activity, timestamp, user_id)

    # 400 if missing params
    if button_num is None or button_num == '':
        return web.Response(text='no button_num in request', status=400)
    if button_activity is None or button_activity == '':
        return web.Response(text='no button_activity in request', status=400)
    if timestamp is None or timestamp == '':
        return web.Response(text='no timestamp in request', status=400)
    if user_id is None or user_id == '':
        return web.Response(text='no user_id in request', status=400)

    if button_activity:  # True if push down, false if button release
        print("button True")
        return web.Response(text=json.dumps({'message': "button up activity detected"}), status=200)
    else:
        return web.Response(text=json.dumps({'message': "button up activity detected"}), status=200)


# run cse/definer tools for subscribed users in background every n ms if there is fresh data to run on
def cse_loop():
    print("START CSE PROCESSING LOOP")

    # setup things we need for processing
    db_handler = DatabaseHandler(parent_handler=False)
    relevance_filter = RelevanceFilter(db_handler=db_handler)
    cse = ContextualSearchEngine(db_handler=db_handler)

    #then run the main loop
    while True:
        if not db_handler.ready:
            print("db_handler not ready")
            time.sleep(0.1)
            continue

        loop_start_time = time.time()
        p_loop_start_time = time.time()

        try:
            p_loop_start_time = time.time()

            # Check for new transcripts
            new_transcripts = db_handler.get_new_cse_transcripts_for_all_users(
                combine_transcripts=True, delete_after=False)

            if new_transcripts is None or new_transcripts == []:
                print("---------- No transcripts to run on for this cse_loop run...")

            for transcript in new_transcripts:   
                print("Run CSE with... user_id: '{}' ... text: '{}'".format(
                    transcript['user_id'], transcript['text']))
                cse_start_time = time.time()

                cse_responses = cse.contextual_search_engine(
                    transcript['user_id'], transcript['text'])

                cse_end_time = time.time()
                # print("=== CSE completed in {} seconds ===".format(
                #     round(cse_end_time - cse_start_time, 2)))

                #filter responses with relevance filter, then save CSE results to the database
                cse_responses_filtered = list()
                if cse_responses:
                    cse_responses_filtered = relevance_filter.should_display_result_based_on_context(
                        transcript["user_id"], cse_responses, transcript["text"]
                    )

                    final_cse_responses = [cse_response for cse_response in cse_responses if cse_response["name"] in cse_responses_filtered]
                    # print("=== CSE RESPONSES FILTERED: {} ===".format(final_cse_responses))

                    db_handler.add_cse_results_for_user(
                        transcript["user_id"], final_cse_responses
                    )
        except Exception as e:
            cse_responses = None
            print("Exception in CSE...:")
            print(e)
            traceback.print_exc()
        finally:
            p_loop_end_time = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(p_loop_end_time - p_loop_start_time, 2)))

        loop_run_period = 1.5 #run the loop this often
        while (time.time() - loop_start_time) < loop_run_period: #wait until loop_run_period has passed before running this again
            time.sleep(0.2)


#frontends poll this to get the results from our processing of their transcripts
async def ui_poll_handler(request, minutes=0.5):
    # parse request
    body = await request.json()
    user_id = body.get('userId')
    device_id = body.get('deviceId')
    features = body.get('features')

    # 400 if missing params
    if user_id is None or user_id == '':
        return web.Response(text='no user_id in request', status=400)
    if device_id is None or device_id == '':
        return web.Response(text='no device_id in request', status=400)
    if features is None or features == '':
        return web.Response(text='no features in request', status=400)
    if "contextual_search_engine" not in features:
        return web.Response(text='contextual_search_engine not in features', status=400)

    resp = dict()
    resp["success"] = True

    # get CSE results
    if "contextual_search_engine" in features:
        cse_results = db_handler.get_cse_results_for_user_device(
            user_id=user_id, device_id=device_id)

        if cse_results:
            print("server.py ================================= CSERESULT")
            print(cse_results)

        # add CSE response
        resp["result"] = cse_results

    # get agent results
    if "proactive_agent_insights" in features:
        agent_insight_results = db_handler.get_proactive_agents_insights_results_for_user_device(user_id=user_id, device_id=device_id)

        #add agents insight to response
        resp["results_proactive_agent_insights"] = agent_insight_results

    # get user queries and agent responses
    if "explicit_agent_insights" in features:
        explicit_insight_queries = db_handler.get_explicit_query_history_for_user(user_id=user_id, device_id=device_id)
        explicit_insight_results = db_handler.get_explicit_insights_history_for_user(user_id=user_id, device_id=device_id)
        wake_word_time = db_handler.get_wake_word_time_for_user(user_id=user_id)
        resp["explicit_insight_queries"] = explicit_insight_queries
        resp["explicit_insight_results"] = explicit_insight_results
        resp["wake_word_time"] = wake_word_time

    return web.Response(text=json.dumps(resp), status=200)


#return images that we generated and gave frontends a URL for
async def return_image_handler(request):
    requested_img = request.rel_url.query['img']
    img_path = Path(IMAGE_PATH).joinpath(requested_img)
    try:
        data = img_path.read_bytes()
    except:
        print("Error reading requested image: " + requested_img)
        data = Path('images/404-2.jpg').read_bytes()
    return Response(body=data, content_type="image/jpg")


# frontend can upload CSVs to run custom data search on
# DEV: we don't use this and it's not exposed on the frontend as it's currently broken and low priority
async def upload_user_data_handler(request):
    # Check file size before doing anything else
    try:
        post_data = await request.post()
    except web_exceptions.HTTPRequestEntityTooLarge:
        return web.Response(text="File too large. Max file size: {}MB".format(MAX_FILE_SIZE_MB), status=413)

    user_file = post_data.get('custom-file')
    user_id = post_data.get('user_id')

    if user_file and user_id:
        # Check if the file is a CSV file by looking at its content type
        if user_file.content_type != 'text/csv':
            return web.Response(text="Uploaded file is not a CSV", status=400)

        # Validate data
        try:
            df = pd.read_csv(user_file.file)
        except Exception:
            return web.Response(text="Could not read CSV", status=400)

        #if not cse.is_custom_data_valid(df):
            #return web.Response(text="Bad data format", status=400)
#
        #cse.upload_custom_user_data(user_id, df)

        return web.Response(text="Custom data uploaded successfully", status=200)
    else:
        return web.Response(text="Missing user file or user ID in the received data", status=400)

async def expert_agent_runner(expert_agent_name, user_id):
    print("Starting agent run task of agent {} for user {}".format(expert_agent_name, user_id))
    #get the context for the last n minutes
    n_seconds = 5*60
    convo_context = db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, n_seconds)

    #get the most recent insights for this user
    insights_history = db_handler.get_agent_insights_history_for_user(user_id)
    insights_history = [insight["insight"] for insight in insights_history if insight["agent_name"] == expert_agent_name]

    #spin up the agent
    agent_insight = await arun_single_expert_agent(expert_agent_name, convo_context, insights_history)

    #save this insight to the DB for the user
    if agent_insight != None and agent_insight["agent_insight"] != None:
        db_handler.add_agent_insight_result_for_user(user_id, agent_insight["agent_name"], agent_insight["agent_insight"], agent_insight["reference_url"], agent_insight["agent_motive"])

    #agent run complete
    print("--- Done agent run task of agent {} from user {}".format(expert_agent_name, user_id))

#run a single agent with no extra context
async def run_single_expert_agent_handler(request):
    body = await request.json()
    timestamp = time.time() # Never use client's timestamp ### body.get('timestamp')
    user_id = body.get('userId')
    agent_name = body.get('agentName')

    # 400 if missing params
    if timestamp is None or timestamp == '':
        print("Timestamp none in send_agent_chat, exiting with error response 400.")
        return web.Response(text='no timestamp in request', status=400)
    if user_id is None or user_id == '':
        print("user_id none in send_agent_chat, exiting with error response 400.")
        return web.Response(text='no user_id in request', status=400)

    print("Got single agent request for agent: {}".format(agent_name))

    #spin up agent
    asyncio.ensure_future(expert_agent_runner(agent_name, user_id))
    #loop = asyncio.get_event_loop()
    #loop.create_task(expert_agent_runner(agent_name, user_id))  # Non-blocking
    #loop.run_in_executor(executor, run_single_agent)

    print("Spun up agent, now returning.")

    return web.Response(text=json.dumps({'success': True, 'message': "Running agent: {}".format(agent_name)}), status=200)


#receive a chat message manually typed in the agent chat box
async def send_agent_chat_handler(request):
    body = await request.json()
    timestamp = time.time() # Never use client's timestamp ### body.get('timestamp')
    user_id = body.get('userId')
    chat_message = body.get('chatMessage')

    # 400 if missing params
    if timestamp is None or timestamp == '':
        print("Timestamp none in send_agent_chat, exiting with error response 400.")
        return web.Response(text='no timestamp in request', status=400)
    if user_id is None or user_id == '':
        print("user_id none in send_agent_chat, exiting with error response 400.")
        return web.Response(text='no user_id in request', status=400)
    if chat_message is None or chat_message == '':
        print("chatMessage none in send_agent_chat, exiting with error response 400.")
        return web.Response(text='no chatMessage in request', status=400)

    # skip into proc loop
    print("SEND AGENT CHAT FOR USER_ID: " + user_id)
    user = db_handler.get_user(user_id)
    await call_explicit_agent(user, chat_message)

    return web.Response(text=json.dumps({'success': True, 'message': "Got your message: {}".format(chat_message)}), status=200)


if __name__ == '__main__':
    print("Starting server...")
    agent_executor = ThreadPoolExecutor()
    db_handler = DatabaseHandler()
    # start proccessing loop subprocess to process data as it comes in
    if USE_GPU_FOR_INFERENCING:
        multiprocessing.set_start_method('spawn')

    # log_queue = multiprocessing.Queue()
    print("Starting CSE process...")
    cse_process = multiprocessing.Process(target=cse_loop)
    cse_process.start()

    # start the proactive agents process
    print("Starting Proactive Agents process...")
    proactive_agents_background_process = multiprocessing.Process(target=proactive_agents_processing_loop)
    proactive_agents_background_process.start()

    explicit_background_process = multiprocessing.Process(target=explicit_agent_processing_loop)
    explicit_background_process.start()

    # setup and run web app
    # CORS allow from all sources
    print("Starting aiohttp server...")
    MAX_FILE_SIZE_MB = 88
    app = web.Application(client_max_size=(1024*1024*MAX_FILE_SIZE_MB))
    app.add_routes(
        [
            web.post('/chat', chat_handler),
            web.post('/button_event', button_handler),
            web.post('/ui_poll', ui_poll_handler),
            web.post('/upload_userdata', upload_user_data_handler),
            web.get('/image', return_image_handler),
            web.post('/run_single_agent', run_single_expert_agent_handler),
            web.post('/send_agent_chat', send_agent_chat_handler),
        ]
    )
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*"
        )
    })
    for route in list(app.router.routes()):
        cors.add(route)
    print("Running web server...")
    web.run_app(app, port=server_port)

    #let processes finish and join
    proactive_agents_background_process.join()
    cse_process.join()
    explicit_background_process.join()
