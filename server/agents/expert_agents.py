#langchain
from langchain.chat_models import ChatOpenAI
from langchain.agents.tools import Tool
from langchain.agents import initialize_agent
from langchain.agents import AgentType

#custom
from server_config import openai_api_key
from agents.expert_agent_configs import expert_agent_config_list, expert_agent_prompt_maker
from agents.search_tool_for_agents import get_search_tool_for_agents


#start up the agent blueprint
llm = ChatOpenAI(temperature=0.5, openai_api_key=openai_api_key, model="gpt-4-0613")
agent = initialize_agent([
        get_search_tool_for_agents(),
    ], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=3, early_stopping_method="generate", verbose=True)


def run_single_expert_agent(expert_agent_name, convo_context):
    #initialize the requested expert agent - using the name given
    expert_agent_config = expert_agent_config_list[expert_agent_name]
    #run the agent
    expert_agent_response = expert_agent_run_wrapper(expert_agent_config, convo_context)
    return expert_agent_response


async def expert_agent_arun_wrapper(expert_agent_config, convo_context):
    return {
        "agent_name": expert_agent_config["agent_name"],
        "agent_insight": await agent.arun(expert_agent_prompt_maker(expert_agent_config, convo_context))
    } 


def expert_agent_run_wrapper(expert_agent_config, convo_context):
    return {
        "agent_name": expert_agent_config["agent_name"],
        "agent_insight": agent.run(expert_agent_prompt_maker(expert_agent_config, convo_context))
    } 

