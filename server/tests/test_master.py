# %% [markdown]
# # Quickstart: Generating Insights using Langchain
# Here is how you can setup your own insight generator

from langchain.chat_models import ChatOpenAI
from langchain.chat_models import AzureChatOpenAI
from langchain.agents.tools import Tool
from langchain.prompts.chat import SystemMessage
from langchain.utilities import GoogleSerperAPIWrapper
serper_api_key = "e1102f25d8a807b8b18e7aa03482122ae4a55c68"
openai_api_key = "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"

search = GoogleSerperAPIWrapper(serper_api_key=serper_api_key)
llm = ChatOpenAI(temperature=0, openai_api_key=openai_api_key, model="gpt-4-0613")


# ## Tools for our agent
# We had decided to give our agents the ability to
# - Search for a query using the web
# - Scrape a page to find out more info

# Scraping tool
from bs4 import BeautifulSoup
import requests

banned_sites = ["calendar.google.com", "researchgate.net"]

def scrape_page(url: str, title: str):
    """Based on your observations from the Search_Engine, if you want more details from a snippet for a non-PDF page, pass this the page's URL and the page's title to scrape the full page and retrieve the full contents of the page."""
    
    print("Parsing: {}".format(url))
    if any(substring in url for substring in banned_sites):
        print("Skipping site: {}".format(url))
        return None
    else: 
        try:
            headers = {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
              'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
              'Accept-Encoding': 'none',
              'Accept-Language': 'en-US,en;q=0.8',
              'Connection': 'keep-alive',
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')
            text = " ".join([t.get_text() for t in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])])
            return {
                'url': url,
                'description': text.replace('|',''),
                'title': title.replace('|','')
            }
        except requests.RequestException as e:
            print(f"Failed to fetch {url}. Error: {e}")
            return {
                'url': url,
                'description': None,
                'title': title.replace('|','')
            }
        

# custom search tool, we copied the serper integration on langchain but we prefer all the data to be displayed in one json message

from typing import Any, List, Literal
import requests

k: int = 5
gl: str = "us"
hl: str = "en"
tbs = None
search_type: Literal["news", "search", "places", "images"] = "search"

def serper_search(
        search_term: str, search_type: str = "search", **kwargs: Any
    ) -> dict:
    headers = {
        "X-API-KEY": serper_api_key or "",
        "Content-Type": "application/json",
    }
    params = {
        "q": search_term,
        **{key: value for key, value in kwargs.items() if value is not None},
    }
    response = requests.post(
        f"https://google.serper.dev/{search_type}", headers=headers, params=params
    )
    response.raise_for_status()
    search_results = response.json()
    return search_results

def parse_snippets(results: dict) -> List[str]:
    result_key_for_type = {
        "news": "news",
        "places": "places",
        "images": "images",
        "search": "organic",
    }
    snippets = []
    if results.get("answerBox"):
        answer_box = results.get("answerBox", {})
        if answer_box.get("answer"):
            snippets.append(answer_box.get("answer"))
        elif answer_box.get("snippet"):
            snippets.append(answer_box.get("snippet").replace("\n", " "))
        elif answer_box.get("snippetHighlighted"):
            snippets.append(answer_box.get("snippetHighlighted"))

    if results.get("knowledgeGraph"):
        kg = results.get("knowledgeGraph", {})
        title = kg.get("title")
        entity_type = kg.get("type")
        if entity_type:
            snippets.append(f"{title}: {entity_type}.")
        description = kg.get("description")
        if description:
            snippets.append(description)
        for attribute, value in kg.get("attributes", {}).items():
            snippets.append(f"{title} {attribute}: {value}.")

    for result in results[result_key_for_type[search_type]][:k]:
        if "snippet" in result:
            snippets.append(str(result))
            # snippets.append(scrape_page(result["link"], result["title"]))
        # for attribute, value in result.get("attributes", {}).items():
        #     snippets.append(f"{attribute}: {value}.")

        # print(result)

    if len(snippets) == 0:
        return ["No good Google Search Result was found"]
    return snippets

def parse_results(results: dict) -> str:
        snippets = parse_snippets(results)
        results_string = ""
        for idx, val in enumerate(snippets):
            results_string += f"Result {idx}: " + val + "\n"
        return results_string

def custom_search(query: str, **kwargs: Any):

    results = serper_search(
            search_term=query,
            gl=gl,
            hl=hl,
            num=k,
            tbs=tbs,
            search_type=search_type,
            **kwargs,
        )

    return parse_results(results)
# Way to generate a random test input using transcripts from Lex Fridman's podcast
# Make sure you have the transcripts downloaded in the folder lex_whisper_transcripts

import test_on_lex

transcripts = test_on_lex.load_lex_transcripts(random_n=10, transcript_folder="./lex_whisper_transcripts/", chunk_time_seconds=20)

