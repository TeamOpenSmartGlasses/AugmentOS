# custom
from collections import defaultdict
from agents.search_tool_for_agents import get_search_tool_for_agents
from agents.expert_agent_configs import (
    expert_agent_config_list,
    expert_agent_prompt_maker,
    format_list_data,
)
from agents.expert_agents import expert_agent_arun_wrapper
from server_config import openai_api_key

# langchain
from langchain.agents import initialize_agent
from langchain.chat_models import ChatOpenAI
from langchain.agents import AgentType
from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain import PromptTemplate, LLMChain
from langchain.schema import AIMessage, HumanMessage, SystemMessage
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field, validator
from typing import List, Optional

import asyncio

# proactively decides which agents to run and runs them
proactive_rare_word_agent_prompt_blueprint = """
[Your Objective]
You are a "Rare Term Identifier", your role is to enhance conversations by identifying rare entities such as terms, concepts, places, organizations, or notable celebrities that may not be commonly known but could be significant to the conversation's depth and understanding. You are given a live stream of conversation transcripts, your goal is to implicitly detect the goal of the conversation and rare terms in the conversation. 

Then from there, we want to select rare terms that participants are likely unfamiliar with or would benefit from learning about, and assess their potential relevance to the conversation. If an entity is both rare and relevant, you will list it for further definition processing.

[Term Identification Criteria]
1. Rarity: The term must not be commonly known to the general public or to the conversation participants.
2. Relevance or usefulness: The term should have the potential to significantly enhance and provide value to the conversation's depth or understanding.

[Example]
I will provide an example, using a short conversation and the rare terms it contains, and the final rare terms that were selected, with a rationale for why they were selected.
Conversation Summary: Lex Fridman interviews Dr. Emily Chen, an expert in ethical AI, focusing on integrating ethics into AI algorithms and their societal impact.
Rare Terms/Entities: [Lex Fridman, Emily Chen, Ethical AI, Algorithmic Bias, Utilitarianism in AI, GANs, Quantum Computing]
Selected Terms: [Ethical AI, Algorithmic Bias, Utilitarianism in AI]
Explanation: Chosen as words are directly related to the main theme of ethical considerations in AI development

[Conversation Transcript]
Here is the current live transcript of the conversation you're monitoring:
<Transcript start>{conversation_context}<Transcript end>

[Recent Definition History]
Here are the recent definitions that have already been defined. There is no need to define the same entity again:
{definitions_history}

<Task start>Based on the criteria, output an array of strings, each representing a rare and potentially useful entity detected in the conversation. If no relevant entities are identified, output an empty array. {format_instructions}
<Task end>"""

# , but they're expensive to run, so only specify agents that will be helpful


def run_proactive_rare_word_agent_and_definer(
    conversation_context: str, definitions_history: list = []
):
    # run proactive agent to find out which expert agents we should run
    proactive_rare_word_agent_response = run_proactive_rare_word_agent(
        conversation_context, definitions_history
    )

    # do nothing else if proactive meta agent didn't specify an agent to run
    if proactive_rare_word_agent_response == []:
        return []

    # pass words to define to definer agent
    print("proactive_rare_word_agent_response", proactive_rare_word_agent_response)
    pass

    # # get the configs of any expert agents we should run
    # experts_to_run_configs = list()
    # for expert_to_run in proactive_rare_word_agent_response:
    #     experts_to_run_configs.append(expert_agent_config_list[expert_to_run])

    # # run all the agents in parralel
    # loop = asyncio.get_event_loop()
    # agents_to_run_tasks = [
    #     expert_agent_arun_wrapper(
    #         expert_agent_config,
    #         conversation_context,
    #         definitions_history,
    #     )
    #     for expert_agent_config in experts_to_run_configs
    # ]
    # insights_tasks = asyncio.gather(*agents_to_run_tasks)
    # insights = loop.run_until_complete(insights_tasks)
    # return insights


class ProactiveRareWordAgentQuery(BaseModel):
    """
    Proactive rare word agent that identifies rare terms in a conversation context
    """

    to_define_list: list = Field(
        description="the rare terms to define",
    )


proactive_rare_word_agent_query_parser = PydanticOutputParser(
    pydantic_object=ProactiveRareWordAgentQuery
)


def run_proactive_rare_word_agent(conversation_context: str, definition_history: list):
    # start up GPT4 connection
    llm = ChatOpenAI(
        temperature=0.2, openai_api_key=openai_api_key, model="gpt-3.5-turbo"
    )

    extract_proactive_rare_word_agent_query_prompt = PromptTemplate(
        template=proactive_rare_word_agent_prompt_blueprint,
        input_variables=[
            "conversation_context",
            "definitions_history",
        ],
        partial_variables={
            "format_instructions": proactive_rare_word_agent_query_parser.get_format_instructions()
        },
    )

    if len(definitions_history) > 0:
        definitions_history = format_list_data(definitions_history)
    else:
        definitions_history = "None"

    proactive_rare_word_agent_query_prompt_string = (
        extract_proactive_rare_word_agent_query_prompt.format_prompt(
            conversation_context=conversation_context,
            definitions_history=definitions_history,
        ).to_string()
    )

    # print("Proactive meta agent query prompt string", proactive_rare_word_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=proactive_rare_word_agent_query_prompt_string)]
    )
    try:
        definitions_to_define_list = proactive_rare_word_agent_query_parser.parse(
            response.content
        ).to_define_list
        return definitions_to_define_list
    except OutputParserException:
        return None
