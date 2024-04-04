from agents.search_tool_for_agents import get_search_tool_for_agents
from agents.expert_agent_configs import default_expert_agent_list
from langchain.agents import initialize_agent
from server_config import openai_api_key
from langchain.agents import AgentType
import asyncio
from Modules.LangchainSetup import *
from helpers.time_function_decorator import time_function
import langchain

#langchain.debug = True

#llm = get_langchain_gpt4()
llm = get_langchain_gpt4(max_tokens=350)
#llm = get_langchain_gpt35(max_tokens=1024)

#explictly respond to user queries
explicit_agent_prompt_blueprint = """[Conversation Transcript]
This is the transcript of the current live conversation:
<transcript>{transcript_history}</transcript>

Use the above transcript as context and a data source to help the user.

[Your Tools]
Tools can be used at your discretion if they are absolutely necessary to answer the query - try to answer questions without using Tools if you can. If a query asks for something you already know, don't search for it, just provide it from memory. But if you don't know the answer, use your SearchEngine.

These are your tools: Search_Engine

[Your History]
This is the history of your previous inputs + responses:
<history>{insight_history}</history>

[Actions]
Actions are only for using tools.

[Your Task]
Answer the User Query to the best of your ability. The query may contain some extra unrelated speech not related to the query - ignore any noise to answer just the user's inteded query. Make your answer concise, leave out filler words, make the answer high entropy, answer in 10 words or less (no newlines). Use telegraph style writing.

The Search_Engine is not for personal queries! It will only search the web, don't use it if the user asks a query about their personal data or conversation, only use it to retrieve information from the web.

[User Query]
Query: ```{query}```

NOTE: Only use the Search_Engine to search for public information, never use Search_Engine to answer questions about the current conversation. If the user asks you a question about something that was just said, or to summarize the conversation, use the Conversation Transcript and History to do so.

NOTE: Make sure your Final Answer is always returned in the specified format (must have prefix "Final Answer: ")! Never return just a string, return a Final Answer formatted as directed."""

#How to use the Expert Agents: they are like workers in your team that can help you do certain tasks. Imagine you are a human manager and your agents as human workers. You can assign tasks to your agents and they will help you complete the tasks. Speak to them like how you would speak to a human worker, give detailed context and instructions.

def get_expert_agents_name_list():
    return [ea.agent_name for ea in default_expert_agent_list]

# generate expert agents as tools (each one has a search engine, later make the tools each agent has programmatic)
@time_function()
def make_expert_agents_as_tools(transcript):
    return [ea.get_agent_as_tool(transcript) for ea in default_expert_agent_list]

@time_function()
def get_explicit_agent(transcript):
    #hold all the tools of the explicit agent
    tools = []

    #get all the expert agents as tools
    expert_agents_as_tools = make_expert_agents_as_tools(transcript)
    tools.extend(expert_agents_as_tools)

    #also add normal tools to explicit agent toolset
    tools.append(get_search_tool_for_agents())

    explicit_agent = initialize_agent(
            tools, 
            llm, 
            agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
            max_iterations=4, 
            #handle_parsing_errors="That output triggered an error, check your output and make sure it conforms, use the Action/Action Input syntax",
            handle_parsing_errors=True,
            verbose=True)
    return explicit_agent

@time_function()
async def run_explicit_agent_async(query, transcript_history = "", insight_history = ""):
    expert_agents_name_list = get_expert_agents_name_list()
    prompt = explicit_agent_prompt_blueprint.format(insight_history=insight_history, query=query, transcript_history=transcript_history, expert_agents_name_list=expert_agents_name_list)
    transcript = "{}\nQuery: {}".format(insight_history, query)
    return await (get_explicit_agent(transcript).arun(prompt))


if __name__ == '__main__':
    result = asyncio.run(run_explicit_agent_async("THIS IS THE CONTEXT", "FACT CHECK THAT CARS HAVE 4 WHEELS?"))
    print ("RESULT: " + result)
