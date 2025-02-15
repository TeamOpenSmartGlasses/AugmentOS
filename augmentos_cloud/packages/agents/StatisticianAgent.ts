import { Agent } from './AgentInterface';
import { PromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { LLMProvider } from '../utils/LLMProvider';
import { SearchToolForAgents } from './tools/SearchToolForAgents';

interface StatisticResponse {
  insight: string;
}

const agentPromptBlueprint = `You are a Statistician AI assistant.
Your task is to generate insights focusing on statistics and quantitative data.
You must identify trends, correct inaccurate claims, and leverage robust statistics from reputable sources (like Statista or academic publications).
If you cannot find strong quantitative data or fail to retrieve the necessary data, output "null".

Instructions:
1. Read the conversation context.
2. Identify the single most important quantitative data needed to generate the insight.
3. Use the "search" tool for factual verification if required. When using a tool, use the exact format:
   Action: search
   Action Input: {{"searchKeyword": "<query>", "includeImage": <true/false>}}
4. Maintain brevity (under 15 words) in your final answer.
5. When ready, output your final answer on a new line prefixed by "Final Answer:" followed immediately by a JSON object exactly like:
   {{"insight": "<concise statistic-based insight>"}}
6. Do not provide watered down or irrelevant statistics.

Additional Guidelines:
- Agent Insight Type: Generate insights with statistics and quantitative data.
- Agent Plan: 1. Identify the quantitative insight needed. 2. Retrieve data from reputable sources.
- Validation Criteria: The response must contain strong quantitative data.
- Proactive Tool Description: Provide statistics, graphs, and data when the conversation suggests numerical comparisons.
- Proactive Tool Example:
   Conversation: Transcript compares the number of CS students in US and China.
   Insight: US: 6% HS students in CS, China: <1% K-12 in programming.
- Examples:
   1. Conversation: Transcript compares the number of CS students in US and China.
      Insight: US: 6% HS students in CS, China: <1% K-12 in programming.
   2. Conversation: Transcript mentions "Should we ban plastic straws?".
      Insight: 500mil straws in the US/day, 8.3bil straws pollute the world's beaches.
   3. Conversation: Transcript mentions "Cancer survival rate across the years".
      Insight: Cancer survival rate: 49% in mid-70s to 68% now.

Conversation Context:
{input}
{tools}
{tool_names}
{agent_scratchpad}`;

export class StatisticianAgent implements Agent {
  public agentId = 'statistician';
  public agentName = 'Statistician';
  public agentDescription = 'Generates insights using quantitative data and statistics';
  public agentPrompt = agentPromptBlueprint;
  public agentTools = [new SearchToolForAgents()];

  /**
   * Parses the final LLM output.
   * If the output contains a "Final Answer:" marker, the text after that marker is parsed as JSON.
   * Expects a JSON object with an "insight" key.
   */
  private parseOutput(text: string): StatisticResponse {
    const finalMarker = "Final Answer:";
    if (text.includes(finalMarker)) {
      text = text.split(finalMarker)[1].trim();
    }
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.insight === "string") {
        return { insight: parsed.insight };
      }
      if (parsed.searchKeyword) {
        return { insight: "null" };
      }
    } catch (e) {
      const match = text.match(/"insight"\s*:\s*"([^"]+)"/);
      if (match) {
        return { insight: match[1] };
      }
    }
    return { insight: "null" };
  }

  public async handleContext(userContext: Record<string, any>): Promise<any> {
    try {
      const conversationContext = userContext.conversation_context || "";
      if (!conversationContext.trim()) return { insight: "null" };

      const llm = LLMProvider.getLLM();
      const prompt = new PromptTemplate({
        template: this.agentPrompt,
        inputVariables: ["input", "tools", "tool_names", "agent_scratchpad"],
      });

      const agent = await createReactAgent({
        llm,
        tools: this.agentTools,
        prompt,
      });

      const executor = new AgentExecutor({
        agent,
        tools: this.agentTools,
        maxIterations: 10,
        verbose: process.env.NODE_ENV === 'development',
      });

      const toolNames: string[] = this.agentTools.map(tool => tool.name || "unknown");
      const agentScratchpad = "";

      const result = await executor.invoke({
        input: conversationContext,
        tools: this.agentTools,
        tool_names: toolNames,
        agent_scratchpad: agentScratchpad,
      });

      console.log(`[StatisticianAgent] Result: ${JSON.stringify(result, null, 2)}`);
      return this.parseOutput(result.output);
    } catch (err) {
      console.error('[StatisticianAgent] Error:', err);
      return { insight: "null" };
    }
  }
}
