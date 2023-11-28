from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage
from langchain.chat_models import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from langchain.schema import OutputParserException
from pydantic import BaseModel, Field
from agents.agent_utils import format_list_data
from server_config import openai_api_key
from agents.search_tool_for_agents import asearch_google_knowledge_graph
import asyncio

proactive_rare_word_agent_prompt_blueprint = """
# Objective: 
Identify "Rare Entities" in a conversation transcript. These include specialized terms, jargon, and specific entities (people, places, organizations, events) that are significant within their domains but not broadly known.

# Criteria for Rare Entities:
- No Redundancy: Exclude if already defined in the conversation.
- Clear Definition: Must have a standalone, clear definition.
- Rarity: Select niche and not well-known entities.
- Complexity: Choose terms with non-obvious meanings.
- Definability: Must be succinctly definable in under 10 words.
- Searchability: Should have a Wikipedia page.
- Relevance: Must enhance the conversation's depth.

# Conversation Transcript:
<Transcript start>{conversation_context}<Transcript end>

# Recent Definitions:
These have already been defined so don't define them again:
{definitions_history}

# Task:
Output two arrays:
1. 'entities': [{{ entity: string, definition: string }}], with entity as a well-understood term and definition is concise (< 12 words) 
2. `unknown_entities`: [string], list of unfamiliar entities needing more research for definition. Add context keywords to help with searchability.

# Additional Guidelines:
- Provide Context: Add context keywords to help with searchability.
- Use simple language: Make definitions easy to understand.
- For entities, make sure that you are confident in their definitions and know they are not made up, don't approximate.
- For unknown entities, don't include long phrases or sentences.

# Example Output:
{{ entities: [{{ entity: "Moore's Law", definition: "Computing power doubles every ~2 yrs" }}], unknown_entities: ["Samuel Paria (actor)", "Freiran (anime, car)"] }}

{format_instructions} 
If no relevant entities are identified, output empty arrays.
"""

class Entity(BaseModel):
    entity: str = Field(
        description="entity name",
    )
    definition: str = Field(
        description="entity definition",
    )

class ConversationEntities(BaseModel):
    entities: list[Entity] = Field(
        description="list of entities and their definitions",
        default=[]
    )
    unknown_entities: list[str] = Field(
        description="list of search terms for unknown entities",
        default=[]
    )

proactive_rare_word_agent_query_parser = PydanticOutputParser(
    pydantic_object=ConversationEntities
)

def run_proactive_definer_agent(
    conversation_context: str, definitions_history: list = []
):
    # start up GPT4 connection
    llm = ChatOpenAI(
        temperature=0,
        openai_api_key=openai_api_key,
        model="gpt-4-1106-preview",
    )

    extract_proactive_rare_word_agent_query_prompt = PromptTemplate(
        template=proactive_rare_word_agent_prompt_blueprint,
        input_variables=[
            "conversation_context",
            "definitions_history",
        ],
        partial_variables={
            "format_instructions": proactive_rare_word_agent_query_parser.get_format_instructions()
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

    print("Proactive meta agent response", response)

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
        search_tasks.append(asearch_google_knowledge_graph(entity.entity + " " + entity.definition))
    
    loop = asyncio.get_event_loop()
    responses = asyncio.gather(*search_tasks)
    responses = loop.run_until_complete(responses)

    entity_objs = []
    for idx, response in enumerate(responses):
        # print("response", str(response))
        res = dict()
        res["name"] = entities[idx].entity
        res["summary"] = entities[idx].definition

        if response is None:
            continue

        for item in response.item_list_element:
            result = item.get("result")

            # get mid and start entry - assuming we always get a mid
            mid = None
            for identifier in result.get("identifier"):
                if identifier.get('name') == 'googleKgMID':
                    mid = identifier.get('value')
                    break

            if mid is None:
                continue

            res["mid"] = mid

            # get google cloud id
            cloud_id = result.get('@id')

            # get image
            if result.get('image'):
                image_url = result.get('image').get('contentUrl')
                # convert to actual image url if it's a wikipedia image
                # if "wiki" in image_url:
                # image_url = self.wiki_image_parser(image_url)
                res["image_url"] = image_url

            res["name"] = result.get('name')
            res["category"] = result.get('description')

            # set our own types
            if any(x in ['Place', 'City', 'AdministrativeArea'] for x in result.get('@type')):
                res["type"] = "LOCATION"
            else:
                res["type"] = result.get('@type')[0].upper()

            detailed_description = result.get("detailedDescription")
            if detailed_description:
                res["url"] = detailed_description.get('url')
           

        entity_objs.append(res)
    
    return entity_objs