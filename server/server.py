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
# app['llm'] = OpenAI(model_name="gpt-3.5-turbo", n=2, best_of=2)
app['llm'] = ChatOpenAI(temperature=0.8)


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
