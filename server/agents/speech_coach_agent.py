# custom
from collections import defaultdict
from server_config import openai_api_key

# langchain
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema import (
    HumanMessage
)
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field
from helpers.time_function_decorator import time_function

from Modules.LangchainSetup import *

speech_coach_prompt_blueprint = """You are an ADHD assistant which helps the user stay on track by maintaining an exocortical short term memory buffer which the user can view on their smart glasses during conversation.

You will receive 2 transcripts. The 'Context Transcript' is the entire recent conversation. This is to give you context.

The 'Recent Transcript` is the most recent transcript from the last topic change.

Your role is:
1. Output a boolean to tell us if the 'Recent Transcript` topic has recently changed. Use the 'Context Transcript' to inform you of the nature of the conversation to decide if the topic has truly changed.
2. If the topic has changed, output the three words that delineate the time roughly where the topic changed. Make sure those three words appear *exactly* as the appear in the input transcript (including punctuation, capitalization, etc.). Only recognize significant topic changes, we don't want to change the topic too frequently.
3. Output a summary of the 'Recent Transcript'. If the topic changed during the Recent Transcript, summarize only the text *after* the topic change, don't mention the first topic, only summarize the second topic (after the topic change).

Please output a 1 to 4 word summary of the input conversation text according to the given format.

Recent Transcript:
```{transcription}```

Output Format: {format_instructions}

Don't output punctuation or periods (do not include ?.,;) in your summary! Output all lowercase summaries! Your summary should be 1-4 words, don't output more than 4 words! Now provide the output:"""

#If the current summary of the 'Recent Transcript' is still correct, just re-output the current summary, don't output a new one.

@time_function()
def run_speech_coach_agent(transcription):
    # start up GPT3 connection
    #llm = get_langchain_gpt35(temperature=0.2, max_tokens=512)
    # start up GPT4 connection
    llm = get_langchain_gpt4(temperature=0.2, max_tokens=512)

    class SpeechCoachAgentQuery(BaseModel):
        """
        ADHD Short Term Memory Buffer agent
        """        
        has_filler_words: bool = Field(
            description="True if the input text has filler words, False otherwise. Examples of filler words include: 'um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically', 'literally', 'seriously', 'honestly', 'truly', 'obviously', 'somewhat', 'kind of', 'sort of', 'a lot', 'lots of'. Make sure not to confuse proper use of the word with filler words. For example, 'like' can be used as a filler word, but it can also be used as a verb or a preposition. If the word is used as a verb or preposition, it is not.")

        number_of_filler_words: int = Field(
            description="The number of filler words in the input text. If there are no filler words, output 0.")

    speech_coach_agent_query_parser = PydanticOutputParser(
        pydantic_object=SpeechCoachAgentQuery)

    extract_speech_coach_agent_query_prompt = PromptTemplate(
        template=speech_coach_prompt_blueprint,
        input_variables=["transcription"],
        partial_variables={
            "format_instructions": speech_coach_agent_query_parser.get_format_instructions()}
    )

    speech_coach_agent_query_prompt_string = extract_speech_coach_agent_query_prompt.format_prompt(
        transcription=transcription,
    ).to_string()

    #print("ADHD STMB PROMPT********************************")
    #print(adhd_stmb_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=speech_coach_agent_query_prompt_string)])
    print("SPEECH COACH AGENT RESPONSE ********************************")
    print(response)

    try:
        has_filler_words = speech_coach_agent_query_parser.parse(
            response.content).has_filler_words

        number_of_filler_words = speech_coach_agent_query_parser.parse(
            response.content).number_of_filler_words

        print("Number of most recent filler words: ", number_of_filler_words)
        return number_of_filler_words
        # if has_filler_words:
        #     return number_of_filler_words
        # else:
        #     return "0"
    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None
