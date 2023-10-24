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


def clean_expert_agent_output(expert_agent_response):
    #for consistency, the final response starts with "Insight: ", let's remove that
    if expert_agent_response == "null": 
        expert_agent_response = None
    else:
        expert_agent_response = expert_agent_response[len("Insight:"):]
        if expert_agent_response == "null": 
            expert_agent_response = None
    return expert_agent_response


def run_single_expert_agent(expert_agent_name, convo_context, insights_history: list):
    #initialize the requested expert agent - using the name given
    expert_agent_config = expert_agent_config_list[expert_agent_name]
    #run the agent
    expert_agent_response = expert_agent_run_wrapper(expert_agent_config, convo_context, insights_history)
    #clean the output
    expert_agent_response = clean_expert_agent_output(expert_agent_response)

    return expert_agent_response


async def expert_agent_arun_wrapper(expert_agent_config, convo_context, insights_history: list):
    #get agent response
    expert_agent_response = await agent.arun(expert_agent_prompt_maker(expert_agent_config, convo_context, insights_history))
    #clean the output
    expert_agent_response = clean_expert_agent_output(expert_agent_response)
    return {
        "agent_name": expert_agent_config["agent_name"],
        "agent_insight": expert_agent_response
        } 


def expert_agent_run_wrapper(expert_agent_config, convo_context, insights_history: list):
    #get agent response
    expert_agent_response = agent.run(expert_agent_prompt_maker(expert_agent_config, convo_context, insights_history))
    #clean the output
    expert_agent_response = clean_expert_agent_output(expert_agent_response)
    return {
        "agent_name": expert_agent_config["agent_name"],
        "agent_insight": expert_agent_response
    } 

