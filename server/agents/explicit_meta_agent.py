from agents.search_tool_for_agents import get_search_tool_for_agents
from agents.expert_agent_configs import expert_agent_config_list, expert_agent_prompt_maker
from langchain.agents import initialize_agent
from langchain.agents.tools import Tool
from langchain.chat_models import ChatOpenAI
from server_config import openai_api_key
from langchain.agents import AgentType

llm = ChatOpenAI(temperature=0.5, openai_api_key=openai_api_key, model="gpt-4-0613")

#explictly respond to user queries
explicit_meta_agent_prompt_blueprint = """You are a highly intelligent, skilled, and helpful assistant that helps answer user queries that they make during their conversations.
agent 

[Conversation Transcript]
This is the current live transcript of the conversation you're assisting:
<Transcript start>{conversation_context}<Transcript end>

[Your Task]
Now use your tools and knowledge to answer the query to the best of your ability. The question or request you are to answer is the last (final) question/request posed by the human to you in the below 'Query'. Make your answer as concise and succinct as possible. Leave out filler words and redundancy to make the answer high entropy and as to-the-point as possible. Never answer with more than 240 characters, and try to make it even less than that. Most answers can be given in under 10 words.

[Query]
{query}
"""

#generate expert agents as tools (each one has a search engine, later make the tools each agent has programmatic)
def make_expert_agents_as_tools(transcript):
    tools = []
    expert_agents_list = list(expert_agent_config_list.values())
    for expert_agent in expert_agents_list:
        #make the expert agent with it own special prompt
        expert_agent_explicit_prompt = expert_agent_prompt_maker(expert_agent, transcript)

        #make the agent with tools
        expert_agent = initialize_agent(
            [
                get_search_tool_for_agents()
            ], 
            llm, 
            agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
            verbose=True)

        def run_expert_agent_wrapper(command):
            return expert_agent.run(expert_agent_explicit_prompt + '\n' + command)
    
        tools.append(expert_agent)
    return tools

def get_explicit_meta_agent(transcript):
    expert_agents_as_tools = make_expert_agents_as_tools(transcript)
    explicit_meta_agent_tools = expert_agents_as_tools
    explicit_meta_agent = initialize_agent(
            [explicit_meta_agent_tools], 
            llm, 
            agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, 
            max_iterations=10, 
            verbose=True)
    return explicit_meta_agent

def run_explicit_meta_agent(context, query):
    prompt = explicit_meta_agent_prompt_blueprint.format(conversation_context=context, query=query)
    transcript = "{}\nQuery: {}".format(context, query)
    return get_explicit_meta_agent(transcript).run(prompt)

