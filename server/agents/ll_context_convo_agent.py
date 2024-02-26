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


ll_context_convo_prompt_blueprint = """
You are an expert language teacher fluent in Russian, Chinese, French, Spanish, German, English, and more. You are listening to a user's conversation right now. The user is learning {target_language}. You help the language learner user by asking talking to them about their environment.

You identify interesting places around the user and converse with them about these places in their target language. You tailor your conversation to the user's fluency level. If the learner's fluency level is less than 50, use basic vocabulary and simple sentences If the learner's fluency level is between 50 and 75, introduce intermediate grammatical structures and a broader lexicon. If the learner's fluency level is greater than 75, engage in nuanced discourse and incorporating idiomatic expressions.

Target Language: {target_language}
Fluency Level: {fluency_level}

Process:
0. Consider the fluency level of the user, which is {fluency_level}, where 0<=fluency_level<=100, with 0 being complete beginner, 50 being conversational, 75 intermediate and 100 being native speaker.
1. Review the given locations and select the most interesting ones as the basis for your conversation, ensuring they align with the learner's proficiency level. 
The input follows the format for each location:
'name: [Location Name]; types: [type1, type2, ...]'
2. Generate a question or response in the target language tailored to both the learner's level and the selected locations, varying from simple vocabulary tasks for beginners to nuanced debates for native speakers.

Output:
- Output should be a question or response.

Examples:

Input 1: Beginner, Greenwich Park, Russian
Output 1: Когда вы последний раз гуляли в Гринвичском парке?
Input 2: Conversational, The British Museum, Chinese
Output 2: 如何询问去大英博物馆内某个展览的路线？
Input 3: Intermediate, Shakespeare's Globe Theatre, Spanish
Output 3: Estás justo al lado del Teatro Globe de Shakespeare, ¿sabes por qué Shakespeare es tan famoso?

"Nearby Points of Interest:"
{places}

Output Format: {format_instructions}

Now provide the output:
"""


@time_function()
def run_ll_context_convo_agent(places: list, target_language: str = "Russian", fluency_level: int = 35):
    # start up GPT3 connection
    llm = get_langchain_gpt4(temperature=0.2)

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
                         "target_language", "fluency_level"],
        partial_variables={
            "format_instructions": ll_context_convo_agent_query_parser.get_format_instructions()}
    )

    ll_context_convo_agent_query_prompt_string = extract_ll_context_convo_agent_query_prompt.format_prompt(
        places=places_string,
        target_language=target_language,
        fluency_level=fluency_level,
    ).to_string()

    # print("QUESTION ASKER PROMPT********************************")
    # print(ll_context_convo_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=ll_context_convo_agent_query_prompt_string)])
    print(response)

    try:
        response = ll_context_convo_agent_query_parser.parse(
            response.content).response

        response_obj = dict()
        response_obj["ll_context_convo_response"] = response # pack the response into a dictionary

        print("RESPONSE OBJ")
        print(response_obj)
        return response_obj

    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None
