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

from prompts import question_asker_prompt_blueprint


@time_function()
def run_question_asker_agent(places: list, target_language: str = "Russian", source_language: str = "English", fluency_level: int = 35):
    # start up GPT3 connection
    llm = get_langchain_gpt35(temperature=0.2)

    places_string = "\n".join(places)

    class QuestionAskerAgentQuery(BaseModel):
        """
        Proactive question asker agent
        """
        questions: list = Field(
            description="the questions to ask the user about the surrounding places.")

    question_asker_agent_query_parser = PydanticOutputParser(
        pydantic_object=QuestionAskerAgentQuery)

    extract_question_asker_agent_query_prompt = PromptTemplate(
        template=question_asker_prompt_blueprint,
        input_variables=["places",
                         "target_language", "source_language", "fluency_level"],
        partial_variables={
            "format_instructions": question_asker_agent_query_parser.get_format_instructions()}
    )

    question_asker_agent_query_prompt_string = extract_question_asker_agent_query_prompt.format_prompt(
        places=places_string,
        source_language=source_language,
        target_language=target_language,
        fluency_level=fluency_level,
    ).to_string()

    print("QUESTION ASKER PROMPT********************************")
    print(question_asker_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=question_asker_agent_query_prompt_string)])
    print(response)

    try:
        questions = question_asker_agent_query_parser.parse(
            response.content).questions

        questions_obj = list()

        for question in questions:
            tmpdict = dict()
            tmpdict["question"] = question # pack the question
            questions_obj.append(tmpdict)

        print(questions_obj)
        return questions_obj

    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None
