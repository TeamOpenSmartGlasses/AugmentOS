from aiohttp import web
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

# CORS
import aiohttp_cors
from aiohttp import web, web_exceptions

#Convoscope
from server_config import server_port
from constants import USE_GPU_FOR_INFERENCING, IMAGE_PATH
from ContextualSearchEngine import ContextualSearchEngine
from DatabaseHandler import DatabaseHandler
from agents.agent_insights_process import agent_insights_processing_loop
from agents.explicit_query_process import explicit_query_processing_loop
from Modules.RelevanceFilter import RelevanceFilter

global db_handler
global relevance_filter
global app

#handle new transcripts coming in
async def chat_handler(request):
    print("got chat...")
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

    print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format(
        "FINAL" if is_final else "INTERMEDIATE", text, timestamp, user_id))
    if is_final:
        print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format("FINAL", text, timestamp, user_id))
    start_save_db_time = time.time()
    db_handler.save_transcript_for_user(user_id=user_id, text=text, timestamp=timestamp, is_final=is_final)
    end_save_db_time = time.time()
    #print("=== CHAT_HANDLER's save DB done in {} SECONDS ===".format(
    #    round(end_save_db_time - start_save_db_time, 2)))

    end_time = time.time()
    #print("=== CHAT_HANDLER COMPLETED IN {} SECONDS ===".format(
    #    round(end_time - start_time, 2)))
    return web.Response(text=json.dumps({'success': True, 'message': ""}), status=200)


#runs when button is pressed on frontend - right now button ring on wearable or button in TPA
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
    print("START PROCESSING LOOP")
    #setup things we need for processing
    db_handler = DatabaseHandler(parent_handler=False)
    relevance_filter = RelevanceFilter(db_handler=db_handler)
    cse = ContextualSearchEngine(db_handler=db_handler)

    #then run the main loop
    while True:
        if not db_handler.ready:
            print("db_handler not ready")
            time.sleep(0.1)
            continue

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
                print("=== CSE completed in {} seconds ===".format(
                    round(cse_end_time - cse_start_time, 2)))

                #filter responses with relevance filter, then save CSE results to the database
                cse_responses_filtered = list()
                if cse_responses != None:
                    for res in cse_responses:
                        if res != {} and res != None:
                            if relevance_filter.should_run_for_text(transcript['user_id'], res['name']):
                                cse_responses_filtered.append(res)
                    db_handler.add_cse_results_for_user(
                        transcript['user_id'], cse_responses_filtered)
        except Exception as e:
            cse_responses = None
            print("Exception in CSE...:")
            print(e)
            traceback.print_exc()
        finally:
            p_loop_end_time = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(p_loop_end_time - p_loop_start_time, 2)))
        time.sleep(2.5)


#frontends poll this to get the results from our processing of their transcripts
async def ui_poll(request, minutes=0.5):
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

    #get agent results
    if "agent_insights" in features:
        agent_insight_results = db_handler.get_agent_insights_results_for_user_device(user_id=user_id, device_id=device_id)

        #add agents insight to response
        resp["result_agent_insights"] = agent_insight_results

    return web.Response(text=json.dumps(resp), status=200)


#return images that we generated and gave frontends a URL for
async def return_image(request):
    requested_img = request.rel_url.query['img']
    img_path = Path(IMAGE_PATH).joinpath(requested_img)
    try:
        data = img_path.read_bytes()
    except:
        print("Error reading requested image: " + requested_img)
        data = Path('images/404-2.jpg').read_bytes()
    return Response(body=data, content_type="image/jpg")


#frontend can upload CSVs to run custom data search on
async def upload_user_data(request):
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


if __name__ == '__main__':
    db_handler = DatabaseHandler()
    #start proccessing loop subprocess to process data as it comes in
    if USE_GPU_FOR_INFERENCING:
        multiprocessing.set_start_method('spawn')

    #log_queue = multiprocessing.Queue()
    cse_process = multiprocessing.Process(target=cse_loop)
    cse_process.start()

    #start the agent process
    #agent_background_process = multiprocessing.Process(target=agent_insights_processing_loop)
    #agent_background_process.start()

    explicit_background_process = multiprocessing.Process(target=explicit_query_processing_loop)
    explicit_background_process.start()

    # setup and run web app
    # CORS allow from all sources
    
    MAX_FILE_SIZE_MB = 88
    app = web.Application(client_max_size=(1024*1024*MAX_FILE_SIZE_MB))
    app.add_routes(
        [
            web.post('/chat', chat_handler),
            web.post('/button_event', button_handler),
            web.post('/ui_poll', ui_poll),
            web.post('/upload_userdata', upload_user_data),
            web.get('/image', return_image),
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
    #agent_background_process.join()
    cse_process.join()

