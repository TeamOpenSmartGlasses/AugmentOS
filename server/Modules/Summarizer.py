import os

# OpenAI imports
import openai
openai.api_key = os.environ['OPENAI_API_KEY']

ogPrompt= """Please summarize the following "entity description" text to 8 words or less, extracting the most important information about the entity. The summary should be easy to parse very quickly. Leave out filler words. Don't write the name of the entity. Use less than 8 words for the entire summary. Be concise, brief, and succinct.

            Example:
            [INPUT]
            "George Washington (February 22, 1732 – December 14, 1799) was an American military officer, statesman, and Founding Father who served as the first president of the United States from 1789 to 1797."

            [OUTPUT]
            First American president, military officer, Founding Father.

            Example:
            [INPUT]
            "ChatGPT is an artificial intelligence chatbot developed by OpenAI and released in November 2022. It is built on top of OpenAI's GPT-3.5 and GPT-4 families of large language models and has been fine-tuned using both supervised and reinforcement learning techniques."
            [OUTPUT]
            AI chatbot using GPT models.

            \n Text to summarize: \n{} \nSummary (8 words or less): """

class Summarizer:

    def __init__(self, databaseHandler):
        self.databaseHandler = databaseHandler

    def summarize_entity(self, entity_description: str, chars_to_use=1250):
        # shorten entity_description if too long
        entity_description = entity_description[:min(
            chars_to_use, len(entity_description))]

        # Check cache for summary first
        summary = self.databaseHandler.findCachedSummary(entity_description)
        if summary: 
            print("$$$ SUMMARY: FOUND CACHED SUMMARY")
            return summary
        
        # Summary does not exist. Get it with OpenAI
        print("$$$ SUMMARY: SUMMARIZING WITH OPENAI")
        summary = self.summarize_entity_with_openai(entity_description)
        self.databaseHandler.saveCachedSummary(entity_description, summary)
        return summary

    def summarize_entity_with_openai(self, entity_description: str):
            # make prompt
            # like "the" and "a" if they aren't useful to human understanding
            prompt = ogPrompt.format(entity_description)
            # print("Running prompt for summary: \n {}".format(prompt))
            chat_completion = openai.Completion.create(
                model="text-davinci-002", prompt=prompt, temperature=0.5, max_tokens=20)
            response = chat_completion.choices[0].text
            # print(response)
            return response