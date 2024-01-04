# OpenAI imports
import openai
from server_config import openai_api_key, use_azure_openai, azure_openai_api_key, azure_openai_api_base, azure_openai_api_gpt35_deployment


if use_azure_openai:
    openai.api_key = azure_openai_api_key
    openai.api_base = azure_openai_api_base # your endpoint should look like the following https://YOUR_RESOURCE_NAME.openai.azure.com/
    openai.api_type = 'azure'
    openai.api_version = '2023-08-01-preview' # this may change in the future
    deployment_name = azure_openai_api_gpt35_deployment # This will correspond to the custom name you chose for your deployment when you deployed a model. 
else:
    openai.api_key = openai_api_key


def one_off_query(prompt, max_tokens=30):
    response = "Alex was here :)"

    if use_azure_openai:
        messages = [{"role": "user", "content": prompt}]
        chat_completion = openai.ChatCompletion.create(engine=deployment_name, messages=messages, max_tokens=max_tokens)
        if chat_completion['choices'][0]['finish_reason'] == "content_filter":
            response = "Microsoft content filter says hello"
        else:
            response = chat_completion['choices'][0]['message']['content'].replace('\n', '').replace(' .', '.').strip()
    else:
        messages = [{"role": "user", "content": prompt}]
        chat_completion = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=messages,
            max_tokens=max_tokens,
            temperature=0,
        )

        response = chat_completion.choices[0].message["content"]
    
    return response
