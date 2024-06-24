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
ll_word_suggest_upgrade_prompt_blueprint="""
You are listening to a user's conversation right now. You help the language learner user by suggesting "Upgrades", contextually relevant new words or phrases from existing vocabulary/words context in the conversation transcript (Input Text), which the user might use during the current conversation. You output 1 words in both the input language and the output language.
The system will take in the context of what is being discussed, where the user is, what’s happening around them, what the user’s goal is, etc. in order to suggest some words to them that they otherwise would not use.
Words should be chosen based on the fluency of the user, and which words they often use. If a user often uses a word, it should not be suggested as an Upgrade. The best Upgrades are words that the user has seen before (in their studies) but hasn’t used yet (or doesn’t use regularly) which will help them learn to use that word in the real world.

If the learner's fluency level is less than 50, they will need Upgrades that are less advanced/ synonyms (people use in daily life but are not used by learner).
If fluency level is 50-75 fluency level might suggest more advanced Upgrades (people do not use in Input Language, exclusively exist in Output Language in a unique way, like idiom/ culturally relevant phrases).
If fluency level is >75, only suggest Upgrades that are very rare words that appears in studies/ researches/ academic contexts/ ancient language that neither Input language user nor Output Language user use in ordinary lives.

Input Text Language: {transcribe_language}
Output (translated) Language: {output_language}
Upgrade Words (phrases): {upgrade_words}
Fluency Level: {fluency_level}

Process:
0. Consider the fluency level of the user, which is {fluency_level}, where 0<=fluency_level<=100, with 0 being complete beginner, 50 being conversational, 75 intermediate and 100 being native speaker.
1. Skim through the Input Text and come up with a new but conversation-relevant word {upgrade_words} to someone with a fluency level of {fluency_level} AND that have not been said in the conversation.
2. Consider how common a word is (the word frequency percentile) to determine how likely the user knows that word.
3. For the upgrade word, provide in both {transcribe_language} and {output_language}. Make them short. Use context from the conversation to inform translation of homonyms.
4. Output response using the format instructions below, provide words in the order they appear in the text. Don't suggest any Upgrade that are in the "Recently Suggested" list of words.


Examples:

Conversation 1: 'I ran for the train, but the fruit stand was in the way'
Input Language 1: English
Output Language 1: Chinese
Output 1: {'upgrade': '高铁/gáo tiě',"meaning": 'high-speed rail'}

Conversation 2: "О, так вы студент биологии, это здорово"
Input Language 2: Russian
Output Language 2: English
Output 2: {'upgrade':#some russian upgrade,"meaning": #upgrade translation}

Conversation 3: "let's go and say hello to her"
Input Language 3: English
Output Language 3: Spanish
Output 3: {'upgrade':#some spanish upgrade, "meaning": #upgrade translation}

Input Text: `{conversation_context}`

Frequency Ranking: The frequency percentile of each word tells you how common it is in daily speech (~0.1 is very common, >1.2 is rare, >13.5 is very rare). The frequency ranking of the words in the "Input Text" are: `{word_rank}`

Recently Suggested: `{live_upgrade_word_history}`

Output Format: {format_instructions}

Don't output punctuation or periods! Output all lowercase! Define 1/5 of the words in the input text (never define all of the words in the input, never define highly common words like "the", "a", "it", etc.). Now provide the output:
"""

#opposite language (either {source_language} or {target_language}, whatever is

#This level influences the selection of upgrade word:
#   - 0-49 (Beginner): suggest Upgrade word that is less advanced, meaning percentile rank >0.15 (people use in daily life but are not used by learner).
#   - 50-74 (Conversational): suggest more advanced Upgrade, meaning percentile rank >1.5 (people do not use in Input Language, exclusively exists in Output Language in a unique way, like idiom/ culturally relevant phrases).
#   - 75-100 (Intermediate): only suggest Upgrade that is very rare words, meaning percentile rank >30, which appears in studies/ researches/ academic contexts/ ancient language that neither Input language user nor Output Language user use in ordinary lives.

#A word with frequency percentile 1.5 is a little uncommon, a word with percentile 0.15 is very common, a word with percentile >=30 is super rare. Use the percentile to determine words that the user might not know, where higer number is more rare.

#*** Never do intralanguage translation (don't translate within the same language).
# using the format instructions above:
#
#There should be 1 words per run in the dict. Don't output any explanation or extra data, just this simple info. It's OK to output zero words if there are no appopriately rare words in the input text.

#Don't suggest stop words or super common words like "yes", "no", "he", "hers", "to", "from", "thank you", "please", etc. in ANY language, but you can define even semi-common words like "exactly", "bridge", "computer", etc. for beginners with a fluency level less than 50 (current user fluency is {fluency_level}.

# Define lots of words, at least 1 per run.
#
#Conversation 4: "that museum’s architecture is very beautiful."
#Source Language 4: English
#Target Language 4: Chinese (Pinyin)
#Output 4: {{"museum" : "bówùguǎn", "architecture" : "jiànzhú", "beautiful" : "měilì"}}


#Preface Rule:
#Use Pinyin when writing Chinese. Never use Chinese characters, use Pinyin.
#, use Pinyin if writing Chinese)
#3.a. If writing Chinese, output exclusively in Pinyin, avoiding Chinese characters entirely.
#NEVER OUTPUT CHINESE CHARACTERS. USE PINYIN, USE THE LATIN ALPHABET PINYIN FOR CHINESE.

