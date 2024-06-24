active_functions = [
    "Start_Contextual_Conversation",
    "Stop_Contextual_Conversation",
]


call_custom_function_tool_config = {
    "Start_Contextual_Conversation": {
        "function_name": "Start Contextual Conversation",
        "function_command": """ll_cc_on""",
        "successful_response": """Contextual conversation has been started.""",
        "example_usage": """
        Conversation: "I want to start a conversation."
        Action: "ll_cc_on"
        Output: "Final Answer: Executing Command - Start Contextual Conversation"

        Conversation: "Begin contextual mode."
        Action: "ll_cc_on"
        Output: "Final Answer: Executing Command - Start Contextual Conversation"
        """,
    },
    "Stop_Contextual_Conversation": {
        "function_name": "Stop Contextual Conversation",
        "function_command": """ll_cc_off""",
        "successful_response": """Contextual conversation has been ended.""",
        "example_usage": """
        Conversation: "Please stop the contextual conversation."
        Action: "ll_cc_off"
        Output: "Final Answer: Executing Command - Stop Contextual Conversation"
        
        Conversation: "End the conversation."
        Action: "ll_cc_off"
        Output: "Final Answer: Executing Command - Stop Contextual Conversation"
        """,
    },
}


def get_call_custom_function_tool_config():
    return {function_name: call_custom_function_tool_config[function_name] for function_name in active_functions}


def get_call_custom_function_tool_config_as_string():
    config = ""
    
    for function_name in active_functions:
        config += f"\n{function_name}:\n"
        config += f"""   - Command: {call_custom_function_tool_config[function_name]["function_command"]}\n"""
        config += f"""   - Successful Output: {call_custom_function_tool_config[function_name]["successful_response"]}\n"""
        config += f"""   - Example Usage: {call_custom_function_tool_config[function_name]["example_usage"]}\n"""
    
    return config