import wolframalpha
from server_config import wolframalpha_api_key


class WolframAlphaTool:
    def __init__(self):
        try:
            self.client = wolframalpha.Client(wolframalpha_api_key)
        except Exception as e:
            print(f"Failed to initialize Wolfram Tool. Error: {e}")
            self.client = None

    def query(self, query: str) -> str:
        if self.client is None:
            return None

        response = self.client.query(query)
        answer = next(response.results).text
        
        return answer

    async def a_query(self, query: str) -> str:
        if self.client is None:
            return None

        response = self.client.query(query)
        answer = next(response.results).text
        
        return answer
