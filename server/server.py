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
from aiohttp import web

#Convoscope
from server_config import server_port
from constants import USE_GPU_FOR_INFERENCING, IMAGE_PATH
from ContextualSearchEngine import ContextualSearchEngine
from DatabaseHandler import DatabaseHandler
from agent_insights_process import agent_insights_processing_loop
from Modules.RelevanceFilter import RelevanceFilter

global dbHandler
global relevanceFilter
global app

#handle new transcripts coming in
async def chat_handler(request):
    startTime = time.time()

    body = await request.json()
    isFinal = body.get('isFinal')
    text = body.get('text')
    timestamp = time.time() # Never use client's timestamp ### body.get('timestamp')
    userId = body.get('userId')

    # 400 if missing params
    if text is None or text == '':
        return web.Response(text='no text in request', status=400)
    if timestamp is None or timestamp == '':
        return web.Response(text='no timestamp in request', status=400)
    if userId is None or userId == '':
        return web.Response(text='no userId in request', status=400)

    #print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format(
    #    "FINAL" if isFinal else "INTERMEDIATE", text, timestamp, userId))
    if isFinal:
        print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format("FINAL", text, timestamp, userId))
    startSaveDbTime = time.time()
    dbHandler.saveTranscriptForUser(
        userId=userId, text=text, timestamp=timestamp, isFinal=isFinal)
    endSaveDbTime = time.time()
    #print("=== CHAT_HANDLER's save DB done in {} SECONDS ===".format(
    #    round(endSaveDbTime - startSaveDbTime, 2)))

    endTime = time.time()
    #print("=== CHAT_HANDLER COMPLETED IN {} SECONDS ===".format(
    #    round(endTime - startTime, 2)))
    return web.Response(text=json.dumps({'success': True, 'message': ""}), status=200)


#runs when button is pressed on frontend - right now button ring on wearable or button in TPA
async def button_handler(request):
    body = await request.json()
    button_num = body.get('button_num')
    button_activity = body.get('button_activity')
    timestamp = body.get('timestamp')
    userId = body.get('userId')
    print('\n=== New Request ===\n', button_num,
          button_activity, timestamp, userId)

    # 400 if missing params
    if button_num is None or button_num == '':
        return web.Response(text='no button_num in request', status=400)
    if button_activity is None or button_activity == '':
        return web.Response(text='no button_activity in request', status=400)
    if timestamp is None or timestamp == '':
        return web.Response(text='no timestamp in request', status=400)
    if userId is None or userId == '':
        return web.Response(text='no userId in request', status=400)

    if button_activity:  # True if push down, false if button release
        print("button True")

        return web.Response(text=json.dumps({'message': "button up activity detected"}), status=200)
    else:
        return web.Response(text=json.dumps({'message': "button up activity detected"}), status=200)


# run cse/definer tools for subscribed users in background every n ms if there is fresh data to run on
def cse_loop():
    print("START PROCESSING LOOP")

    #setup things we need for processing
    dbHandler = DatabaseHandler(parentHandler=False)
    relevanceFilter = RelevanceFilter(databaseHandler=dbHandler)
    cse = ContextualSearchEngine(relevanceFilter=relevanceFilter, databaseHandler=dbHandler)

    #then run the main loop
    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            newTranscripts = dbHandler.getNewCseTranscriptsForAllUsers(
                combineTranscripts=True, deleteAfter=False)
            for transcript in newTranscripts:
                print("Run CSE with... userId: '{}' ... text: '{}'".format(
                    transcript['userId'], transcript['text']))
                cseStartTime = time.time()
                cseResponses = cse.contextual_search_engine(
                    transcript['userId'], transcript['text'])
                cseEndTime = time.time()
                print("=== CSE completed in {} seconds ===".format(
                    round(cseEndTime - cseStartTime, 2)))

                #filter responses with relevance filter, then save CSE results to the database
                cseResponsesFiltered = list()
                if cseResponses != None:
                    for res in cseResponses:
                        if res != {} and res != None:
                            if relevanceFilter.shouldRunForText(transcript['userId'], res['name']):
                                cseResponsesFiltered.append(res)
                    dbHandler.addCseResultsForUser(
                        transcript['userId'], cseResponsesFiltered)
        except Exception as e:
            cseResponses = None
            print("Exception in CSE...:")
            print(e)
            traceback.print_exc()
        finally:
            pLoopEndTime = time.time()
            # print("=== processing_loop completed in {} seconds overall ===".format(
            #     round(pLoopEndTime - pLoopStartTime, 2)))
        time.sleep(2.5)


