from typing import Optional

# custom
from agents.agent_utils import format_list_data

# langchain
from langchain.prompts import PromptTemplate
from langchain.schema import (
    HumanMessage
)
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field
from helpers.time_function_decorator import time_function

from Modules.LangchainSetup import *

#pinyin
from pypinyin import pinyin, Style


ll_context_convo_prompt_blueprint = """
You are polyglot expert language teacher. You are listening to a user's conversation in their Target Language right now. You help the language learner user by talking to them about their environment.

You are listening to a user's conversation through Speech-To-Text, so expect some phonetic variations or inaccuracies in the input. When the user's speech is unclear due to TTS inaccuracies, look for phonetic similarities to guess the intended message. If you can't understand, don't hesitate to ask the user for clarification.

Target Language: {target_language}
Fluency Level: {fluency_level}

Process:
1. Assess Fluency: Consider the user's language proficiency, where 0 is a beginner, 50 conversational, 75 intermediate, and 100 a native speaker.
2. Select Locations: From a list in the format 'name: [Location Name]; types: [type1, type2, ...]'. If no locations are provided, focus on a general topic, not necessarily related to any location.
3. Maintain Relevance: Ensure the content is relevant to the ongoing conversation. If starting anew, base your question or response on the selected locations.
4. Tailor Content: Craft your output in the target language, appropriate to the learner's fluency level—from simple vocabulary for beginners to complex discussions for advanced learners.

Examples:
Input 1: 35, Starbucks Coffee, Russian
Output 1: Какой ваш любимый напиток в Starbucks Coffee?
Input 2: 52, [], French
Output 2: Que faites-vous actuellement pour vivre?
Input 3: 61, The British Museum, Chinese
Output 3: 如何询问去大英博物馆内某个展览的路线？

Nearby Points of Interest:
{places}

Here is the previous context:
{conversation_history}

Output Format: {format_instructions}

Now provide the output:
"""


@time_function()
def run_ll_context_convo_agent(places: list, target_language: str = "Russian", fluency_level: int = 35, conversation_history: Optional[list[dict[str, str]]] = None):
    # start up GPT3 connection
    llm = get_langchain_gpt35(temperature=0.3)

    places_string = "\n".join(places)

    class ContextConvoAgentQuery(BaseModel):
        """
        Proactive Context Convo Agent
        """
        response: str = Field(
            description="the question to ask the user about the surrounding places.")

    ll_context_convo_agent_query_parser = PydanticOutputParser(
        pydantic_object=ContextConvoAgentQuery)

    extract_ll_context_convo_agent_query_prompt = PromptTemplate(
        template=ll_context_convo_prompt_blueprint,
        input_variables=["places",
                         "target_language", "fluency_level", "conversation_history"],
        partial_variables={
            "format_instructions": ll_context_convo_agent_query_parser.get_format_instructions()}
    )

    ll_context_convo_agent_query_prompt_string = extract_ll_context_convo_agent_query_prompt.format_prompt(
        places=places_string,
        target_language=target_language,
        fluency_level=fluency_level,
        conversation_history=conversation_history,
    ).to_string()
    # print(ll_context_convo_agent_query_prompt_string)
    # print("QUESTION ASKER PROMPT********************************")
    # print(ll_context_convo_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=ll_context_convo_agent_query_prompt_string)])
    # print(response)

    try:
        response = ll_context_convo_agent_query_parser.parse(
            response.content).response

        def chinese_to_pinyin(chinese_text):
            return ' '.join([item[0] for item in pinyin(chinese_text, style=Style.TONE)])

        # Apply Pinyin conversion if target_language is "Chinese (Pinyin)"
        if target_language == "Chinese (Pinyin)":
            response = chinese_to_pinyin(response)

        response_obj = dict()
        response_obj["ll_context_convo_response"] = response # pack the response into a dictionary
        response_obj["to_tts"] = {"text": response, "language": target_language}

        print("LL CONTEXT CONVO RESPONSE: ")
        print(response_obj)
        return response_obj

    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None
