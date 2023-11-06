from langchain.agents import Tool
from Tools.WolframAlphaTool import WolframAlphaTool


WolframAlpha_tool = WolframAlphaTool()

def get_wolfram_alpha_tool_for_agents():
    wolfram_client_tool_for_agents = Tool(
        name="WolframAlpha_Tool",
        func=WolframAlpha_tool.query,
        coroutine=WolframAlpha_tool.a_query,
        description="""
        Leverage the computational intelligence of Wolfram Alpha through this tool to perform complex calculations, 
        access reports and data across various domains such as mathematics, science, technology, and everyday life. 
        This tool offers an invaluable resource for in-depth analysis, problem-solving, and discovery.
        """
    )

    return wolfram_client_tool_for_agents
