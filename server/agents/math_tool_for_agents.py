from langchain.agents import Tool
from Tools.WolphramAlphaTool import WolframAlphaTool


def get_wolfram_client_tool_for_agents():
    wolfram_client_tool_for_agents = Tool(
        name="WolframAlpha_Tool",
        func=WolframAlphaTool().query,
        description="""
        Leverage the computational intelligence of Wolfram Alpha through this tool to perform complex calculations, 
        access reports and data across various domains such as mathematics, science, technology, and everyday life. 
        This tool offers an invaluable resource for in-depth analysis, problem-solving, and discovery.
        """
    )

    return wolfram_client_tool_for_agents
