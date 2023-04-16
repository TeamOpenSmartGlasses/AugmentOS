from aiohttp import web
import json
from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain.schema import (
    AIMessage,
    HumanMessage,
    SystemMessage
)

app = web.Application()
app['buffer'] = list()
# lower max token decreases latency: https://platform.openai.com/docs/guides/production-best-practices/improving-latencies. On average, each token is 4 characters.
# Let's imagine the longest question someone is going to ask is 30 seconds and the longest reponse we'll get is 30 seconds
# we speak 150 wpm
#average english word is 4.7 characters
max_talk_time = 30 #seconds
max_tokens = (((150 * (max_talk_time / 60)) * 4.7) / 4) * 2 #*2 for response
app['llm'] = ChatOpenAI(temperature=0.8, max_tokens=max_tokens)

async def chat_handler(request):
    """
    POST API for a message/response from GPT.

    We'll want to save the response, likely, and keep chat contexts going... but later
    """
    data = await request.json()
    text = data.get('text')
    timestamp = data.get('timestamp')
    print(text)

    # 404 if empty request body
    if text is None or text == '':
        return web.Response(text='no spoken text found', status=404)

    response = app['llm']([
        SystemMessage(content="Be as concise as possible."),
        HumanMessage(content=text)
    ])
    print(response)
    print(response.content)

    return web.Response(text=json.dumps({'message': response.content}), status=200)


app.add_routes(
    [
        web.post('/chat', chat_handler),
    ]
)

web.run_app(app)
