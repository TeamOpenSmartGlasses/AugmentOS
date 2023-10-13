from langchain.chat_models import ChatOpenAI
from langchain.agents.tools import Tool
from langchain.prompts.chat import SystemMessage
from langchain.utilities import GoogleSerperAPIWrapper
from typing import Any, List, Literal
from server_config import openai_api_key, serper_api_key
import requests
import random
from langchain.agents import initialize_agent
from langchain.agents import load_tools
from langchain.tools import StructuredTool
from langchain.agents import AgentType
from agents.agent_tools import *
import agents.agent_prompts
import agents.agent_insights_process
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

search = GoogleSerperAPIWrapper(serper_api_key=serper_api_key)
llm = ChatOpenAI(temperature=0, openai_api_key=openai_api_key, model="gpt-4-0613")
# llm = OpenAI(openai_api_key=openai_api_key, model="gpt-4-0613")
# ## Tools for our agent
# We had decided to give our agents the ability to
# - Search for a query using the web
# - Scrape a page to find out more info

# Scraping tool
from bs4 import BeautifulSoup
import requests


agents = [[]]

statistician_agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Use this tool to search for statistics and facts about a topic. Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events.",
        ),
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def statistician_agent_wrapper(command):
    system_prompt = f"""You are a statistician agent.\n"""
    return statistician_agent.run(system_prompt + command)

devils_advocate_agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Use this tool to search for facts that might contradict the user's current conversation. Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events.",
        ),
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def devils_advocate_agent_wrapper(command):
    system_prompt = f"""\n"""
    return devils_advocate_agent.run(system_prompt + command)

fact_checker_agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Use this tool to search for statistics and facts about a topic. Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events.",
        ),
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def fact_checker_agent_wrapper(command):
    system_prompt = f"""You are a fact checker agent.\n"""
    return fact_checker_agent.run(system_prompt + command)
    
master_agent = initialize_agent([
        # Tool(
        #     name="Definer_Agent",
        #     func=definer_agent.run,
        #     description="Use this tool to search for definitions of an unknown word or slang or jargon",
        # ),
        Tool(
            name="Statistician_Agent",
            func=statistician_agent_wrapper,
            description="""When to call this agent: Occurrences in a conversation where statistics and graphs would be useful to the user.""",
        ),
        Tool(
            name="Devils_Advocate_Agent",
            func=devils_advocate_agent_wrapper,
            description="""When to call this agent: When it would be useful for the user to see a devil’s advocate opinion (a steel-man argument supporting a viewpoint different from their own).""",
        ),
        Tool(
            name="Fact_Checker_Agent",
            func=fact_checker_agent_wrapper,
            description="""When to call this agent: If a statement is made which you suspect might be false, and that statement is falsifiable with free and public knowledge. Don't use this to verify your own search and ideas, only use this to verify the user's statements.""",
        )
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=10, verbose=True)