import random
def generate_test_input():
    idx = random.randint(0, 10)
    key = list(transcripts.keys())[idx]
    transcript = transcripts[key]
    trans_idx = random.randint(10, len(transcript)-10)
    latest = transcript[trans_idx:trans_idx+7]
    prev_transcripts, curr_transcripts = str.join(",", list(latest[0:5])), latest[5]
    # return f"""<Old Transcripts>
    # {prev_transcripts}
    # <New Transcripts>
    # {curr_transcripts}"""
    return prev_transcripts + "\n" + curr_transcripts

generate_test_input()


# Define the agent prompt here

generate_prompt = lambda x: f"""
I need some help with a task, you need to imagine the following scenario. I will first provide you some custom definitions to follow, your objective in this task, how the input is structured, and the final task.

<Scenario start>
[Definitions]
- "Insights": Intelligent analysis, ideas, arguments, questions to ask, and deeper insights that will help the user improve the flow within their conversations. 
- "Convoscope": a tool that listens to a user's live conversation and enhances their conversation flow by providing them with real time "Insights", which will often lead the user to deeper understanding, broader perspective, new ideas, and better replies. Convoscope has 2 independent components
1) a planner which will outline detailed steps for the insight generation process
2) an executor which will execute the steps

[Your Objective]
You are the "Insight" generator of "Convoscope". Your primary function is to outline a plan to generate an "Insight" for the user, based on live transcription streams of their ongoing conversation, and search for additional information to ensure that the "Insight" you generated is factual.

[User Live Transcript Structure]
You will receive inputs below which represent the current live conversation the user is having.
<Old Transcripts>
{{Previous transcripts from the conversation, which you should read to understand the short/mid term context of the conversation, to help figure out what information to provide the user.}}
<New Transcripts>
{{latest transcripts from the conversation, we should generate definitions and insights that will help the user based on the New Transcript.}}

[Example "Insights"]
The following are some examples of "Insights" that "Convoscope" generated for a given conversation. We prefer insights that highlights quantitative insights where possible.

User Conversation: At an expo, a competitor unveils a tech gadget boasting a new "nano-silicon" battery. A battery icon with an 'N' in its center appears on your glasses, with a subscript: "Nano-Silicon: +300% Capacity." Equipped with this insight, you gauge the competition's edge more accurately.
"Insight": "Nano-Silicon: +300% battery capacity"

User Conversation: A friend claims that the Keto diet is the most effective for rapid weight loss. As the debate heats up, your glasses flash a comparison chart of popular diets over a three-month period. While Keto shows initial rapid loss, another diet displays more sustainable results. You share this, shifting the conversation from short-term efficacy to long-term health benefits.
"Insight": "Keto: Rapid but short-term loss"

User Conversation: As the table discusses the viability of Mars colonization, someone skeptically mentions the resource cost. Your glasses project a concise infographic comparing the cost of space missions against their potential for resource discovery, like water or minerals on Mars. This propels the conversation from expenditure critique to the potential returns of such endeavors.
"Insight": "Mars: Potential water, mineral discovery"

User Conversation: A neighbor mentions buying only from brands that use recycled materials. Your glasses showcase a quick pie chart on a brand she mentions, depicting its material sources. While a chunk is recycled, a notable portion isn't. You gently introduce the topic of greenwashing in the industry, leading to a broader discussion on informed consumer choices.
"Insight": "Brand: Only 40% truly recycled"

User Conversation: In a workshop focused on wearable technology, a debate arises about the balance between functionality and cognitive load. Your glasses quickly reference several cognitive load theories and provide a visual overlay of optimal data chunks for quick consumption. This aids the team in determining just how much information a wearable should display at any given moment to be both useful and user-friendly.
"Insight": "Optimal: 3-7 word data chunks"

User Conversation: While discussing the cultural adaptation of voice assistants, a colleague wonders how regional accents influence user satisfaction. Your glasses aggregate global user reviews and present a correlation graph: regions with stronger accents tend to report lower satisfaction. This sparks a deeper dive into developing accent-inclusive training data for voice recognition.
"Insight": "Stronger accents: Lower voice-assist satisfaction"

<Task start>
I need you to help me generate a similar "Insight" based on the examples on top for the following conversation transcript. The "Insight" should be providing additional understanding beyond what is currently being said in the transcript, it shouldn't be plainly repeating what is being said in the transcripts.

In your initial thought, you should first come up with a plan to generate the "Insight". The plan should include
1. Identify the best "Insight" you could generate to enhance the user's conversation, preferably an "Insight" with quantitative data. The "Insight" should be providing additional understanding beyond what is currently being said in the transcript, it shouldn't be plainly repeating what is being said in the transcripts. Come up with a general description of the "Insight" to generate.
2. What information you need to generate the "Insight" (preferably quantitative data) and where to find the information
3. A final step to generate the insight. The insight should be summarized within 12 words and be in the format `Insight: {{Insert your "Insight" here}}`
<Task end>

<Transcript start>{x}<Transcript end>
<Scenario end>
"""


# Put the agent together here

from langchain.agents import initialize_agent
from langchain.agents import load_tools
from langchain.tools import StructuredTool
from langchain.agents import AgentType

agent_executor = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
        ),
        StructuredTool.from_function(scrape_page)
    ], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

