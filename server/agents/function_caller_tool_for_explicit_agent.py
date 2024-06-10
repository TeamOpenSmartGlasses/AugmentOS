from langchain.agents import Tool
from agents.Tools.FunctionCallerTool import FunctionCallerTool


function_caller_tool = FunctionCallerTool()


def get_function_caller_tool_for_explicit_agent():
    function_caller_tool_for_explicit_agent = Tool(
        name="function_caller_tool",
        func=function_caller_tool.query,
        coroutine=function_caller_tool.a_query,
        description="""
        This tool is designed to call specific functions based on user queries. 
        It recognizes certain commands within a conversation and triggers the appropriate functions accordingly.

        Currently, the following queries are supported:
        - ll_cc_on: Start the Contextual Conversation process.
        - ll_cc_off: End the Contextual Conversation process.
        
        [Example Usage]
        Conversation: "I want to start a conversation."
        Output: "ll_cc_on"
        
        Conversation: "Please stop the contextual conversation."
        Output: "ll_cc_off"
        
        Conversation: "Begin contextual mode."
        Output: "ll_cc_on"
        
        Conversation: "End the LLCC conversation."
        Output: "ll_cc_off"
        """
    )

    return function_caller_tool_for_explicit_agent
