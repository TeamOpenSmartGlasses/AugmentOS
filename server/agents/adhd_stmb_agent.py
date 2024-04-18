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

adhd_stmb_prompt_blueprint = """You are an assistant that helps someone with ADHD stay on track in conversations by maintaining a short term memory buffer which the user can view on their smart glasses.

You will receive 2 transcripts. The 'Context Transcript' is the entire recent conversation. This is to give you context.

The 'Recent Transcript' is the most recent part of 'Context Transcript' since the last topic change.

Your role is:
1. Output a boolean if the 'Recent Transcript' topic has recently changed, using both the 'Context Transcript' AND the 'Previous Summary' to decide. Be strict about what you judge as topic changes: only detect significant topic changes, not very subtle ones. A new topic should only be detected toward the end of the 'Recent Transcript' if (1) the new topic summary is significantly different from the 'Previous Summary' (not another phrase to describe it, for example), (2) the topic has changed within the larger conversation context of the 'Context Transcript', and (3) there is a fair amount of text (3+ sentences) in the 'Recent Transcript' before the topic change.
2. If the topic has changed, output the three words that delineate where in the 'Recent Transcript' the topic changed. Make sure those three words appear *exactly* as they appear in the input transcript (including punctuation, capitalization, etc.). 
3. Output a summary of the 'Recent Transcript'. If the topic changed during the Recent Transcript, summarize only the text *after* the topic change.

Output a 1 to 4 word summary of the input conversation text according to the given format.

Context Transcript:
```{context_transcript}```

Recent Transcript:
```{to_summarize_transcript}```

Previous Summary:
```{previous_summary}```

Output Format: {format_instructions}

Don't output punctuation or periods (do not include ?.,;) in your summary! Output all lowercase summaries! Your summary should be 1-4 words, don't output more than 4 words! Now provide the output:"""

#If the current summary of the 'Recent Transcript' is still correct, just re-output the current summary, don't output a new one.

@time_function()
def run_adhd_stmb_agent(to_summarize_transcript, context_transcript, previous_summary):
    # start up GPT3 connection
    #llm = get_langchain_gpt35(temperature=0.2, max_tokens=512)
    # start up GPT4 connection
    llm = get_langchain_gpt4(temperature=0.2, max_tokens=48)

    class AdhdStmbAgentQuery(BaseModel):
        """
        ADHD Short Term Memory Buffer agent
        """
        summary: str = Field(
            description="summary of Input Text")
        
        topic_change: bool = Field(
            description="True if the topic changed during the recent text, False if it did not change")

        topic_change_string: str = Field(
            description="3 words (verbatim from 'Recent Transcript') from when the topic changed. Only provide words here if topic_change is True, otherwise, output an empty string here")

    adhd_stmb_agent_query_parser = PydanticOutputParser(
        pydantic_object=AdhdStmbAgentQuery)

    extract_adhd_stmb_agent_query_prompt = PromptTemplate(
        template=adhd_stmb_prompt_blueprint,
        input_variables=["to_summarize_transcript", "context_transcript", "previous_summary"],
        partial_variables={
            "format_instructions": adhd_stmb_agent_query_parser.get_format_instructions()}
    )

    adhd_stmb_agent_query_prompt_string = extract_adhd_stmb_agent_query_prompt.format_prompt(
        to_summarize_transcript=to_summarize_transcript,
        context_transcript=context_transcript,
        previous_summary=previous_summary
    ).to_string()

    #print("ADHD STMB PROMPT********************************")
    #print(adhd_stmb_agent_query_prompt_string)

    response = llm.invoke(
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
