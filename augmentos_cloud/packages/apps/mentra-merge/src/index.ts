import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage } from '@langchain/core/messages';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { LLMProvider } from '../../../utils/LLMProvider';
import { searchUrlForEntityAsync } from 'agents/search_tool_for_agents';

// ===== Type Definitions =====

/** The legacy agent output for rare entities. */
export interface Entity {
  name: string;
  definition: string;
  search_keyword: string;
}

export interface ConversationEntities {
  entities: Entity[];
  irrelevant_terms: string[];
}

// ===== Prompt Blueprint =====

const proactiveRareWordAgentPromptBlueprint = `
# Objective
Your role is to identify and define "Rare Entities (REs)" in a transcript. Types of REs include rare words, jargons, adages, concepts, people, places, organizations, events etc that are not well known to the average high schooler, in accordance to current trends. You can also intelligently detect REs that are described in the conversation but not explicitly mentioned.

# Criteria for Rare Entities in order of importance
1. **Rarity:** Select entities that are unlikely for an average high schooler to know. Do not include well-known entities.
2. **Utility:** The definition should help a user understand the conversation better and achieve their goals.
3. **No Redundancy:** Exclude definitions if they are already defined in the conversation.
4. **Complexity:** Choose phrases whose meaning is not obvious from the component words.
5. **Definability:** Each entity must be clearly and succinctly definable in under 10 words.
6. **Existence:** Do not select an entity if you have no reference knowledge of it.

# Conversation Transcript:
<Transcript start>{conversation_context}<Transcript end>

# Additional Context:
Existing definitions history: {definitions_history}

# Output Guidelines:
Output an array \`entities\` of the entities using the following template:
\`\`\`
[
  { name: string, definition: string, search_keyword: string }
]
\`\`\`
Also output an array \`irrelevant_terms\` of terms that are not rare or interesting.

Example Output:
entities: [{ name: "80/20 Rule", definition: "Productivity concept; Majority of results come from few causes", search_keyword: "80/20 Rule + concept" }]
irrelevant_terms: ["the", "dog", "rock", "table", "who"]

{format_instructions}
`;

// Create a parser for the expected JSON output
const proactiveRareWordAgentQueryParser =
  new JsonOutputFunctionsParser<ConversationEntities>({ argsOnly: true });

// ===== Main Agent Function =====

/**
 * Runs the proactive definer agent.
 *
 * @param conversationContext - the transcript to analyze.
 * @param definitionsHistory - any previously defined REs (as an array of strings).
 * @param irrelevantTerms - a list of terms that are considered irrelevant.
 *
 * @returns A Promise that resolves to a ConversationEntities object.
 */
export async function runProactiveDefinerAgent(
  conversationContext: string,
  definitionsHistory: string[] = [],
  irrelevantTerms: string[] = []
): Promise<ConversationEntities | null> {
  // Format definitionsHistory for the prompt (if any)
  const formattedDefinitionsHistory =
    definitionsHistory.length > 0 ? JSON.stringify(definitionsHistory) : "None";

  // Build the prompt template
  const promptTemplate = new PromptTemplate({
    template: proactiveRareWordAgentPromptBlueprint,
    inputVariables: ['conversation_context', 'definitions_history'],
    partialVariables: {
      format_instructions: proactiveRareWordAgentQueryParser.getFormatInstructions(),
      number_of_definitions: "1", // You may adjust this if needed
    },
  });

  // Format the final prompt string
  const formattedPrompt = await promptTemplate.format({
    conversation_context: conversationContext,
    definitions_history: formattedDefinitionsHistory,
  });

  // Get the LLM instance (e.g., GPT-4 or another supported model)
  const llm = LLMProvider.getLLM();

  try {
    // Send the prompt and await the response from the LLM
    const response = await llm.invoke(formattedPrompt);

    // Parse the JSON output to match our ConversationEntities interface
    const parsed: ConversationEntities = await proactiveRareWordAgentQueryParser.parse(
      response.content
    );

    // Enrich each entity with additional search/image data
    const enrichedEntities = await searchEntities(parsed.entities);
    return {
      entities: enrichedEntities,
      irrelevant_terms: parsed.irrelevant_terms,
    };
  } catch (error) {
    console.error("Error in runProactiveDefinerAgent:", error);
    return null;
  }
}

/**
 * Searches for additional information (and images if enabled) for a list of entities.
 *
 * @param entities - list of entities to enrich.
 *
 * @returns A Promise resolving to an array of enriched entity objects.
 */
export async function searchEntities(
  entities: Entity[]
): Promise<any[]> {
  // Create search tasks for each entity (assuming searchUrlForEntityAsync returns a Promise)
  const searchTasks = entities.map((entity) =>
    searchUrlForEntityAsync(entity.search_keyword, false) // assuming images are not required; adjust if needed
  );

  const responses = await Promise.all(searchTasks);

  // Combine the LLM-provided data with the search result
  const enrichedEntities = entities.map((entity, index) => {
    const response = responses[index] || {};
    return {
      name: entity.name,
      summary: entity.definition,
      ...response,
    };
  });

  return enrichedEntities;
}
