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
def run_explicit_agent(query, transcript_history = "", insight_history = ""):
    expert_agents_name_list = get_expert_agents_name_list()
    prompt = explicit_agent_prompt_blueprint.format(insight_history=insight_history, query=query, transcript_history=transcript_history, expert_agents_name_list=expert_agents_name_list)
    print(prompt)
    transcript = "{}\nQuery: {}".format(insight_history, query)
    return get_explicit_agent(transcript).run(prompt)


@time_function()
async def run_explicit_agent_async(query, transcript_history = "", insight_history = ""):
    expert_agents_name_list = get_expert_agents_name_list()
    prompt = explicit_agent_prompt_blueprint.format(insight_history=insight_history, query=query, transcript_history=transcript_history, expert_agents_name_list=expert_agents_name_list)
    transcript = "{}\nQuery: {}".format(insight_history, query)
    return await (get_explicit_agent(transcript).arun(prompt))


if __name__ == '__main__':
    run_explicit_agent("THIS IS THE CONTEXT", "FACT CHECK THAT CARS HAVE 4 WHEELS?")
