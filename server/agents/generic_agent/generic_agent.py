from agents.agent_utils import format_list_data
from langchain.agents import initialize_agent, load_tools
from langchain.agents.tools import Tool
from langchain.prompts import PromptTemplate
from langchain.agents import AgentType
from agents.search_tool_for_agents import get_search_tool_for_agents
from agents.math_tool_for_agents import get_wolfram_alpha_tool_for_agents
from Modules.LangchainSetup import *
from helpers.time_function_decorator import time_function
from agents.generic_agent.agent_insight import *

llm4 = get_langchain_gpt4()
llm35 = get_langchain_gpt35(temperature=0.0)

discourage_tool_use_prompt = "- Tools have a high time cost, so only use them if you must - try to answer questions without them if you can. If query asks for a stat or data that you already know, don't search for it, just provide it from memory, the speed of a direct answer is more important than having the most up-to-date information."

expert_agent_prompt_blueprint = """
## General Context
"Convoscope" is a multi-agent system that reads live conversation transcripts and provides real time "Insights", which are short snippets of intelligent analysis, ideas, arguments, perspectives, questions to ask, deeper insights, etc. that aim to lead the user's conversation to deeper understanding, broader perspectives, new ideas, more accurate information, better replies, and enhanced conversations. 

### Your Expertise: {agent_name}
You are a highly skilled and intelligent {agent_name} expert agent in this system, responsible for generating a specialized "Insight".
As the {agent_name} agent, you {agent_insight_type}.

### Your Tools
- You have access to tools, which you should utilize to help you generate "Insights". Limit your usage of the Search_Engine tool to 1 times.
- If a tool fails to fulfill your request, don't run the exact same request on the same tool again, and just continue without it.
{discourage_tool_use_prompt}

### Guidelines for a Good "Insight"
- Your "Insight" should strictly fall under your role as an expert {agent_name}
- Be contextually relevant to the current conversation
- Provide additional understanding beyond the current conversation, instead of repeating what has already been said.

### Example Insights
Here are some example "Insights" to help you learn the structure of a good "Insight". A summary is given instead of the entire transcript for brevity.
{examples}

## Task
Generate an "Insight" for the following conversation transcript. 
<Transcript start>{conversation_transcript}<Transcript end>

### Additional Guidelines
- Remember the user will ONLY see the insight, so it should be valuable on its own wihtout any other information. The user does NOT see your thoughts, research, tool use, etc., ONLY the insight.
- Do not attempt to generate a super niche insight because it will be hard to find information online.
- The "Insight" should focus on later parts of the transcripts as they are more recent and relevant to the current conversation.
- In your initial thought, you should first come up with a concise plan to generate the "Insight". The plan should include:
{agent_plan}. You are only able to make 1 quick action to generate the "Insight".
- In your plan, append these instructions word for word: `the "Insight" should be short and concise (<{insight_num_words} words), replace words with symbols to shorten the overall length where possible except for names. Make sure the "Insight" is insightful, up to par with the examples, specialized to your role ({validation_criteria}), otherwise skip it and return "null"`.

### Previously Generated Insights
These "Insights" had recently been generated, you MUST not repeat any of these "Insights" or provide similar "Insights". Generate a new "Insight" that is different from these "Insights":
{insights_history}

### Output
Once you have the "Insight", extract the url of the most relevant reference source used to generate this "Insight".
Also, return a confidence score which is a number 1-10, with 1 being not confident in your answer, and 10 being the most confident.
{format_instructions}

{final_command}
"""

