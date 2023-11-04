from langchain.llms import OpenAI
from langchain.chains import LLMMathChain


class MathTool:
    def __init__(self):
        self.llm = OpenAI()
        self.chain = LLMMathChain(llm=self.llm)

    def apply(self, expression):
        predictions = self.chain.apply(expression)
        numeric_output = [float(p['answer'].strip().strip("Answer: ")) for p in predictions]
        return numeric_output
