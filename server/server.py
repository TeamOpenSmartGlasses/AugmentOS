from aiohttp import web
from aiohttp.web_response import Response
from pathlib import Path
import json
import os
from langchain.chat_models import ChatOpenAI
from langchain import PromptTemplate
from langchain.chains import RetrievalQA, LLMChain
from langchain.agents import initialize_agent, Tool, AgentType
from langchain.output_parsers import PydanticOutputParser
import tiktoken
from datetime import datetime
from ContextualSearchEngine import ContextualSearchEngine
import time
from prompts import memory_retriever_prompt, answer_prompt
from parsers import retrieve_memory
import threading
from DatabaseHandler import DatabaseHandler
from Modules.RelevanceFilter import RelevanceFilter
from server_config import server_port
import traceback

# multiprocessing
import multiprocessing
# multiprocessing.set_start_method('spawn')
import pandas as pd

# CORS
import aiohttp_cors
from aiohttp import web

dbHandler = DatabaseHandler()
relevanceFilter = RelevanceFilter(databaseHandler=dbHandler)

app = web.Application(client_max_size=1000000 * 32)
# store and retrieve short term memories. Stored as a list of memories.
app['buffer'] = dict()
# store and retrieve long term memories. Implemented as chromadb
app['memory'] = dict()
# store and retrieve notes. Stored as a list of memories.
app['notes'] = dict()

# lower max token decreases latency: https://platform.openai.com/docs/guides/production-best-practices/improving-latencies. On average, each token is 4 characters. We speak 150 wpm, average english word is 4.7 characters
# max_talk_time = 30  # seconds
# max_tokens = (((150 * (max_talk_time / 60)) * 4.7) / 4) * 2  # *2 for response

OPENAI_API_KEY = os.environ['OPENAI_API_KEY']
max_tokens = 1024
app['llm'] = ChatOpenAI(
    model_name="gpt-3.5-turbo-0613",
    temperature=0,
    openai_api_key=OPENAI_API_KEY,
    max_tokens=max_tokens,
)

mostRecentFinalTranscript = dict()
fiveSecondsInMs = 5000


async def chat_handler(request):
    startTime = time.time()

    body = await request.json()
    isFinal = body.get('isFinal')
    text = body.get('text')
    timestamp = body.get('timestamp')
    userId = body.get('userId')

    # 400 if missing params
    if text is None or text == '':
        return web.Response(text='no text in request', status=400)
    if timestamp is None or timestamp == '':
        return web.Response(text='no timestamp in request', status=400)
    if userId is None or userId == '':
        return web.Response(text='no userId in request', status=400)

    if isFinal and False:
        memory = UnitMemory(text, timestamp, isFinal=isFinal)
        decayed_memories = app['buffer'][userId].add_memory(memory)

        # add to long term memory
        #    long-term memory is based on final transcripts
        app['memory'][userId].add_memories(decayed_memories)

    # Save to database
    # & Debounce extraneous intermediate transcripts by only
    # considering those that come after 5 seconds of a final transcript
    if userId not in mostRecentFinalTranscript:
        mostRecentFinalTranscript[userId] = 0

    if isFinal:
        mostRecentFinalTranscript[userId] = timestamp

    if isFinal or (timestamp - mostRecentFinalTranscript[userId] < fiveSecondsInMs):
        print('\n=== CHAT_HANDLER ===\n{}: {}, {}, {}'.format(
            "FINAL" if isFinal else "INTERMEDIATE", text, timestamp, userId))
        startSaveDbTime = time.time()
        dbHandler.saveTranscriptForUser(
            userId=userId, text=text, timestamp=timestamp, isFinal=isFinal)
        endSaveDbTime = time.time()
        print("=== CHAT_HANDLER's save DB done in {} SECONDS ===".format(
            round(endSaveDbTime - startSaveDbTime, 2)))

        # Also do WearLLM things
        # log so we can retain convo memory for later
        with open(f'./logs/{userId}.log', 'a+') as f:
            f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

        # agent response
        response = ''
        try:
            jarvis_mode = text.lower().find("jarvis") != -1
            if jarvis_mode:
                with open(f'./logs/{userId}_commands.log', 'a+') as f:
                    f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

                answer = await answer_question_to_jarvis(text, userId)
                response = answer

            james_mode = text.lower().find("james") != -1
            if james_mode:
                with open(f'./logs/{userId}_commands.log', 'a+') as f:
                    f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

                answer = await agent_james(text, userId)
                response = answer

        except Exception as e:
            print("Error: ", e)
    else:
        print("DEBOUNCING TRANSCRIPT")
        response = ''

    endTime = time.time()
    print("=== CHAT_HANDLER COMPLETED IN {} SECONDS ===".format(
        round(endTime - startTime, 2)))
    return web.Response(text=json.dumps({'success': True, 'message': response}), status=200)


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
        # save event
        with open(f'./logs/{userId}_events.log', 'a+') as f:
            f.write(str({'text': "BUTTON_DOWN", 'timestamp': timestamp}) + '\n')

        # get recent transcripts (last n seconds of speech)
        short_term_memory = get_short_term_memory(userId)
        print("------------------------ {} 's STM:")
        print(short_term_memory)
        short_term_memory_snippet = short_term_memory

        # agent response
        # answer = await agent_james(short_term_memory_snippet, userId)
        answer = await answer_question_to_jarvis(short_term_memory_snippet, userId)
        response = answer

        return web.Response(text=json.dumps({'message': response}), status=200)
    else:
        return web.Response(text=json.dumps({'message': "button up activity detected"}), status=200)


