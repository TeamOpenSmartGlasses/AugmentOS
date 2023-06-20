from aiohttp import web
import json
import os
from langchain.chat_models import ChatOpenAI
from langchain import PromptTemplate
from langchain.chains import RetrievalQA, LLMChain
from langchain.agents import initialize_agent, Tool, AgentType
from langchain.output_parsers import PydanticOutputParser
import tiktoken
from datetime import datetime

from utils import UnitMemory, ShortTermMemory, LongTermMemory
from utils import TimeNavigator, CurrentTime, MemoryRetriever
from prompts import memory_retriever_prompt, answer_prompt
from parsers import retrieve_memory

app = web.Application()
app['buffer'] = dict() # store and retrieve short term memories. Stored as a list of memories.
app['memory'] = dict() # store and retrieve long term memories. Implemented as chromadb
app['notes'] = dict() # store and retrieve notes. Stored as a list of memories.

# lower max token decreases latency: https://platform.openai.com/docs/guides/production-best-practices/improving-latencies. On average, each token is 4 characters. We speak 150 wpm, average english word is 4.7 characters
# max_talk_time = 30  # seconds
# max_tokens = (((150 * (max_talk_time / 60)) * 4.7) / 4) * 2  # *2 for response

# OPENAI_API_KEY= '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'
OPENAI_API_KEY= os.environ['OPENAI_API_KEY']
max_tokens = 1024
app['llm'] = ChatOpenAI(
    model_name="gpt-3.5-turbo-0613",
    temperature=0,
    openai_api_key=OPENAI_API_KEY,
    max_tokens=max_tokens,
)

# app['agent'] = initializeAgent()

app['buffer']['test'] = ShortTermMemory()
app['buffer']['cayden'] = ShortTermMemory()
app['buffer']['jeremy'] = []
app['buffer']['wazeer'] = ShortTermMemory()

app['memory']['test'] = LongTermMemory('test')
app['memory']['cayden'] = LongTermMemory('cayden')
app['memory']['jeremy'] = []
app['memory']['wazeer'] = LongTermMemory('wazeer')

# add a chromadb memory for each user
# have a current context buffer for each user

# maybe notes db for each user

# agent based interaction for each query
# or
# direct prompt based interaction for each query

async def chat_handler(request):
    body = await request.json()
    text = body.get('text')
    timestamp = body.get('timestamp')
    userId = body.get('userId')
    print('\n=== New Request ===\n', text, timestamp, userId)

    # 400 if missing params
    if text is None or text == '':
        return web.Response(text='no text in request', status=400)
    if timestamp is None or timestamp == '':
        return web.Response(text='no timestamp in request', status=400)
    if userId is None or userId == '':
        return web.Response(text='no userId in request', status=400)

    memory = UnitMemory(text, timestamp)

    decayed_memories = app['buffer'][userId].add_memory(memory)

    # add to long term memory
    app['memory'][userId].add_memories(decayed_memories)

    # log so we can retain convo memory for later
    with open(f'{userId}.log', 'a') as f:
        f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

    # agent response
    response = ''
    try:
        jarvis_mode = text.lower().find("jarvis") != -1
        if jarvis_mode:
            with open(f'{userId}_commands.log', 'a') as f:
                f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

            answer = await answer_question_to_jarvis(text, userId)
            response = answer

        james_mode = text.lower().find("james") != -1
        if james_mode:
            with open(f'{userId}_commands.log', 'a') as f:
                f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

            answer = await agent_james(text, userId)
            response = answer

    except Exception as e:
        print("Error: ", e)

    return web.Response(text=json.dumps({'message': response}), status=200)


async def print_handler(request):
    body = await request.json()
    userId = body.get('userId')
    print('\n=== New Request ===\n', userId)

    # 400 if missing params
    if userId is None or userId == '':
        return web.Response(text='no userId in request', status=400)

    # print short term memory
    short_term_memory = str(app['buffer'][userId])

    # print long term memory
    long_term_memory = app['memory'][userId].db.get()

    memories = {
        'short_term_memory': short_term_memory,
        'long_term_memory': long_term_memory
    }

    return web.Response(text=json.dumps(memories), status=200)


async def answer_question_to_jarvis(text, userId):
    """
    Regular old retrieval augmented generation with Jarvis
    """

    question = text.lower().replace("jarvis", "").strip()

    retrieval_template = """
You are a helpful assistant that provides answers based on conversational memories of a human. The human is engaged in a conversation with another human, and asks you in the middle for assistance.
The details to construct the answer can be found in the relevant memories. If it is not found in the relevant memories, you should truthfully answer that you do not know the answer.

Relevant memories: {context}

The query is the question asked by the human to you. Be as concise as possible with only the necessary information. NEVER respond in more than 180 characters.

Query: {question}"""

    retrieval_prompt = PromptTemplate(
        template=retrieval_template,
        input_variables=["context", "question"]
        )

    vectordb_retriever = app['memory'][userId].db.as_retriever(search_kwargs={"k": 50})

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

    agent = initialize_agent(tools, app['llm'], agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

    answer = agent.run(question)

    return answer

async def agent_james(text, userId):

    question = text.lower().split('james')[-1].strip()

    memory_retriever = MemoryRetriever(ltm_memory=app['memory'][userId])
    current_time=datetime.now().strftime("%m/%d/%Y, %H:%M:%S")

    retriever_input_parser = PydanticOutputParser(pydantic_object=retrieve_memory)

    memory_retriever_template = PromptTemplate(template=memory_retriever_prompt, input_variables=['current_time', 'question'], 
            partial_variables={'format_instructions': retriever_input_parser.get_format_instructions()})
    chain = LLMChain(llm=app['llm'], prompt=memory_retriever_template)

    answer = chain.run(current_time=current_time, question=question)
    parsed_answer = retriever_input_parser.parse(answer)
    print(parsed_answer)

    retrieved_docs = memory_retriever._run(parsed_answer.query, parsed_answer.start_time, parsed_answer.end_time)
    print(retrieved_docs)

    answer_template = PromptTemplate(template=answer_prompt, input_variables=['context', 'question'])
    chain = LLMChain(llm=app['llm'], prompt=answer_template)
    final_answer = chain.run(context=retrieved_docs, question=question)

    print("Final Answer: ", final_answer)
    return final_answer


app.add_routes(
    [
        web.post('/chat', chat_handler),
        web.post('/print', print_handler)
    ]
)

web.run_app(app)
