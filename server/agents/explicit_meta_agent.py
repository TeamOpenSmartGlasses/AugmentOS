from agents.search_tool_for_agents import get_search_tool_for_agents
from agents.math_tool_for_agents import get_wolfram_alpha_tool_for_agents
from agents.expert_agent_configs import expert_agent_config_list, expert_agent_prompt_maker
from langchain.agents import initialize_agent
from langchain.agents.tools import Tool
from langchain.chat_models import ChatOpenAI
from server_config import openai_api_key
from langchain.agents import AgentType
import asyncio
from constants import GPT_4_MODEL, GPT_4_MAX_TOKENS, GPT_TEMPERATURE

llm = ChatOpenAI(temperature=GPT_TEMPERATURE, openai_api_key=openai_api_key, model=GPT_4_MODEL, max_tokens=GPT_4_MAX_TOKENS)

#explictly respond to user queries
explicit_meta_agent_prompt_blueprint = """You are a highly intelligent, skilled, and helpful assistant that helps answer user queries that they make during their conversations.

[Your Tools]
You have access to "Agents", which are like workers in your team that can help you do certain tasks. Imagine you are a human manager and your agents as human workers. You can assign tasks to your agents and they will help you complete the tasks. Speak to them like how you would speak to a human worker, give detailed context and instructions.

[Conversation Transcript]
This is the current live transcript of the conversation you're assisting:
<Transcript start>{conversation_context}<Transcript end>

[Your Task]
Now use your knowledge and/or tools (if needed) to answer the query to the best of your ability. Do not use your tools if you already know the answer to the query. The query may accidentally contain some extra speech at the end, you should ignore any noise and try to find the user's inteded query. Make your answer as concise and succinct as possible. Leave out filler words and redundancy to make the answer high entropy and as to-the-point as possible. Never answer with more than 240 characters, and try to make it even less than that. Most answers can be given in under 10 words.

[Query]
{query}
"""

# makes the wrapper fnction for expert agents when they're run as tools - a function factory so we don't have weird scope issues
def make_expert_agent_run_wrapper_function(agent, agent_explicit_prompt, is_async=True):
    def run_expert_agent_wrapper(command):
        return agent.run(agent_explicit_prompt + '\n[Extra Instructions]\n' + command)

    async def run_expert_agent_wrapper_async(command):
        return await agent.arun(agent_explicit_prompt + '\n[Extra Instructions]\n' + command)

    return run_expert_agent_wrapper_async if is_async else run_expert_agent_wrapper

# generate expert agents as tools (each one has a search engine, later make the tools each agent has programmatic)
def make_expert_agents_as_tools(transcript):
    tools = []
    expert_agents_list = list(expert_agent_config_list.values())
    for expert_agent in expert_agents_list:
        # make the expert agent with it own special prompt
        expert_agent_explicit_prompt = expert_agent_prompt_maker(expert_agent, transcript)

        match expert_agent['agent_name']:
            case "DevilsAdvocate":
                agent_tools = [get_search_tool_for_agents()]
            case "FactChecker", "Statistician":
                agent_tools = [get_search_tool_for_agents(), get_wolfram_alpha_tool_for_agents()]
            case _:
                agent_tools = []

        # make the agent with tools
        new_expert_agent = initialize_agent(agent_tools, llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

        # use function factory to make expert agent runner wrapper
        run_expert_agent_wrapper = make_expert_agent_run_wrapper_function(new_expert_agent, expert_agent_explicit_prompt)

        expert_agent_as_tool = Tool(
            name=expert_agent['agent_name'],
            func=run_expert_agent_wrapper,
            description="Use this tool when: " + expert_agent['proactive_tool_description']
        )
    
        tools.append(expert_agent_as_tool)
    return tools

def get_explicit_meta_agent(transcript):
    expert_agents_as_tools = make_expert_agents_as_tools(transcript)
    print("EXPERT AGENTS AS TOOLS")
    print(expert_agents_as_tools)
    explicit_meta_agent = initialize_agent(
            expert_agents_as_tools, 
            llm, 
            agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
            max_iterations=10, 
            verbose=True)
    return explicit_meta_agent

def run_explicit_meta_agent(context, query):
    prompt = explicit_meta_agent_prompt_blueprint.format(conversation_context=context, query=query)
    transcript = "{}\nQuery: {}".format(context, query)
    return get_explicit_meta_agent(transcript).run(prompt)


async def run_explicit_meta_agent_async(context, query):
    prompt = explicit_meta_agent_prompt_blueprint.format(conversation_context=context, query=query)
    transcript = "{}\nQuery: {}".format(context, query)
    return await (get_explicit_meta_agent(transcript).arun(prompt))


if __name__ == '__main__':
    run_explicit_meta_agent("THIS IS THE CONTEXT", "FACT CHECK THAT CARS HAVE 4 WHEELS?")
