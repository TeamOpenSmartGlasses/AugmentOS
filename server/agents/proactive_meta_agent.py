#custom
from collections import defaultdict
from agents.expert_agent_configs import default_expert_agent_list
from agents.agent_utils import format_list_data
from server_config import openai_api_key
from constants import DEBUG_FORCE_EXPERT_AGENT_RUN
from agents.proactive_meta_agent_prompts import proactive_meta_agent_prompt_blueprint, proactive_meta_agent_gatekeeper_prompt_blueprint

#langchain
from langchain_community.callbacks import get_openai_callback
from langchain.prompts import PromptTemplate
from langchain.schema import (
    HumanMessage
)
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field
from helpers.time_function_decorator import time_function
import asyncio

from Modules.LangchainSetup import *

from DatabaseHandler import DatabaseHandler
dbHandler = DatabaseHandler(parent_handler=False)

force_run_agents_prompt = ""
if DEBUG_FORCE_EXPERT_AGENT_RUN:
    force_run_agents_prompt = "For this run, you MUST specify at least 1 expert agent to run. Do not output an empty list."

min_gatekeeper_score = 3

class ProactiveMetaAgentGatekeeperScore(BaseModel):
    """
    Meta agent that determines if an "Insight" should be generated
    """
    insight_usefulness_score: int = Field(
        description="Score 1 - 10 of how likely an \"Insight\" would be to the conversation, with 1 being not very helpful, and 10 being the most helpful.", default=0
    )

proactive_meta_agent_gatekeeper_score_query_parser = PydanticOutputParser(
    pydantic_object=ProactiveMetaAgentGatekeeperScore
)

class ProactiveMetaAgentQuery(BaseModel):
        """
        Proactive meta agent that determines which agents to run
        """
        agents_list: list = Field(
            description="the agents to run given the conversation context")

proactive_meta_agent_query_parser = PydanticOutputParser(pydantic_object=ProactiveMetaAgentQuery)

#generate expert agents as tools (each one has a search engine, later make the tools each agent has programmatic)
def make_expert_agents_prompts():
    expert_agents_descriptions_prompt = str()

    for idx, expert_agent in enumerate(default_expert_agent_list):
        expert_agents_descriptions_prompt += expert_agent.get_agent_info_for_proactive_agent(idx+1)

    return expert_agents_descriptions_prompt


@time_function()
def run_proactive_meta_agent_and_experts(conversation_context: str, insights_history: list, user_id: str):
    #run proactive agent to find out which expert agents we should run
    proactive_meta_agent_response = run_proactive_meta_agent(conversation_context, insights_history, user_id)

    if proactive_meta_agent_response:
        print("RUNNING THESE AGENTS")
        print(proactive_meta_agent_response)

    #do nothing else if proactive meta agent didn't specify an agent to run
    if proactive_meta_agent_response == [] or proactive_meta_agent_response == None:
        return []

    #parse insights history into a dict of agent_name: [agent_insights] so expert agent won't repeat the same insights
    insights_history_dict = defaultdict(list)
    for insight in insights_history:
        insights_history_dict[insight["agent_name"]].append(
            insight["agent_insight"])

    #get the configs of any expert agents we should run
    experts_to_run = [ea for ea in default_expert_agent_list if (ea.agent_name in proactive_meta_agent_response)]

    #run all the agents in parralel
    loop = asyncio.get_event_loop()
    agents_to_run_tasks = [expert_agent.run_agent_async(conversation_context, insights_history_dict[expert_agent.agent_name]) for expert_agent in experts_to_run]
    insights_tasks = asyncio.gather(*agents_to_run_tasks)
    insights = loop.run_until_complete(insights_tasks)
    return insights

@time_function()
def run_proactive_meta_agent(conversation_context: str, insights_history: list, user_id: str):
    #get expert agents descriptions
    expert_agents_descriptions_prompt = make_expert_agents_prompts()

    # Start small model for gatekeeper
    llm35 = get_langchain_gpt35()

    gatekeeper_score_prompt = PromptTemplate(
        template = proactive_meta_agent_gatekeeper_prompt_blueprint,
        input_variables = ["conversation_context", "expert_agents_descriptions_prompt", "force_run_agents_prompt"],
        partial_variables = {
            "format_instructions": proactive_meta_agent_gatekeeper_score_query_parser.get_format_instructions(),
        },
    )
    gatekeeper_score_prompt_string = (
        gatekeeper_score_prompt.format_prompt(
            conversation_context=conversation_context, 
            expert_agents_descriptions_prompt=expert_agents_descriptions_prompt,
            force_run_agents_prompt=force_run_agents_prompt
        ).to_string()
    )

    with get_openai_callback() as cb:
        # print("GATEKEEPER PROMPT STRING", gatekeeper_score_prompt_string)
        score_response = llm35.invoke(
            [HumanMessage(content=gatekeeper_score_prompt_string)]
        )
        gpt3cost = cb.total_cost

    try:
        content = proactive_meta_agent_gatekeeper_score_query_parser.parse(score_response.content)
        score = int(content.insight_usefulness_score)
        if score < min_gatekeeper_score: 
            print("SCORE BAD ({} < {})! GATEKEEPER SAYS NO!".format(str(score), str(min_gatekeeper_score)))
            return None
        print("SCORE GOOD ({} > {})! RUNNING GPT4!".format(str(score), str(min_gatekeeper_score)))
    except OutputParserException as e:
        print("ERROR: " + str(e))
        return None

    # Add this proactive query to history
    dbHandler.add_agent_insight_query_for_user(user_id, conversation_context)

    #start up GPT4 connection
    llm = get_langchain_gpt4(temperature=0.2)

    extract_proactive_meta_agent_query_prompt = PromptTemplate(
        template=proactive_meta_agent_prompt_blueprint,
        input_variables=["conversation_context", "expert_agents_descriptions_prompt", "insights_history", "force_run_agents_prompt"],
        partial_variables={
            "format_instructions": proactive_meta_agent_query_parser.get_format_instructions()}
    )

    if len(insights_history) > 0:
        insights_history=format_list_data(insights_history)
    else:
        insights_history="None"

    proactive_meta_agent_query_prompt_string = extract_proactive_meta_agent_query_prompt.format_prompt(
            conversation_context=conversation_context, 
            expert_agents_descriptions_prompt=expert_agents_descriptions_prompt,
            insights_history=insights_history,
            force_run_agents_prompt=force_run_agents_prompt
        ).to_string()

    # print("Proactive meta agent query prompt string", proactive_meta_agent_query_prompt_string)

    response = llm.invoke([HumanMessage(content=proactive_meta_agent_query_prompt_string)])
    try:
        expert_agents_to_run_list = proactive_meta_agent_query_parser.parse(response.content).agents_list
        return expert_agents_to_run_list
    except OutputParserException:
        return None

