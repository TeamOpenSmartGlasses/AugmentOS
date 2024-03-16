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

adhd_stmb_prompt_blueprint = """You are an ADHD assistant which helps the user stay on track by maintaining an exocortical short term memory buffer which the user can view on their smart glasses during conversation.

You will receive 2 transcripts. The 'Context Transcript' is the entire recent conversation. This is to give you context.

The 'Recent Transcript` is the most recent transcript from the last topic change.

Your role is:
1. Output a boolean to tell us if the 'Recent Transcript` topic has recently changed. Use the 'Context Transcript' to inform you of the nature of the conversation to decide if the topic has truly changed.
2. If the topic has changed, output the three words that delineate the time roughly where the topic changed. Make sure those three words appear *exactly* as the appear in the input transcript (including punctuation, capitalization, etc.). Only recognize significant topic changes, we don't want to change the topic too frequently.
3. Output a summary of the 'Recent Transcript'. If the topic changed during the Recent Transcript, summarize only the text *after* the topic change, don't mention the first topic, only summarize the second topic (after the topic change).

Please output a 1 to 4 word summary of the input conversation text according to the given format.

Context Transcript:
```{context_transcript}```

Recent Transcript:
```{to_summarize_transcript}```

Output Format: {format_instructions}

Don't output punctuation or periods (do not include ?.,;) in your summary! Output all lowercase summaries! Your summary should be 1-4 words, don't output more than 4 words! Now provide the output:"""

#If the current summary of the 'Recent Transcript' is still correct, just re-output the current summary, don't output a new one.

@time_function()
def run_adhd_stmb_agent(to_summarize_transcript, context_transcript):
    # start up GPT3 connection
    #llm = get_langchain_gpt35(temperature=0.2, max_tokens=512)
    # start up GPT4 connection
    llm = get_langchain_gpt4(temperature=0.2, max_tokens=512)

    class AdhdStmbAgentQuery(BaseModel):
        """
        ADHD Short Term Memory Buffer agent
        """
        summary: str = Field(
            description="the summary of the Input Text")
        
        topic_change: bool = Field(
            description="True is the topic changed during the recent text, False if it did not change")

        topic_change_string: str = Field(
            description="3 words (verbatim from the recent transcript) from when the topic changed. Only provide words here if topic_change is True, otherwise, output an empty string here")

    adhd_stmb_agent_query_parser = PydanticOutputParser(
        pydantic_object=AdhdStmbAgentQuery)

    extract_adhd_stmb_agent_query_prompt = PromptTemplate(
        template=adhd_stmb_prompt_blueprint,
        input_variables=["to_summarize_transcript", "context_transcript"],
        partial_variables={
            "format_instructions": adhd_stmb_agent_query_parser.get_format_instructions()}
    )

    adhd_stmb_agent_query_prompt_string = extract_adhd_stmb_agent_query_prompt.format_prompt(
        to_summarize_transcript=to_summarize_transcript,
        context_transcript=context_transcript,
    ).to_string()

    #print("ADHD STMB PROMPT********************************")
    #print(adhd_stmb_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=adhd_stmb_agent_query_prompt_string)])
    print("ADHD AGENT RESPONSE ********************************")
    print(response)

    try:
        summary = adhd_stmb_agent_query_parser.parse(
            response.content).summary
        
        topic_change = adhd_stmb_agent_query_parser.parse(
            response.content).topic_change

        topic_change_string = adhd_stmb_agent_query_parser.parse(
            response.content).topic_change_string

        if topic_change:
            return summary, topic_change_string
        else:
            return summary, None
    except OutputParserException as e:
        print('parse fail')
        print(e)
        return None