#Use Pinyin when writing Chinese. Never use Chinese characters, use Pinyin.

# in_word_translation must be in Pinyin or Latin characters.

# If writing Chinese, output exclusively in Pinyin, avoiding Chinese characters entirely.

def format_list_data(data: dict) -> str:
    """
    Formats a dict into a string that can be used in a prompt
    """
    data_str = ""
    for key, value in data.items():
        data_str += f"{key} : {value}\n"
    return data_str


@time_function()
async def run_ll_word_suggest_upgrade_agent(conversation_context: str, word_rank: dict, target_language="Russian", transcribe_language="English", source_language = "English", live_upgrade_word_history=""):
    # start up GPT4o connection
    llm = get_langchain_gpt4o(temperature=0.2, max_tokens=80)

    #remove punctuation

    # "It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    conversation_context = conversation_context
    fluency_level = 15  # Example fluency level
    #target_language = "Chinese (Pinyin)"
    #source_language = "English"
    remove_pinyin = " (Pinyin)"
    output_language = source_language.replace(remove_pinyin, "")
    if transcribe_language == source_language:
        output_language = target_language.replace(remove_pinyin, "")

    # print("transcribe_language")
    # print(transcribe_language)
    # print("output language")
    # print(output_language)

    class LLWordSuggestUpgradeAgentQuery(BaseModel):
        """
        Proactive language learning upgrade word suggest agent
        """
        translated_upgrade_words: dict = Field(
            description="the suggested new upgrade word and its translation")

    ll_word_suggest_upgrade_agent_query_parser = PydanticOutputParser(
        pydantic_object=LLWordSuggestUpgradeAgentQuery)

    extract_ll_word_suggest_upgrade_agent_query_prompt = PromptTemplate(
        template=ll_word_suggest_upgrade_agent_query_blueprint,
        input_variables=["conversation_context", "target_language", "transcribe_language", "output_language", "source_language", "fluency_level", "word_rank", "live_upgrade_word_history"],
        partial_variables={
            "format_instructions": ll_word_suggest_upgrade_agent_query_parser.get_format_instructions()}
    )

    word_rank_string = format_list_data(word_rank)
    # print("LANGUAGE LEARNING WORD RANK STRING:" + word_rank_string)
    #print("LANGUAGE LEARNING WORD RANK STRING:" + word_rank_string)

    ll_word_suggest_upgrade_agent_query_prompt_string = extract_ll_word_suggest_upgrade_agent_query_prompt.format_prompt(
        conversation_context=conversation_context,
        source_language=source_language,
        target_language=target_language,
        fluency_level=fluency_level,
        word_rank=word_rank_string,
        output_language=output_language,
        transcribe_language=transcribe_language,
        live_upgrade_word_history=live_upgrade_word_history
    ).to_string()

    # print("ll word suggest upgrade PROMPT********************************")
    # print(ll_word_suggest_upgrade_agent_query_prompt_string)

    # print("Proactive meta agent query prompt string", ll_word_suggest_upgrade_agent_query_prompt_string)

    response = await llm.ainvoke(
        [HumanMessage(content=ll_word_suggest_upgrade_agent_query_prompt_string)])
    #print(response)

    try:
        translated_upgrade_words = ll_word_suggest_upgrade_agent_query_parser.parse(
            response.content).translated_upgrade_words

        #drop too common words
        word_rank_threshold = 0.2
        translated_upgrade_words_rare = dict()
        for word, translation in translated_upgrade_words.items():
            if word in word_rank and word_rank[word] >= word_rank_threshold:
                translated_upgrade_words_rare[word] = translation

        #convert Chinese characters into Pinyin
        # Function to convert Chinese text to Pinyin
        def chinese_to_pinyin(chinese_text):
            return ' '.join([item[0] for item in pinyin(chinese_text, style=Style.TONE)])

        # Apply Pinyin conversion
        if "Pinyin" in target_language or "Pinyin" in source_language:
            #translated_upgrade_words_pinyin = {chinese_to_pinyin(word): chinese_to_pinyin(translated_upgrade_words[word]) for word in translated_upgrade_words_rare}
            translated_upgrade_words_pinyin = {chinese_to_pinyin(word): chinese_to_pinyin(translated_upgrade_words_rare[word]) if isinstance(translated_upgrade_words_rare[word], str) and any('\u4e00' <= char <= '\u9fff' for char in translated_upgrade_words_rare[word]) else translated_upgrade_words_rare[word] for word in translated_upgrade_words_rare}

        else:
            translated_upgrade_words_pinyin = translated_upgrade_words

        #drop any repeats and then pack into list(even though we prompt it not to, it often does repeats)
        translated_upgrade_words_obj = []
        #print(word_rank)
        live_upgrade_word_history_set = set(live_upgrade_word_history)  # Convert to set for efficient lookup
        for upgrade, upgrade_meaning in translated_upgrade_words_pinyin.items():
            if word not in live_upgrade_word_history_set:  # Check if word is not in the already translated words
                translated_upgrade_words_obj.append({"in_upgrade": upgrade, "in_upgrade_meaning": upgrade_meaning})

        return translated_upgrade_words_obj
    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None


if __name__ == "__main__":
    # "It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    conversation_context = "It's a beautiful day to be out and about at the library! And you should come to my house tomorrow!"
    word_rank = {"beautiful": 100, "library": 200, "house": 300}
    run_ll_word_suggest_upgrade_agent(conversation_context, word_rank)
