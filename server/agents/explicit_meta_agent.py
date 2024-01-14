from agents.search_tool_for_agents import get_search_tool_for_agents
from agents.math_tool_for_agents import get_wolfram_alpha_tool_for_agents
from agents.expert_agent_configs import expert_agent_config_list, expert_agent_prompt_maker
from langchain.agents import initialize_agent
from langchain.agents.tools import Tool
from server_config import openai_api_key
from langchain.agents import AgentType
import asyncio
from Modules.LangchainSetup import *
from helpers.time_function_decorator import time_function


llm = get_langchain_gpt4()
#llm = get_langchain_gpt4(max_tokens=4096)
#llm = get_langchain_gpt35(max_tokens=1024)

#explictly respond to user queries
explicit_meta_agent_prompt_blueprint = """You are a highly intelligent, skilled, and helpful assistant that helps answer user queries that they make during their conversations.

[Your Tools]
You have two types of tools - Expert Agents and Regular Tools. These two types of tools are very different - Regular Tools can be used at your discretion if they are absolutely necessary to solve the question. Expert Agents should ONLY be used if the user query explicitly requests that you use them or requests you do a task that explicitly requires those Expert Agents. Don't use the Statistician unless the user explicitly says "Statistician" - if you generally just need stats or data, use the Search_Engine Regular Tool.

In general, tools have a high time cost, so only use them if you must - try to answer questions without them if you can. If query asks for a stat or data that you already know, don't search for it, just provide it from memory, the speed of a direct answer is more important than having the most up-to-date information.

How to use the Expert Agents: they are like workers in your team that can help you do certain tasks. Imagine you are a human manager and your agents as human workers. You can assign tasks to your agents and they will help you complete the tasks. Speak to them like how you would speak to a human worker, give detailed context and instructions.

These are your Regular Tools: Search_Engine
These are your Expert Agents: {expert_agents_name_list}

You may only use a tool once. Don't use a tool more than once!

[Conversation Transcript]
This is the current live transcript of the conversation you're assisting:
<Transcript start>{transcript_history}<Transcript end>

Use this transcript as context and a data source to help the user. If the user asks you a question about something that was just said, or to summarize the conversation, use this data to do so.

[Your assistant history]
This is the history of your previous inputs and responses:
<Assistant history start>{insight_history}<Assistant history end>

[Your Task]
Now use your knowledge and/or tools (if needed) to answer the query to the best of your ability. Do not use your tools if you already know the answer to the query. The query may accidentally contain some extra speech not related to the query, you should ignore any noise and try to find the user's inteded query.

If you are asked for a summary, read the "Conversation Transcript" above, and summarize it.

Users will see/hear your answers on earbuds, smart glasses, or on a screen while distracted, so make your answer as concise and succinct as possible. Leave out filler words and redundancy to make the answer high entropy and as to-the-point as possible. Avoid new lines. Answers should be 10 words or less unless user explicitly asks for more detial. Use telegraph style writing for conciseness.

Make sure your final answer is always returned in the specified format! Never return just a string, return a final answer formatted as directed!

The Search_Engine is not for personal queries! It will only search the web, don't use it if the user asks a question about themselves, only use it to retrieve information from the web.

If the user asks you a question about something that was just said, or to summarize the conversation, use the "Conversation Transcript" to do so.

[Actions]
Actions should ONLY be for using tools or returning the final answer. If you have a task to do yourself, don't put it in the "Action", just go ahead and do the task.

[Query]
{query}
"""


# makes the wrapper fnction for expert agents when they're run as tools - a function factory so we don't have weird scope issues
@time_function()
def make_expert_agent_run_wrapper_function(agent, agent_explicit_prompt, is_async=True):
    def run_expert_agent_wrapper(command):
        return agent.run(agent_explicit_prompt + '\n[Extra Instructions]\n' + command)

    async def run_expert_agent_wrapper_async(command):
        return await agent.arun(agent_explicit_prompt + '\n[Extra Instructions]\n' + command)

    return run_expert_agent_wrapper_async if is_async else run_expert_agent_wrapper

def get_expert_agents_name_list():
    expert_agents_list = list(expert_agent_config_list.values())
    expert_agents_name_list = [ea['name'] for ea in expert_agents_list if 'name' in ea]
    return expert_agents_name_list

# generate expert agents as tools (each one has a search engine, later make the tools each agent has programmatic)
@time_function()
def make_expert_agents_as_tools(transcript):
    tools = []
    expert_agents_list = list(expert_agent_config_list.values())
    for expert_agent in expert_agents_list:
        # make the expert agent with it own special prompt
        expert_agent_explicit_prompt = expert_agent_prompt_maker(expert_agent, transcript)

        agent_tools = []

        if "Search_Engine" in expert_agent['tools']:
                agent_tools.append(get_search_tool_for_agents())
        if "Wolfram_Alpha" in expert_agent['tools']:
                agent_tools.append(get_wolfram_alpha_tool_for_agents())

        # make the agent with tools
        new_expert_agent = initialize_agent(agent_tools, llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True, max_iterations=4, handle_parsing_errors=True)

        # use function factory to make expert agent runner wrapper
        run_expert_agent_wrapper = make_expert_agent_run_wrapper_function(new_expert_agent, expert_agent_explicit_prompt)

        expert_agent_as_tool = Tool(
            name=expert_agent['agent_name'],
            func=run_expert_agent_wrapper,
            coroutine=run_expert_agent_wrapper,
            description="Use this tool when: " + expert_agent['proactive_tool_description']
        )
    
        tools.append(expert_agent_as_tool)
    return tools


@time_function()
def get_explicit_meta_agent(transcript):
    #hold all the tools of the explicit agent
    tools = []

    #get all the expert agents as tools
    expert_agents_as_tools = make_expert_agents_as_tools(transcript)
    print("EXPERT AGENTS AS TOOLS")
    print(expert_agents_as_tools)
    tools.extend(expert_agents_as_tools)

    #also add normal tools to explicit agent toolset
    tools.append(get_search_tool_for_agents())

    explicit_meta_agent = initialize_agent(
            tools, 
            llm, 
            agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
            max_iterations=4, 
            handle_parsing_errors=True,
            verbose=True)
    return explicit_meta_agent


@time_function()
def run_explicit_meta_agent(query, transcript_history = "", insight_history = ""):
    expert_agents_name_list = get_expert_agents_name_list()
    prompt = explicit_meta_agent_prompt_blueprint.format(insight_history=insight_history, query=query, transcript_history=transcript_history, expert_agents_name_list=expert_agents_name_list)
    transcript = "{}\nQuery: {}".format(insight_history, query)
    return get_explicit_meta_agent(transcript).run(prompt)


@time_function()
async def run_explicit_meta_agent_async(query, transcript_history = "", insight_history = ""):
    expert_agents_name_list = get_expert_agents_name_list()
    prompt = explicit_meta_agent_prompt_blueprint.format(insight_history=insight_history, query=query, transcript_history=transcript_history, expert_agents_name_list=expert_agents_name_list)
    transcript = "{}\nQuery: {}".format(insight_history, query)
    return await (get_explicit_meta_agent(transcript).arun(prompt))


if __name__ == '__main__':
    run_explicit_meta_agent("THIS IS THE CONTEXT", "FACT CHECK THAT CARS HAVE 4 WHEELS?")
