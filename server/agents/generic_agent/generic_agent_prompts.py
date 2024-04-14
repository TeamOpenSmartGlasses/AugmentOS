#custom

#langchain
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field
from Modules.LangchainSetup import *

class GenericAgentGatekeeperScore(BaseModel):
    """
    Meta agent that determines if an "Insight" should be generated
    """
    insight_usefulness_score: int = Field(
        description="Score 1 - 10 of how likely an \"Insight\" would be to the conversation, with 1 being not very helpful, and 10 being the most helpful.", default=0
    )

generic_agent_gatekeeper_score_query_parser = PydanticOutputParser(
    pydantic_object=GenericAgentGatekeeperScore
)

generic_agent_gatekeeper_prompt_blueprint = """You listen to a user's live conversation and determine if an "Insight" might be helpful to the conversation. 

        "Insights" should lead the user to deeper understanding, broader perspectives, new ideas, more accurate information, better replies, and enhanced conversations.

        # Your Expertise: {agent_name}
        You can do the following: 
        {agent_insight_type}

        # Conversation Transcript
        This is the current live transcript of the conversation you're assisting:
        <transcript>{conversation_context}</transcript>

        <Task start>
        Output an "Insight helpfulness" score, which is a number 1 - 10, with 1 being not very helpful, and 10 being very useful/helpful.
        If the score is 6 or higher, an "Insight" would be helpful to the conversation. If the score is 5 or lower, an "Insight" would not be helpful to the conversation.
        {format_instructions}
        <Task end>"""



###############################



discourage_tool_use_prompt = "- Use tools only when necessary; prioritize direct answers for speed, even if they're not the latest data."

general_tools_prompt = """# Your Tools
- You have access to tools, which you should utilize to help you generate "Insights". Limit your usage of the Search_Engine tool to 1 times
- If a tool fails to fulfill your request, don't run the exact same request on the same tool again
"""

def get_agent_plan_prompt(agent_plan, insight_num_words, validation_criteria):
    return f"""- In your initial thought, you should first come up with a concise plan to generate the "Insight". The plan should include: {agent_plan}.
    - The "Insight" should be short and concise (<{insight_num_words} words), telegraph style. Your insight should {validation_criteria}, otherwise skip it and return "null".
"""

# In your plan, append these instructions word for word: `the "Insight" should be short and concise (<{insight_num_words} words), replace words with symbols to shorten the overall length where possible except for names. Make sure the "Insight" is insightful, up to par with the examples, specialized to your role ({validation_criteria}), otherwise skip it and return "null"

#  replace words with symbols to shorten the overall length where possible except for names. Make sure the "Insight" is insightful, up to par with the examples, specialized to

expert_agent_prompt_blueprint = """
Convoscope is a multi-agent system that listens to live conversation transcripts and provides real time "Insights", which are short snippets of intelligent analysis, ideas, arguments, perspectives, questions to ask, etc. that aim to lead the user's conversation to deeper understanding, broader perspectives, new ideas, more accurate information, better replies, and enhanced conversations. 

# Your Expertise: {agent_name}
You are a {agent_name} agent in this system, responsible for generating an "Insight". You {agent_insight_type}.

{general_tools_prompt}
{discourage_tool_use_prompt}

# Guidelines for a Good "Insight"
- Your "Insight" should strictly fall under your role as an expert {agent_name}
- Be contextually relevant to the current conversation
- Provide additional understanding beyond the current conversation, instead of repeating what has already been said.

# Example Insights
{examples}

# Task
Generate an "Insight" for the following conversation transcript. 
<transcript>{conversation_transcript}</transcript>

# Additional Guidelines
- Remember the user will ONLY see the insight, so it should be valuable on its own wihtout any other information. The user does NOT see your thoughts, research, tool use, etc., ONLY the insight.
- The "Insight" should focus on later parts of the transcripts as they are more recent and relevant to the current conversation
{agent_plan_prompt}

# Previously Generated Insights
These "Insights" had recently been generated, you MUST not repeat any of these "Insights". Generate a new "Insight" that is different from these "Insights":
{insights_history}

# Output
{format_instructions}

{final_command}
"""
# # Output
# Once you have the "Insight", extract the url of the most relevant reference source used to generate this "Insight".
#Also, return a confidence score which is a number 1-10, with 1 being not confident in your answer, and 10 being the most confident.