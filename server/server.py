from aiohttp import web
import asyncio
import json
from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain import PromptTemplate, LLMChain
from langchain.schema import (
    AIMessage,
    HumanMessage,
    SystemMessage
)
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from time import time

app = web.Application()
app['buffer'] = dict()
app['jarvis memory'] = dict()
# lower max token decreases latency: https://platform.openai.com/docs/guides/production-best-practices/improving-latencies. On average, each token is 4 characters.
# Let's imagine the longest question someone is going to ask is 30 seconds and the longest reponse we'll get is 30 seconds
# we speak 150 wpm
# average english word is 4.7 characters
max_talk_time = 30  # seconds
# max_tokens = (((150 * (max_talk_time / 60)) * 4.7) / 4) * 2  # *2 for response
max_tokens = 3200
app['llm'] = ChatOpenAI(
    temperature=0.5, max_tokens=max_tokens, request_timeout=12, max_retries=0)
app['buffer']['test'] = [
    {'text': 'old message be old yo', 'timestamp': time() - 60 * 70},
    {'text': 'I like butts', 'timestamp': time()},
    {'text': 'Who is the real slim shady', 'timestamp': time()},
]
app['buffer']['cayden'] = []
app['buffer']['jeremy'] = []
app['buffer']['test'] = []
app['jarvis memory']['cayden'] = []
app['jarvis memory']['jeremy'] = []
app['jarvis memory']['test'] = []


def get_text_in_past_n_minutes(obj_list, n):
    past_time = time() - 60 * n

    return ''.join(t.get('text') + '\n' for t in obj_list if t.get('timestamp') > past_time)


async def is_summary_requested(text):
    # require the word 'summary' or 'summarize' to be in the transcript to get a summary
    if text.lower().find("summar") == -1:
        return

    class SummaryQuery(BaseModel):
        """
        Number of minutes of requested summarization
        """
        duration: int = Field(
            description="number of minutes of text to summarize in minutes")

    summary_query_parser = PydanticOutputParser(pydantic_object=SummaryQuery)
    extract_summary_query_prompt = PromptTemplate(
        template="If the following text contains a question or statement very similar to 'summarize the past n minutes', output only the number of minutes that are to be summarized. Otherwise output only 0. \n{format_instructions}\n{text}\n",
        input_variables=["text"],
        partial_variables={
            "format_instructions": summary_query_parser.get_format_instructions()}
    )

    extract_summary_query_prompt_string = extract_summary_query_prompt.format_prompt(
        text=text).to_string()

    # print(extract_summary_query_prompt_string)

    response = app['llm'](
        [HumanMessage(content=extract_summary_query_prompt_string)])
    try:
        minutes = summary_query_parser.parse(response.content).duration
        return minutes
    except OutputParserException:
        return 0


async def is_topic_reminder_requested(text):
    # require the word 'summary' or 'summarize' to be in the transcript to get a summary
    if text.lower().find("just") == -1:
        return

    response = app['llm']([HumanMessage(
        content=f"If the following text contains a question very similar to 'What were we talking about' or 'What was I just saying', output only 'True'. Otherwise output only 'False'. Here is the text: \n{text}")])

    remind = response.content
    if remind.lower().strip() == 'true':
        return True

    return False


async def summarize_chat_history(text):
    response = app['llm']([HumanMessage(
        content=f"Please summarize the following text to a short string that is easy to parse very quickly and just gives the gist of what is said. Feel free to leave out filler words, like 'the' and 'a' if they aren't useful to human understanding of the abbreviated text. The summarized text should be no more than 18 words long, but I really would rather if it can be 14 or less. Please respond kindly. Here is the text to summarize:\n{text}")])

    summary = response.content
    return summary


async def summarize_if_requested(text, userId):

    # search for 2 kinds of requests concurrently:
    # 1. Summarize the past n minutes
    # 2. What were we just talking about (map this to 2 minutes)

    stuff = await asyncio.gather(is_summary_requested(text), is_topic_reminder_requested(text))
    minutes, remind = stuff

    summary = ''
    if remind:
        minutes = 2
    if minutes:
        print(f'getting summary for past {minutes} minutes')
        recent_text = get_text_in_past_n_minutes(
            app['buffer'][userId], minutes)
        summary = await summarize_chat_history(recent_text)

    return summary


async def answer_question_to_jarvis(text, userId):
    """
    Jarvis QA has memory.
    Once a conversation has been started, all human and AI messages are recorded and context is maintained.
    If human speaks while jarvis is thinking, jarvis stops thinking and starts thinking about the combined message.
    """
    memory = app['jarvis memory'][userId]
    jarvis_mentioned = text.lower().find("jarvis") != -1

    # Say Jarvis to start or stop talking to Jarvis
    if not memory and not jarvis_mentioned:
        return
    if memory and jarvis_mentioned:
        memory.clear()
        return

    # if user talks before jarvis responds, replace previous jarvis request with a new longer one
    if memory and memory[-1]['speaker'] == userId:
        print('user spoke before jarvis')
        text = memory[-1]['text'] + '\n' + text
        memory[-1]['text'] = text

    memory.append({'speaker': userId, 'text': text})
    response = app['llm']([
        SystemMessage(content="You, Jarvis, are an expert in every field who ignores everything said to him that is not relevant to a question. When you answer a question please do so with fewer than 16 words. Please respond with kindness."),
        *[
            HumanMessage(content=mem['text']) if mem['speaker'] == userId
            else AIMessage(content=mem['text'])
            for mem in memory
        ],
        HumanMessage(content=text)
    ])
    # If user spoke more while Jarvis was thinking, discard thought and wait for updated one
    if memory[-1]['text'] != text:
        return ''

    memory.append({'speaker': 'jarvis', 'text': response.content})
    return response.content


async def chat_handler(request):
    """
    POST API for spoken language and optional responses from LLM System.
    Saves everything mentioned and provides answers to specific questions / prompts.

    Prompt Support:
     - [X] acidbrain prosthetic / what were we just talking about?
     - [X] summarization of the past n minutes of conversation
     - [X] general-knowledge questions to an assistant named Jarvis
    """
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

    # log so we can retain convo memory for later
    with open(f'{userId}.log', 'a') as f:
        f.write(str({'text': text, 'timestamp': timestamp}) + '\n')

    # when in Jarvis comms mode, ignore summaries and reminders.
    summary = ''
    answer = ''
    try:
        jarvis_mode = app['jarvis memory'][userId] or text.lower().find("jarvis") != -1
        if jarvis_mode:
            answer = await answer_question_to_jarvis(text, userId)
            response = answer
        else:
            summary = await summarize_if_requested(text, userId)
            response = summary
    except Exception as e:
        print(e)
        summary = 'open AI is busy'

    if not app['buffer'][userId]:
        app['buffer'][userId] = []
    app['buffer'][userId].append({'text': text, 'timestamp': timestamp})

    print('summary: ', summary)
    print('answer: ', answer)

    return web.Response(text=json.dumps({'message': response}), status=200)


app.add_routes(
    [
        web.post('/chat', chat_handler),
    ]
)

web.run_app(app)
