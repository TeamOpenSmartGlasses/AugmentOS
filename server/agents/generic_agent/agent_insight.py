from pydantic import BaseModel, Field
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from helpers.time_function_decorator import time_function

class AgentInsight(BaseModel):
        """
        Query for an insight generation process
        """
        agent_insight: str = Field(
             description="the short Insight", default="null")
        reference_url: str = Field(
             description="the url used to generate this insight, otherwise empty string", default="")
        confidence_score: int = Field(
               description="1-10 score of how confident you are with your response", default=5)

agent_insight_parser = PydanticOutputParser(pydantic_object=AgentInsight)

@time_function()
def post_process_agent_output(expert_agent_response, agent_name):
     #agent output should be like
     #{"agent_insight": "null" | "insight", "reference_url": "https://..." | ""}
     
     try:
          #handle null response
          if expert_agent_response is None or expert_agent_response == "null" or type(expert_agent_response) == str:
               return None
          
          #response is already a dict from langchain internals
          #but we want to check again, so we stringify the response and parse
          #we need to parse this way because str replaces the double quotes with single quotes
          str_response = "{"
          for k,v in expert_agent_response.items():
               v = str(v).replace('"', '')
               str_response += f'"{k}": "{v}", '
          str_response = str_response[:-2] + "}"

          expert_agent_response = agent_insight_parser.parse(str_response)
          expert_agent_response = expert_agent_response.dict()

          #clean insight
          agent_insight = expert_agent_response["agent_insight"]

          # handle null insight
          if "null" in agent_insight:
               return None
          
          #remove "Insight: " preface from insight # remove leading/ending whitespace/newlines
          expert_agent_response["agent_insight"] = agent_insight.replace("Insight: ", "").strip()

          # add agent name to the json obj
          expert_agent_response["agent_name"] = agent_name

          return expert_agent_response
     
     except OutputParserException as e:
          print(e)
          return None