import wolframalpha
from langchain.agents import Tool
from agents.Tools.WolframAlphaTool import WolframAlphaTool
from server_config import wolframalpha_api_key


WolframAlpha_tool = WolframAlphaTool()


def get_wolfram_alpha_tool_for_agents():
    wolfram_client_tool_for_agents = Tool(
        name="WolframAlpha_Tool",
        func=WolframAlpha_tool.query,
        coroutine=WolframAlpha_tool.a_query,
        description="""
        Utilize this tool to harness the computational and data retrieval capabilities of Wolfram Alpha. 
        It enables you to perform detailed calculations, access structured data, and find solutions to 
        complex problems in various domains, including mathematics, science, technology, and everyday life.
        With this tool, you can deepen your analysis and enrich you problem-solving abilities.
        """
    )

    return wolfram_client_tool_for_agents