# Put the agent together here

from langchain.agents import initialize_agent
from langchain.agents import load_tools
from langchain.tools import StructuredTool
from langchain.agents import AgentType

agent_executor = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events. It's a tool for understanding, navigating, and engaging with the digital world's vast knowledge.",
        ),
        # StructuredTool.from_function(scrape_page)
    ], llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

test_transcript = generate_test_input()
print(test_transcript)
agent_executor.run(generate_prompt(test_transcript))

generate_master_prompt = lambda x: f"""
You are the master agent of "Convoscope". "Convoscope" is a tool that listens to a user's live conversation and enhances their conversation by providing them with real time "Insights". The "Insights" you generate should aim to lead the user to deeper understanding, broader perspectives, new ideas, more accurate information, better replies, and enhanced conversations. 

[Your Objective]
"Convoscope" is a multi-agent system in which you are the master agent. You will be given direct access to a live stream of transcripts from the user's conversation. Your goal is to utilize your knowledge and tools to generate "Insights" for the user.

<Task start>
It's now time to generate an "Insight" for the following conversation transcript. The "Insight" should provide additional understanding beyond what is currently being said in the transcript, it shouldn't be plainly repeating what is being said in the transcripts. If a tool or agent fails to fulfill your request, don't run the same request on the same agent again. 

In your initial thought, you should first write down a plan to generate the "Insight". The plan should include
1. Read the incoming conversation transcript and identify the best "Insight" you could generate to enhance the user's conversation.  Come up with a general description of the "Insight" to generate.
2. What tool(s), agent(s), information you need to generate the "Insight".
3. A final step to almagamate your and your worker agent's work to generate the "Insight". The insight should be summarized within 12 words and be in the format `Insight: {{Insert your "Insight" here}}`
<Task end>

<Transcript start>{x}<Transcript end>
"""

# output_to_user = lambda x: print(">>>>>>>>>>PRINT TO USER: >>>>>>>>>>>>>>\n" + x + "\n>>>>>>>>>>END PRINT TO USER: >>>>>>>>>>>>>>\n")

# definer_agent = initialize_agent([
#         Tool(
#             name="Search_Engine",
#             func=custom_search,
#             description="Use this tool to search for definitions of an unknown word or slang or jargon",
#         ),
#         Tool(
#             name="Output_To_User",
#             func=output_to_user,
#             description="Use this tool to output the results to the user when you have definitions of a rare word or slang or jargon",
#         )
#     ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

agents = [[]]

statistician_agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Use this tool to search for statistics and facts about a topic. Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events.",
        ),
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def statistician_agent_wrapper(command):
    system_prompt = f"""You are a statistician agent.\n"""
    return statistician_agent.run(system_prompt + command)

devils_advocate_agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Use this tool to search for facts that might contradict the user's current conversation. Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events.",
        ),
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def devils_advocate_agent_wrapper(command):
    system_prompt = f"""\n"""
    return devils_advocate_agent.run(system_prompt + command)

fact_checker_agent = initialize_agent([
        Tool(
            name="Search_Engine",
            func=custom_search,
            description="Use this tool to search for statistics and facts about a topic. Pass this specific targeted queries and/or keywords to quickly search the WWW to retrieve vast amounts of information on virtually any topic, spanning from academic research and navigation to history, entertainment, and current events.",
        ),
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def fact_checker_agent_wrapper(command):
    system_prompt = f"""You are a fact checker agent.\n"""
    return fact_checker_agent.run(system_prompt + command)
    
master_agent = initialize_agent([
        # Tool(
        #     name="Definer_Agent",
        #     func=definer_agent.run,
        #     description="Use this tool to search for definitions of an unknown word or slang or jargon",
        # ),
        Tool(
            name="Statistician_Agent",
            func=statistician_agent_wrapper,
            description="""When to call this agent: Occurrences in a conversation where statistics and graphs would be useful to the user.""",
        ),
        Tool(
            name="Devils_Advocate_Agent",
            func=devils_advocate_agent_wrapper,
            description="""When to call this agent: When it would be useful for the user to see a devil’s advocate opinion (a steel-man argument supporting a viewpoint different from their own).""",
        ),
        Tool(
            name="Fact_Checker_Agent",
            func=fact_checker_agent_wrapper,
            description="""When to call this agent: If a statement is made which you suspect might be false, and that statement is falsifiable with free and public knowledge. Don't use this to verify your own search and ideas, only use this to verify the user's statements.""",
        )
    ], llm, agent=AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, max_iterations=10, verbose=True)

# %%
test_transcript = generate_test_input()
test_transcript

# %%
master_agent.run(generate_prompt(test_transcript))

# %%
test_transcript = generate_test_input()
test_transcript

# %%
master_agent.run(generate_prompt(test_transcript))

# %%


# %% [markdown]
# Next steps
# - Search engine
# - Pushing agents to do realistic things
# - Ideas
#   - Generate realistic insights
#   - Multiple insights ideas
#   - Only ask to find for data easy to find
#   - Make the plan less rigid, who should I ask for help and ideas?


