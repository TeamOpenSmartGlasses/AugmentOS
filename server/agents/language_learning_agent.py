#custom
from collections import defaultdict
from agents.agent_utils import format_list_data
from server_config import openai_api_key

#langchain
from langchain.chat_models import ChatOpenAI
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

language_learning_agent_prompt_blueprint = """
The aim is to help the language learner to understand new words in the context of real conversations. This helps them learn the words, and it helps the follow along with the dialog. Only a few words are translated so the language learner can rely on their built-in knowledge for as much of the target language as possible.

You are a highly skilled proffesional translator and advanced language teacher, fluent in Russian, Chinese, French, Spanish, German, English, and more. You are listening to a user's conversation right now. The user is learning {target_language}. The user's first language is {source_language}.

If the input text is in the target language, your translation is in the source language. If input text is in the source language, translate to target language.

You identify vocabulary that the user might not know and then tranlsate only that vocabulary. You should *only* translate words you think the learner doesn't know. Outputting 0 or only 1 translations is OK (4 maximum). If the learner's score is <50, they will probably need every few words defined. 50-75 fluency might need 1 word per sentence. 75+, only more rare words, once every few minutes.

Process:

0. Consider the fluency level of the user, which is {fluency_level}, where 0<=fluency_level<=100, with 0 being complete beginner, 50 being conversation, 75 intermediate and 100 being native speaker
1. Consider the rank of the words in the conversation segment. The rank of the words is a number between 1 and 30000 determines how common the word is in the language. The lower the rank, the more common the word is in the language. Use the rank to determine rare words that the user might not know.
2. Skim through the conversation segment and identify 0 to 4 words that may unfamiliar to someone with a fluency level of {fluency_level}.
3. For each of the zero to three identified word in the input text, provide a 1-2 word translation in the opposite language (try to make translations as short as posible). Use context clues from the conversation to inform your translations.
4. Output Python dictionary only. The keys are the words in the same language as the input language (rare, understandality relevant words), and the values are the translation of those words into the non-input language. There should be <= 4 object in the dict. Don't output any explanation or extra data, just this simple python list. ONLY OUTPUT JUST THE PYTHON DICT.


Rank of the words in the conversation segment:
{word_rank}


Examples:

Conversation 1: "I ran for the train, but the fruit stand was in the way"
Output 1: {{"train" : <translation>, "fruit stand" : translation}}
Conversation 2: "Oh, so you're a student of biology, that's great"
Output 2: {{"student" : <translation>, "biology" : translation}}
Conversation 3: "I love to look at the stars and think of my family"
Output 3: {{"stars" : <translation>}}

Input text (from live conversation transcript):
```{conversation_segment}```
Follow this format when you output: {format_instructions}

Now provide the output Python dict:
"""


def format_list_data(data: dict) -> str:
    """
    Formats a dict into a string that can be used in a prompt
    """
    data_str = ""
    for key, value in data.items():
        data_str += f"{key} : {value}\n"
    return data_str


@time_function()
def run_language_learning_agent(conversation_context: str, word_rank: dict): #, insights_history: list):
    #start up GPT3 connection
    llm = get_langchain_gpt35(temperature=0.2)

    conversation_segment = conversation_context #"It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    fluency_level = 20  # Example fluency level
    target_language = "English"
    source_language = "Russian"

    class LanguageLearningAgentQuery(BaseModel):
        """
        Proactive language learning agent
        """
        translated_words: dict = Field(
            description="the target language words translated into source language words")

    language_learning_agent_query_parser = PydanticOutputParser(pydantic_object=LanguageLearningAgentQuery)

    extract_language_learning_agent_query_prompt = PromptTemplate(
        template=language_learning_agent_prompt_blueprint,
        input_variables=["conversation_context", "target_language", "source_language", "fluency_level"],
        partial_variables={
            "format_instructions": language_learning_agent_query_parser.get_format_instructions()}
    )

    word_rank_string = format_list_data(word_rank)

    language_learning_agent_query_prompt_string = extract_language_learning_agent_query_prompt.format_prompt(
            conversation_context=conversation_context, 
            source_language=source_language,
            target_language=target_language,
            fluency_level=fluency_level,
            conversation_segment=conversation_segment,
            word_rank=word_rank_string
        ).to_string()

    # print("Proactive meta agent query prompt string", language_learning_agent_query_prompt_string)

    response = llm([HumanMessage(content=language_learning_agent_query_prompt_string)])
    print(response)
    try:
        translated_words = language_learning_agent_query_parser.parse(response.content).translated_words
        return translated_words 
    except OutputParserException:
        return None
