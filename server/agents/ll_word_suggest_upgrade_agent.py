# custom
from collections import defaultdict
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

#pinyin
from pypinyin import pinyin, Style

from Modules.LangchainSetup import *

#draft word suggestion upgrade prompt by Susanna
ll_word_suggest_upgrade_agent_prompt_blueprint="""
You are listening to a user's conversation right now. 
You help the language learner user by suggesting an "Upgrades", contextually relevant words or phrases the user might use later during the conversation. 
You output 1 words in the Target Language (the language they want to learn) and also output explanation of the word in the Source Language (the language they speak).
The system will take in the context of what is being discussed, where the user is, what’s happening around them, what the user’s goal is, etc. in order to suggest some words to them that they otherwise would not use.
The upgrade word and its meaning should never repeat with what's already in Input Text or Recently Suggested!
The output "upgrade word" should be more advanced and related synonym, idiom, or rare word

Target Language (learning): {target_language}
Source Language (already known): {source_language}
Fluency Level: {fluency_level}
Input Text: `{conversation_context}`
Frequency Ranking: The frequency percentile of each word tells you how common it is in daily speech (~0.1 is very common, >1.2 is rare, >13.5 is very rare). The frequency ranking of the words in the "Input Text" are: `{word_rank}`
Recently Suggested: `{live_upgrade_word_history}`
Output Format: {format_instructions}

If the learner's fluency level is less than 50, they will need Upgrades that are less advanced, a synonyms of one word from the Input Text(people use in daily life but are not used by learner).
If fluency level is 50-75 fluency level might suggest more advanced Upgrades (people do not use in Input Language, exclusively exist in Output Language in a unique way, like idiom/ culturally relevant phrases).
If fluency level is >75, only suggest Upgrades that are very rare words that appears in studies/ researches/ academic contexts/ ancient language that neither Input language user nor Output Language user use in ordinary lives.

Process:
0. Consider the fluency level of the user, which is {fluency_level}, where 0<=fluency_level<=100, with 0 being complete beginner, 50 being conversational, 75 intermediate and 100 being native speaker.
1. Skim through the {conversation_context} and come up with a new but conversation-relevant word to someone with a fluency level of {fluency_level} AND that have not been suggested as upgrade in {live_upgrade_word_history}.
2. Consider how common a word is (the word frequency percentile) to determine how likely the user knows that word.
3. For the upgrade word, provide the word in {target_language} and its meaning in {source_language}. Make them short. 
4. Output response using the format instructions below, provide words in the order they appear in the text. Don't suggest any Upgrade that are in {conversation_context}.

Examples:

Conversation 1: '她连续三年赢得奥林匹克赛的金牌，真是太强了'
Source Language 1: English
Target Language 1: Chinese
Fluency Level: >50
Output 1: {{"天下无敌":"invincible under the heaven"}}

Conversation 2: "Катализатор ускоряет химическую реакцию."
Source Language 2: Russian
Target Language 2: English
Fluency Level: >75
Output 2: {{"Autocatalytic":"цикл или путь"}}

Conversation 3: "Bonjour, comment ça va ?"
Source Language 3: English
Target Language 3: Spanish
Fluency Level: <50
Output 3: {{"salutations":"greetings"}}



Don't output punctuation or periods! Output all lowercase! Define 1/5 of the words in the input text (never define all of the words in the input, never define highly common words like "the", "a", "it", etc.). Now provide the output:
"""

#opposite language (either {source_language} or {target_language}, whatever is

#This level influences the selection of upgrade word:
#   - 0-49 (Beginner): suggest Upgrade word that is less advanced, meaning percentile rank >0.15 (people use in daily life but are not used by learner).
#   - 50-74 (Conversational): suggest more advanced Upgrade, meaning percentile rank >1.5 (people do not use in Input Language, exclusively exists in Output Language in a unique way, like idiom/ culturally relevant phrases).
#   - 75-100 (Intermediate): only suggest Upgrade that is very rare words, meaning percentile rank >30, which appears in studies/ researches/ academic contexts/ ancient language that neither Input language user nor Output Language user use in ordinary lives.



