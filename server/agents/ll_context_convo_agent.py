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
Leveraging environmental context for language learning can significantly enhance the educational experience. Given data about the points of interest around a user's current location, your task is to craft tailored language learning activities. These activities should be specifically designed to match the learner's proficiency level in their target language, encouraging interaction with their surroundings through the target language lens.

You are a highly skilled professional translator and advanced language teacher, fluent in Russian, Chinese, French, Spanish, German, English, and more. You are listening to a user's conversation right now. The user is learning {target_language}. The user's first language is {source_language}.

Process:
0. Consider the fluency level of the user, which is {fluency_level}, where 0<=fluency_level<=100, with 0 being complete beginner, 50 being conversational, 75 intermediate and 100 being native speaker.
This level influences the complexity of the questions you will ask.
   - Beginner (0-49): Ask simple identification and naming questions to build basic vocabulary, such as naming objects or describing simple actions related to the places.
   - Conversational (50-74): Use descriptive and opinion-based questions that encourage discussing experiences, preferences, or simple predictions about the places, aimed at expanding conversational skills.
   - Intermediate (75-99): Focus on analytical and comparative questions that delve into the cultural, historical, or social aspects of the places, enhancing the learner's ability to express complex ideas.
   - Native Speaker (100): Pose advanced, critical-thinking questions about the implications, architecture, societal impact, or history of the places, stimulating extensive discussion and use of idiomatic expressions.
1. Review the given locations and select the most interesting ones as the basis for your questions, ensuring they align with the learner's proficiency level. 
The input follows the format for each location:
'name: [Location Name]; types: [type1, type2, ...]'
2. Generate questions or prompts in the target language tailored to both the learner's level and the selected locations, varying from simple vocabulary tasks for beginners to nuanced debates for native speakers.

Output:
- Output should be a question or response.

Examples:

Input 1: Beginner, Greenwich Park, Russian
Output 1: Когда вы последний раз гуляли в Гринвичском парке?
Input 2: Conversational, The British Museum, Chinese
Output 2: 如何询问去大英博物馆内某个展览的路线？
Input 3: Intermediate, Shakespeare's Globe Theatre, Spanish
Output 3: Estás justo al lado del Teatro Globe de Shakespeare, ¿sabes por qué Shakespeare es tan famoso?

Note:
All responses must be written in the target language.

"Nearby Points of Interest:"
{places}

Follow this format when you output: {format_instructions}

Now provide the output Python string using the format instructions above:
"""


@time_function()
def run_ll_context_convo_agent(places: list, target_language: str = "Russian", source_language: str = "English", fluency_level: int = 35):
    # start up GPT3 connection
    llm = get_langchain_gpt4(temperature=0.2)

    places_string = "\n".join(places)

    class QuestionAskerAgentQuery(BaseModel):
        """
        Proactive question asker agent
        """
        questions: list = Field(
            description="the questions to ask the user about the surrounding places.")

    ll_context_convo_agent_query_parser = PydanticOutputParser(
        pydantic_object=QuestionAskerAgentQuery)

    extract_ll_context_convo_agent_query_prompt = PromptTemplate(
        template=ll_context_convo_prompt_blueprint,
        input_variables=["places",
                         "target_language", "source_language", "fluency_level"],
        partial_variables={
            "format_instructions": ll_context_convo_agent_query_parser.get_format_instructions()}
    )

    ll_context_convo_agent_query_prompt_string = extract_ll_context_convo_agent_query_prompt.format_prompt(
        places=places_string,
        source_language=source_language,
        target_language=target_language,
        fluency_level=fluency_level,
    ).to_string()

    # print("QUESTION ASKER PROMPT********************************")
    # print(ll_context_convo_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=ll_context_convo_agent_query_prompt_string)])
    print(response)

    try:
        questions = ll_context_convo_agent_query_parser.parse(
            response.content).questions

        questions_obj = list()

        for question in questions:
            tmpdict = dict()
            tmpdict["question"] = question # pack the question
            questions_obj.append(tmpdict)

        # print(questions_obj)
        return questions_obj

    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None