class GenericAgent:

    def __init__(self, 
                 agent_name,
                 tools,
                 insight_num_words,
                 agent_insight_type,
                 agent_plan,
                 validation_criteria,
                 proactive_tool_description,
                 proactive_tool_example,
                 examples,
                 discourage_tool_use = False,
                 try_small_model_first = True,
                 small_model_confidence_threshold = 5) -> None:
        self.agent_name = agent_name
        self.tools = tools
        self.insight_num_words = insight_num_words
        self.agent_insight_type = agent_insight_type
        self.agent_plan = agent_plan
        self.validation_criteria = validation_criteria
        self.proactive_tool_description = proactive_tool_description
        self.proactive_tool_example = proactive_tool_example
        self.examples = examples

        self.discourage_tool_use = discourage_tool_use
        self.try_small_model_first = try_small_model_first
        self.small_model_confidence_threshold = small_model_confidence_threshold

        self.agent_small = initialize_agent([
            get_search_tool_for_agents(),
        ], llm35, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=3, early_stopping_method="generate", verbose=False)

        self.agent_large = initialize_agent([
            get_search_tool_for_agents(),
        ], llm4, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=3, early_stopping_method="generate", verbose=False)

    def get_agent_prompt(
        self,
        conversation_transcript,
        format_instructions="",
        insights_history: list = [],
        final_command="",
    ):
        # Populating the blueprint string with values from the agent_config dictionary
        if final_command != "":
            final_command = "\n\n" + final_command

        if len(insights_history) > 0:
            insights_history = format_list_data(insights_history)
        else:
            insights_history = "None"

        expert_agent_prompt = PromptTemplate(
            template=expert_agent_prompt_blueprint,
            input_variables=[
                "agent_name",
                "agent_insight_type",
                "discourage_tool_use_prompt",
                "examples",
                "conversation_transcript",
                "agent_plan",
                "insight_num_words",
                "validation_criteria",
                "insights_history",
                "final_command"
            ],
            partial_variables={
                "format_instructions": format_instructions,
            },
        )

        expert_agent_prompt_string = (
             expert_agent_prompt.format_prompt(
                **vars(self),
                final_command=final_command,
                conversation_transcript=conversation_transcript,
                insights_history=insights_history,
                discourage_tool_use_prompt=discourage_tool_use_prompt if self.discourage_tool_use else "",
                format_instructions=format_instructions,
             ).to_string()
        )

        print("expert_agent_prompt\n\n", expert_agent_prompt_string)

        return expert_agent_prompt_string 
    
    def run_agent_wrapper_async(self, agent, agent_explicit_prompt):
        async def run_expert_agent_wrapper_async(command):
            return await agent.arun(agent_explicit_prompt + '\n[Extra Instructions]\n' + command)

        return run_expert_agent_wrapper_async

    def get_agent_as_tool(self, transcript):
        # make the expert agent with it own special prompt
        expert_agent_explicit_prompt = self.get_agent_prompt(transcript)

        agent_tools = []

        if "Search_Engine" in self.tools:
                agent_tools.append(get_search_tool_for_agents())
        if "Wolfram_Alpha" in self.tools:
                agent_tools.append(get_wolfram_alpha_tool_for_agents())

        # make the agent with tools
        new_expert_agent = initialize_agent(agent_tools, llm4, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True, max_iterations=4, handle_parsing_errors=True)

        # use function factory to make expert agent runner wrapper
        run_expert_agent_wrapper = self.run_agent_wrapper_async(new_expert_agent, expert_agent_explicit_prompt)

        return Tool(
            name=self.agent_name,
            func=run_expert_agent_wrapper,
            coroutine=run_expert_agent_wrapper,
            description="Use this tool when: " + self.proactive_tool_description
        )

    #
    # Below: Used by proactive meta agent
    #
    
    def get_agent_info_for_proactive_agent(self, index):
        prompt = ""
        prompt += f"\n- Agent {index}:\n"
        prompt += f"""   - Name: {self.agent_name}\n"""
        prompt += f"""   - When to call: {self.proactive_tool_description}\n"""
        prompt += f"""   - Example insight generated: {self.proactive_tool_example}\n"""
        return prompt

    @time_function()
    async def run_agent_async(self, convo_context, insights_history: list):
        prompt_str = self.get_agent_prompt(convo_context, format_instructions=agent_insight_parser.get_format_instructions(), insights_history=insights_history)
        confidence_score = -1
        small_insight = None
        expert_agent_response = None

        if self.try_small_model_first:
            print("Attempting query w/ small model first")
            expert_agent_response = await self.run_simple_llm_async(convo_context, insights_history)
            if expert_agent_response and 'confidence_score' in expert_agent_response:
                confidence_score = expert_agent_response['confidence_score']
            if expert_agent_response and 'agent_insight' in expert_agent_response:
                small_insight = expert_agent_response['agent_insight']

        if expert_agent_response is None or confidence_score < self.small_model_confidence_threshold or small_insight == "null":
            res = await self.agent_large.ainvoke({"input": prompt_str})
            expert_agent_response = res['output']

        if expert_agent_response is None:
            return None

        #post process the output
        # print("BEFORE POST PROCESS, RESPONSE: " + str(expert_agent_response))
        expert_agent_response = post_process_agent_output(expert_agent_response, self.agent_name)

        # print("END: expert_agent_response", expert_agent_response)
        
        return expert_agent_response
    
    async def run_simple_llm_async(self, convo_context, insights_history: list):
        prompt_str = self.get_agent_prompt(convo_context, format_instructions=agent_insight_parser.get_format_instructions(), insights_history=insights_history)
        res = await llm35.ainvoke([HumanMessage(content=prompt_str)])
        response = agent_insight_parser.parse(res.content)
        response = response.dict()
        return response