def format_list_data(data: dict) -> str:
    """
    Formats a dict into a string that can be used in a prompt
    """
    data_str = ""
    for key, value in data.items():
        data_str += f"{key} : {value}\n"
    return data_str


@time_function()
async def run_ll_word_suggest_upgrade_agent(conversation_context: str, word_rank: dict, target_language, transcribe_language, source_language, live_upgrade_word_history=""):
    # start up GPT4o connection
    llm = get_langchain_gpt4o(temperature=0.2, max_tokens=80)

    #remove punctuation

    # "It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    conversation_context = conversation_context
    fluency_level = 15  # Example fluency level
    #target_language = "Chinese (Pinyin)"
    #source_language = "English"
    remove_pinyin = " (Pinyin)"
    source_language.replace(remove_pinyin, "")
    target_language.replace(remove_pinyin, "")

    print("target_language")
    print(target_language)
    print("source language")
    print(source_language)

    class LLWordSuggestUpgradeAgentQuery(BaseModel):
        """
        Proactive language learning word suggest upgrade agent
        """
        upgrade_word_and_meaning: dict = Field(
            description="the suggested new upgrade word and its meaning")

    ll_word_suggest_upgrade_agent_query_parser = PydanticOutputParser(
        pydantic_object=LLWordSuggestUpgradeAgentQuery)

    extract_ll_word_suggest_upgrade_agent_query_prompt = PromptTemplate(
        template=ll_word_suggest_upgrade_agent_prompt_blueprint,
        input_variables=["conversation_context", "target_language", "source_language", "fluency_level", "word_rank", "live_upgrade_word_history"],
        partial_variables={
            "format_instructions": ll_word_suggest_upgrade_agent_query_parser.get_format_instructions()}
    )

    word_rank_string = format_list_data(word_rank)
    print("LL UPGRADE WORD RANK STRING:" + word_rank_string)
#     print("LANGUAGE LEARNING WORD RANK STRING:" + word_rank_string)

    ll_word_suggest_upgrade_agent_query_prompt_string = extract_ll_word_suggest_upgrade_agent_query_prompt.format_prompt(
        conversation_context=conversation_context,
        source_language=source_language,
        target_language=target_language,
        fluency_level=fluency_level,
        word_rank=word_rank_string,
        live_upgrade_word_history=live_upgrade_word_history
    ).to_string()

    print("ll word suggest upgrade PROMPT********************************")
    # print(ll_word_suggest_upgrade_agent_query_prompt_string)

    # print("Proactive meta agent query prompt string", ll_word_suggest_upgrade_agent_query_prompt_string)

    response = await llm.ainvoke(
        [HumanMessage(content=ll_word_suggest_upgrade_agent_query_prompt_string)])
    print(response)

    try:
        upgrade_word_and_meaning = ll_word_suggest_upgrade_agent_query_parser.parse(
            response.content).upgrade_word_and_meaning

        upgrade_word_and_meaning_obj = []
        live_upgrade_word_history_set = set(live_upgrade_word_history)  # Convert to set for efficient lookup
        print(conversation_context)
        for upgrade, meaning in upgrade_word_and_meaning.items():
            if (upgrade not in conversation_context and upgrade not in live_upgrade_word_history_set) and \
            (meaning not in conversation_context and meaning not in live_upgrade_word_history_set):
                upgrade_word_and_meaning_obj.append({"in_upgrade": upgrade, "in_upgrade_meaning": meaning})

        return upgrade_word_and_meaning_obj
    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None


if __name__ == "__main__":
    # "It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    conversation_context = "It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    word_rank = {"beautiful": 100, "library": 200, "house": 300}
    run_ll_word_suggest_upgrade_agent(conversation_context, word_rank)
