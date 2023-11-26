from langchain.chat_models import ChatOpenAI
from server_config import openai_api_key, azure_openai_api_key, azure_openai_api_base, azure_openai_api_deployment
from langchain.chat_models.azure_openai import *
from constants import GPT_4_MODEL, GPT_4_MAX_TOKENS, GPT_TEMPERATURE

def get_langchain_gpt4(temperature=GPT_TEMPERATURE, model=GPT_4_MODEL, max_tokens=GPT_4_MAX_TOKENS):
    return ChatOpenAI(temperature=temperature, openai_api_key=openai_api_key, model=model, max_tokens=max_tokens)