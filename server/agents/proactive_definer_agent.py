from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage
from langchain.chat_models import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field
from agents.agent_utils import format_list_data
from server_config import openai_api_key
from agents.search_tool_for_agents import asearch_google_knowledge_graph, search_url_for_entity_async
from Modules.LangchainSetup import *
import asyncio

proactive_rare_word_agent_prompt_blueprint = """
# Objective: 
Identify "Rare Entities" in a conversation transcript. These include rare words, phrases, jargons, adages, people, places, organizations, events etc that are not well known to the average high schooler, in accordance to current trends. You can also intelligently detect entities that are described in the conversation but not explicitly mentioned.

# Criteria for Rare Entities in order of importance:
1. Rarity: Select entities that are unlikely for an average high schooler to know. Well known entities are like Fortune 500 organizations, worldwide-known events, popular locations, and entities popularized by recent news or events such as "COVID-19", "Bitcoin", or "Generative AI".
2. Utility: Definition should help a user understand the conversation better and achieve their goals.
3. No Redundancy: Exclude definitions if already defined in the conversation.
4. Complexity: Choose terms with non-obvious meanings, such as "Butterfly Effect" and not "Electric Car".
5. Definability: Must be clearly and succinctly definable in under 10 words.
6. Searchability: Likely to have a specific and valid reference source: Wikipedia page, dictionary entry etc.

# Conversation Transcript:
<Transcript start>{conversation_context}<Transcript end>

# Output Guidelines:
Output an array:
entities: [{{ entity_name: string, definition: string, ekg_search_keyword: string }}], where definition is concise (< 12 words), and ekg_search_keyword as the best search keyword for the Google Knowledge Graph.  

## Additional Guidelines:
- Entity names should be quoted from the conversation, so the output definitions can be referenced back to the conversation.
- For the search keyword, use complete, official and context relevant keyword(s) to search for that entity. You might need to autocomplete entity names or use their official names or add additional context keywords to help with searchability, especially if the entity is ambiguous or has multiple meanings. For rare words, include "definition" in the search keyword.
- Definitions should use simple language to be easily understood.
- Select entities whose definitions you are very confident about, otherwise skip them.
- Multiple entities can be detected from one phrase, for example, "The Lugubrious Game" can be defined as a painting, and the rare word "lugubrious" is also worth defining.
- Limit results to {number_of_definitions} entities, prioritize rarity.
- Examples:
    - Completing incomplete name example: If the conversation talks about "Balmer" and "Microsoft", the keyword is "Steve Balmer", but the entity name would be "Balmer" because that is the name quoted from the conversation.
    - Replacing unofficial name example: If the conversation talks about "Clay Institute", the keyword is "Clay Mathematics Institute" since that is the official name, but the entity name would be "Clay Institute" because that is the name quoted from the conversation.
    - Adding context example: If the conversation talks about "Theory of everything", the keyword needs context keywords such as "Theory of everything (concept)", because there is a popular movie with the same name. 

## Recent Definitions:
These have already been defined so don't define them again:
{definitions_history}

## Example Output:
entities: [{{ entity_name: "Moore's Law", definition: "Computing power doubles every ~2 yrs", ekg_search_key: "Moore's Law" }}, {{ entity_name: "80/20 Rule", definition: "Productivity concept; Majority of results come from few causes", ekg_search_key: "Pareto Principle" }}]

{format_instructions} 
If no relevant entities are identified, output empty arrays.
"""

class Entity(BaseModel):
    name: str = Field(
        description="entity name",
    )
    definition: str = Field(
        description="entity definition",
    )
    ekg_search_keyword: str = Field(
        description="keyword to search for entity on Google Enterprise Knowledge Graph",
    )

class ConversationEntities(BaseModel):
    entities: list[Entity] = Field(
        description="list of entities and their definitions",
        default=[]
    )

proactive_rare_word_agent_query_parser = PydanticOutputParser(
    pydantic_object=ConversationEntities
)

def run_proactive_definer_agent(
    conversation_context: str, definitions_history: list = []
):
    # start up GPT4 connection
    llm = get_langchain_gpt4()

    extract_proactive_rare_word_agent_query_prompt = PromptTemplate(
        template=proactive_rare_word_agent_prompt_blueprint,
        input_variables=[
            "conversation_context",
            "definitions_history",
        ],
        partial_variables={
            "format_instructions": proactive_rare_word_agent_query_parser.get_format_instructions(),
            "number_of_definitions": "3", # this is a tradeoff between speed and results, 3 is faster than 5
        },
    )

    if len(definitions_history) > 0:
        definitions_history = format_list_data(definitions_history)
    else:
        definitions_history = "None"

    proactive_rare_word_agent_query_prompt_string = (
        extract_proactive_rare_word_agent_query_prompt.format_prompt(
            conversation_context=conversation_context,
            definitions_history=definitions_history,
        ).to_string()
    )

    # print("Proactive meta agent query prompt string", proactive_rare_word_agent_query_prompt_string)

    response = llm(
        [HumanMessage(content=proactive_rare_word_agent_query_prompt_string)]
    )

    # print("Proactive meta agent response", response)

    try:
        res = proactive_rare_word_agent_query_parser.parse(
            response.content
        )
        # we still have unknown_entities to search for but we will do them next time
        res = search_entities(res.entities)
        return res
    except OutputParserException:
        return None

def search_entities(entities: list[Entity]):
    search_tasks = []
    for entity in entities:
        # search_tasks.append(asearch_google_knowledge_graph(entity.ekg_search_keyword))
        search_tasks.append(search_url_for_entity_async("What is " + entity.ekg_search_keyword))
    
    loop = asyncio.get_event_loop()
    responses = asyncio.gather(*search_tasks)
    responses = loop.run_until_complete(responses)

    entity_objs = []
    for entity, response in zip(entities, responses):
        # print("response", str(response))
        res = dict()
        res["name"] = entity.name
        res["summary"] = entity.definition
        res.update(response)
        
        # if response is None:
        #     continue

        # for item in response.item_list_element:
        #     result = item.get("result")

        #     # get mid and start entry - assuming we always get a mid
        #     mid = None
        #     for identifier in result.get("identifier"):
        #         if identifier.get('name') == 'googleKgMID':
        #             mid = identifier.get('value')
        #             break

        #     if mid is None:
        #         continue

        #     res["mid"] = mid

        #     # get google cloud id
        #     cloud_id = result.get('@id')

        #     # get image
        #     if result.get('image'):
        #         image_url = result.get('image').get('contentUrl')
        #         # convert to actual image url if it's a wikipedia image
        #         # if "wiki" in image_url:
        #         # image_url = self.wiki_image_parser(image_url)
        #         res["image_url"] = image_url

        #     # res["name"] = result.get('name')
        #     res["category"] = result.get('description')

        #     # set our own types
        #     if any(x in ['Place', 'City', 'AdministrativeArea'] for x in result.get('@type')):
        #         res["type"] = "LOCATION"
        #     else:
        #         res["type"] = result.get('@type')[0].upper()

        #     detailed_description = result.get("detailedDescription")
        #     if detailed_description:
        #         res["url"] = detailed_description.get('url')

        entity_objs.append(res)
    
    return entity_objs