async def answer_question_to_jarvis(text, userId):
    """
    Regular old retrieval augmented generation with Jarvis
    """

    question = text.lower().replace("jarvis", "").strip()

    retrieval_template = """You are a helpful assistant who is an expert in everything that provides answers utilizing conversational memories of a human. The human user is engaged in conversation with another human, and you are listening to the conversation. The user sometimes stops to ask you for assistance mid-conversation.

The details to construct the answer can be found in the relevant memories of the user who asks the questins. If you don't know the answer to a question and can't find and answer in the relevant memories, you should say that you do not know the answer.

Relevant user memories: '''{context}'''

The question or request you are to answer is the last (final) question/request posed by the human to you in the below 'Query'. In the 'Query'. Be concise and succinct. Never answer with more than 180 characters.

'Query': '''{question}'''

That was the query. Answer the final question/request succinctly. Here is only the answer to the final question/request:"""

    retrieval_prompt = PromptTemplate(
        template=retrieval_template,
        input_variables=["context", "question"]
    )

    print("JARVIS RETREIVAL PROMPT:")
    print(retrieval_prompt)

    vectordb_retriever = app['memory'][userId].db.as_retriever(search_kwargs={
                                                               "k": 30})

    retrieval_qa = RetrievalQA.from_chain_type(
        llm=app['llm'],
        chain_type="stuff",
        retriever=vectordb_retriever,
        chain_type_kwargs={"prompt": retrieval_prompt}
    )

    answer = retrieval_qa.run(question)

    # encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")

    print("Question: ", question)

    print("Answer: ", answer)
    return answer


