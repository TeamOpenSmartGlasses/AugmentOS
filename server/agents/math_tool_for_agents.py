from langchain.agents import Tool
from Tools.MathTool import MathTool, WolframTool

def get_math_tool_for_agents():
    math_tool_for_agents = Tool(
        name="Math_Tool",
        func=MathTool().apply,
        description="Perform mathematical operations"
    )
    return math_tool_for_agents


def get_wolfram_client_tool_for_agents():
    wolfram_client_tool_for_agents = Tool(
        name="Wolfram_Tool",
        func=WolframTool().query,
        description="Query Wolfram Alpha"
    )
    return wolfram_client_tool_for_agents
