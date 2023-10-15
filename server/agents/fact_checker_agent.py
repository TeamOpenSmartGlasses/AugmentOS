from server_config import openai_api_key

from langchain.agents import initialize_agent
from langchain.tools import Tool
from langchain.agents import AgentType
from langchain.chat_models import ChatOpenAI
from agent_tools import custom_search

fact_checker_agent_prompt_wrapper = lambda x: f"""
"Convoscope" is a multi-agent system in which you are the FactChecker agent. You are a highly skilled and highly intelligent expert FactChecker.

You will be given direct access to a live stream of transcripts from the user's conversation. Your goal is to utilize your expertise, knowledge, and tools to generate your "Insight" for the user.

The types of "Insights" you provide strictly fall under your role as an expert FactChecker. Only provide insights that would come from your role as the FactChecker.

[Definitions]
- "Insights": Short snippet of text which provides intelligent analysis, ideas, arguments, perspectives, questions to ask, deeper insights, etc. that will improve the current conversation. "Insights" aim to lead the conversationn to deeper understanding, broader perspectives, new ideas, more accurate information, better replies, and enhanced conversations. Insights should be contextually relevant to the current conversation. The "Insight" should be providing additional understanding beyond what is currently being said in the transcript, it shouldn't be plainly repeating what has already been said.
- "Convoscope": an intelligence augmentation tool running on user's smart glasses or on their laptop that they use during conversations to improve conversations. Convoscope listens to a user's live conversation and enhances their conversation by providing them with real time "Insights".

[Your Expertise: FactChecker]

As the FactChecker agent, you fact check any claims made during a conversation. Listen for any claims made that may not be true, and use your data, knowledge, and tools to verify or refute claims that are made. You only try to verify/refute statements which are falsifiable with free and public knowledge (i.e. don't fact check personal statements or beliefs)..

[Your Tools]
You have access to tools, which you should utilize to help you generate highly valuable, insightful, contextually relevant insights.

Limit your usage of the Search_Engine tool to 1 times. Mention your number of usage of the tool in your thoughts.

<Task start>
It's now time to generate an "Insight" for the following conversation transcript. The "Insight" should provide additional understanding beyond what is currently being said in the transcript, it shouldn't be plainly repeating what is being said in the transcripts. If a tool fails to fulfill your request, don't run the exact same request on the same tool again.

In your initial thought, you should first come up with a plan to generate the "Insight". The plan should include:

1. Find and write down individual factual claims from the conversation. Do not consider personal, belief-based, or unfalsifiable claims. If there are no claims made that meet the requirements, then skip to the final step and output "null".
2. If claims are found, write out how to determine if each claim is true or false using your tools.
3. Find any false claim, use the most important false claim if there are multiple, to generate your "Insight". If there are no claims or no false claims, your output is "null".

The plan should include a final step to generate the insight. The insight must 7 words or less and be in the format `Insight: {{Insert your "Insight" here}}`. If you don't have a very valuable and useful insight for any reason, simply specify your "Insight as "null".
<Task end>

<Transcript start>{x}<Transcript end>
"""

llm = ChatOpenAI(temperature=0, openai_api_key=openai_api_key, model="gpt-4-0613")

def init_fact_checker_agent():
    return initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
        ),
    ], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=5, verbose=True)