from wolframclient.evaluation import WolframLanguageSession
from wolframclient.language import wlexpr


class WolframTool:
    def __init__(self):
        self.session = WolframLanguageSession()

    def query(self, input_query):
        res = self.session.evaluate(wlexpr(input_query))
        return res