async def agent_jarvis(text, userId):

    question = text.lower().split('jarvis')[-1].strip()

    tools = [
        MemoryRetriever(ltm_memory=app['memory'][userId])
    ]

    agent = initialize_agent(
        tools, app['llm'], agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

    answer = agent.run(question)

    return answer


async def agent_james(text, userId):

    question = text.lower().split('james')[-1].strip()

    memory_retriever = MemoryRetriever(ltm_memory=app['memory'][userId])
    current_time = datetime.now().strftime("%m/%d/%Y, %H:%M:%S")

    retriever_input_parser = PydanticOutputParser(
        pydantic_object=retrieve_memory)

    memory_retriever_template = PromptTemplate(template=memory_retriever_prompt, input_variables=['current_time', 'question'],
                                               partial_variables={'format_instructions': retriever_input_parser.get_format_instructions()})
    chain = LLMChain(llm=app['llm'], prompt=memory_retriever_template)

    answer = chain.run(current_time=current_time, question=question)
    parsed_answer = retriever_input_parser.parse(answer)
    print(parsed_answer)

    retrieved_docs = memory_retriever._run(
        parsed_answer.query, parsed_answer.start_time, parsed_answer.end_time)
    print(retrieved_docs)

    answer_template = PromptTemplate(
        template=answer_prompt, input_variables=['context', 'question'])
    chain = LLMChain(llm=app['llm'], prompt=answer_template)
    final_answer = chain.run(context=retrieved_docs, question=question)

    print("Final Answer: ", final_answer)
    return final_answer

    # Contextual Search Engine

# run tools for subscribed users in background every n ms if there is fresh data to run on


def processing_loop():
    print("START PROCESSING LOOP")
    lock = threading.Lock()
    while True:
        if not dbHandler.ready:
            print("dbHandler not ready")
            time.sleep(0.1)
            continue
        lock.acquire()

        try:
            pLoopStartTime = time.time()
            # Check for new transcripts
            newTranscripts = dbHandler.getRecentTranscriptsForAllUsers(
                combineTranscripts=True, deleteAfter=True)
            for transcript in newTranscripts:
                print("Run CSE with... userId: '{}' ... text: '{}'".format(
                    transcript['userId'], transcript['text']))
                cseStartTime = time.time()
                cseResponses = cse.contextual_search_engine(
                    transcript['userId'], transcript['text'])
                cseEndTime = time.time()
                print("=== CSE completed in {} seconds ===".format(
                    round(cseEndTime - cseStartTime, 2)))
                if cseResponses != None:
                    for res in cseResponses:
                        if res != {} and res != None:
                            if relevanceFilter.shouldRunForText(transcript['userId'], res['name']):
                                dbHandler.addCseResultForUser(
                                    transcript['userId'], res)
        except Exception as e:
            cseResponses = None
            print("Exception in CSE...:")
            print(e)
            traceback.print_exc()
        finally:
            lock.release()
            pLoopEndTime = time.time()
            print("=== processing_loop completed in {} seconds overall ===".format(
                round(pLoopEndTime - pLoopStartTime, 2)))
        time.sleep(1.5)


cse = ContextualSearchEngine(
    relevanceFilter=relevanceFilter, databaseHandler=dbHandler)


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

    # get CSE results
    cseResultList = dbHandler.getCseResultsForUserDevice(
        userId=userId, deviceId=deviceId)

    cseResults = cseResultList

    # if cseResults != None and cseResults != []:
    #    print("\n=== CONTEXTUAL_SEARCH_ENGINE ===\n{}".format(cseResults))

    # send response
    if (cseResults) != []:
        resp["success"] = True
        resp["result"] = cseResults
    else:
        resp["success"] = False
    return web.Response(text=json.dumps(resp), status=200)


async def return_image(request):
    requestedImg = request.rel_url.query['img']
    print("Got image request for image: " + requestedImg)
    imgPath = Path(cse.imagePath).joinpath(requestedImg)
    try:
        data = imgPath.read_bytes()
    except:
        print("Error reading requested image: " + requestedImg)
        data = Path('images/404-2.jpg').read_bytes()
    return Response(body=data, content_type="image/jpg")


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

        if not cse.is_custom_data_valid(df):
            return web.Response(text="Bad data format", status=400)

        cse.upload_custom_user_data(user_id, df)

        return web.Response(text="Data processed successfully", status=200)
    else:
        return web.Response(text="Missing user file or user ID in the received data", status=400)


background_process = multiprocessing.Process(target=processing_loop)
background_process.start()

app.add_routes(
    [
        web.post('/chat', chat_handler),
        web.post('/button_event', button_handler),
        web.post('/ui_poll', ui_poll),
        web.post('/upload_userdata', upload_user_data),
        web.get('/image', return_image),
    ]
)

# setup and run web app
# CORS allow from all sources
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
background_process.join()
