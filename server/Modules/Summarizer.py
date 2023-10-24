import os

# OpenAI imports
import openai
from summarizer.sbert import SBertSummarizer
from server_config import openai_api_key, use_azure_openai, azure_openai_api_key, azure_openai_api_base, azure_openai_api_deployment

openai.api_key = openai_api_key

### For use with Azure OpenAI ###
"""
# # # #
# TODO: NEED TO FIND WAY TO USE AZURE // OpenAI throughout codebase... need to separate the llm initialization code out
#       (just use OpenAI for now)
# # # #
if use_azure_openai:
    # print("$$$ USING AZURE OPENAI $$$")
    openai.api_key = azure_openai_api_key
    openai.api_base = azure_openai_api_base # your endpoint should look like the following https://YOUR_RESOURCE_NAME.openai.azure.com/
    openai.api_type = 'azure'
    openai.api_version = '2023-08-01-preview' # this may change in the future
    deployment_name = azure_openai_api_deployment # This will correspond to the custom name you chose for your deployment when you deployed a model. 
"""

summarizer_prompt = """You are an expert at summarizing text in a way that is contextually relevant to the current conversation. You are an intelligent agent that is a sybsytem of the intelligent agent called. "Convoscope". You are the summarization worker agent of "Definer" agent. "Convoscope" is a tool that listens to a user's live conversation and enhances their conversation by providing them with real time "Insights". The "Definer" agent defines rare words, concepts, places, concepts, etc. live in conversation. You are the summarizer part of the "Definer" agent. You will be given text to summarize and a context of the transcripts of the current conversation. You will also be given a description of an entity. You should generaet a contextually relevant description of that entity. The description should aim to lead the user to deeper understanding, broader perspectives, new ideas, more accurate information, better replies, and enhanced conversations. Make sure the definition doesn't tell the user things they already know - exact pertinent and relevant information from the definition in your super short summary.

Please summarize the following "entity description" text to 8 words or less, extracting the most important information about the entity.

    * Extract only the most important information about the entitiy, as summaries must be 8 words or less. 
    * The summary should be easy to parse very quickly. 
    * Leave out filler words. 
    * Don't write the name of the entity. 
    * Don't include the "Text to summarize" in your response.
    * Use less than 8 words for the entire summary. Be concise, brief, and succinct.
    * Do not hallucinate, do not make things up. Use the source text.

You will be given a "Conversational Context", which is the transcript from the live conversation. Use this to make the defintion contextually relevant and useful. The "Conversational Context" is not a source of truth, it's there to inform you of what is happening in the conversation so you know what information to extract from the "Entity definition" to put in your summary.

Entity definition to summarize:
```
{}
```

Conversational Context (DO NOT include this in the summary, just use it to help you make a contextually relevant summary of the entity definition above):
```
{}
```

Summary in 8 words or less:\n
"""

class Summarizer:

    def __init__(self, database_handler):
        self.database_handler = database_handler
        self.model = SBertSummarizer('paraphrase-MiniLM-L6-v2')

    def summarize_entity(self, entity_description: str, context: str = "", chars_to_use=1250):
        # shorten entity_description if too long
        entity_description = entity_description[:min(
            chars_to_use, len(entity_description))]

        # Check cache for summary first
        #cache_key = entity_description + ' c: ' + context
        #summary = self.database_handler.find_cached_summary(cache_key)
        #if summary:
        #    print("$$$ SUMMARY: FOUND CACHED SUMMARY")
        #    return summary

        # Summary does not exist. Get it with OpenAI
        # print("$$$ SUMMARY: SUMMARIZING WITH OPENAI")
        summary = self.summarize_entity_with_openai(entity_description, context)
        self.database_handler.save_cached_summary(entity_description, summary)
        return summary

    def summarize_entity_with_openai(self, entity_description: str, context: str = ""):
            prompt = summarizer_prompt.format(entity_description, context)
            
            if use_azure_openai and False:
                #messages = [{"role": "user", "content": prompt}]
                # chat_completion = openai.ChatCompletion.create(engine=deployment_name, messages=messages, temperature=0.5, max_tokens=20)
                #if chat_completion['choices'][0]['finish_reason'] == "content_filter":
                #    print("Microsoft content filter says hello")
                #response = chat_completion['choices'][0]['message']['content']
                print()
            else:
                #chat_completion = openai.Completion.create(model="text-davinci-002", prompt=prompt, temperature=0.5, max_tokens=20)
                chat_completion = openai.Completion.create(model="gpt-3.5-turbo-instruct", prompt=prompt, temperature=0.5, max_tokens=20)
                response = chat_completion.choices[0].text
            
            return response

    def summarize_description_with_bert(self, description, num_sentences=3):
        return self.model(description, num_sentences=num_sentences)