#frontends poll this to get the results from our processing of their transcripts
async def ui_poll(request, minutes=0.5):
    # parse request
    body = await request.json()
    userId = body.get('userId')
    deviceId = body.get('deviceId')
    features = body.get('features')

    # 400 if missing params
    if userId is None or userId == '':
        return web.Response(text='no userId in request', status=400)
    if deviceId is None or deviceId == '':
        return web.Response(text='no deviceId in request', status=400)
    if features is None or features == '':
        return web.Response(text='no features in request', status=400)
    if "contextual_search_engine" not in features:
        return web.Response(text='contextual_search_engine not in features', status=400)

    resp = dict()
    resp["success"] = True

    # get CSE results
    if "contextual_search_engine" in features:
        cseResults = dbHandler.getCseResultsForUserDevice(
            userId=userId, deviceId=deviceId)

        if cseResults:
            print("server.py ================================= CSERESULT")
            print(cseResults)

        # add CSE response
        resp["result"] = cseResults

    #get agent results
    if "agent_insights" in features:
        agentInsightResults = dbHandler.getAgentInsightsResultsForUserDevice(userId=userId, deviceId=deviceId)

        #add agents insight to response
        resp["result_agent_insights"] = agentInsightResults

    return web.Response(text=json.dumps(resp), status=200)


#return images that we generated and gave frontends a URL for
async def return_image(request):
    requestedImg = request.rel_url.query['img']
    imgPath = Path(IMAGE_PATH).joinpath(requestedImg)
    try:
        data = imgPath.read_bytes()
    except:
        print("Error reading requested image: " + requestedImg)
        data = Path('images/404-2.jpg').read_bytes()
    return Response(body=data, content_type="image/jpg")


#frontend can upload CSVs to run custom data search on
async def upload_user_data(request):
    post_data = await request.post()

    user_file = post_data.get('custom-file')
    user_id = post_data.get('userId')

    if user_file and user_id:
        # Check if the file is a CSV file by looking at its content type
        if user_file.content_type != 'text/csv':
            return web.Response(text="Uploaded file is not a CSV", status=400)

        # Validate data
        try:
            df = pd.read_csv(user_file.file)
        except Exception:
            return web.Response(text="Bad data format", status=400)

#        if not cse.is_custom_data_valid(df):
#            return web.Response(text="Bad data format", status=400)
#
#        cse.upload_custom_user_data(user_id, df)

        return web.Response(text="Data processed successfully", status=200)
    else:
        return web.Response(text="Missing user file or user ID in the received data", status=400)


if __name__ == '__main__':
    dbHandler = DatabaseHandler()
    #start proccessing loop subprocess to process data as it comes in
    if USE_GPU_FOR_INFERENCING:
        multiprocessing.set_start_method('spawn')

    #log_queue = multiprocessing.Queue()
    cse_process = multiprocessing.Process(target=cse_loop)
    cse_process.start()

    #start the agent process
    #agent_background_process = multiprocessing.Process(target=agent_insights_processing_loop)
    #agent_background_process.start()

    # setup and run web app
    # CORS allow from all sources
    app = web.Application(client_max_size=1000000 * 32)
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
    web.run_app(app, port=server_port)

    #let processes finish and join
    #agent_background_process.join()
    cse_process.join()

