import threading
from DatabaseHandler import DatabaseHandler
import time
import traceback
import multiprocessing
import os
import math
import uuid
import asyncio

from server_config import openai_api_key
from agent_configs import agent_config_list, agent_prompt_maker
from langchain.chat_models import ChatOpenAI
from langchain.agents.tools import Tool
from langchain.agents import initialize_agent
from langchain.agents import AgentType
from agent_tools import custom_search

llm = ChatOpenAI(temperature=0.5, openai_api_key=openai_api_key, model="gpt-4-0613")
agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
        ),
    ], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=3, early_stopping_method="generate", verbose=True)

def agent_arun_wrapper(agent_config, test_transcript):
    return {
        "agent_name": agent_config["agent_name"],
        "agent_insight": agent.run(agent_prompt_maker(agent_config, test_transcript))
    } 

def run_single_agent(agent_name, convo_context):
    #initialize the requested agent - using the name given
    agent_config = agent_config_list[agent_name]
    agent_response = agent_arun_wrapper(agent_config, convo_context)
    return agent_response
