from typing import Optional
import warnings


class FunctionCallerTool:
    def __init__(self):
        pass

    def query(self, query: str) -> Optional[str]:
        pass

    async def a_query(self, query: str) -> Optional[str]:
        if query is None:
            warnings.warn("Mira made a query with None value.")
            return "Query is None. Please provide a valid query."
        
        response = None
        
        print("####### MIRA MADE A QUERY #######")
        match query:
            case "ll_cc_on":
                print("ll_cc_on")
                response = "Starting Contextual Conversation"
            case "ll_cc_off":
                print("ll_cc_off")
                response = "Ending Contextual Conversation"
            case _:
                warnings.warn(f"Mira made an unsupported query: {query}")
                response = f"Unsupported query: {query}, allowed queries are: ll_cc_on, ll_cc_off"

        return response