import { Agent } from './AgentInterface';
import { PromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { LLMProvider } from '../utils/LLMProvider';
import { SearchToolForAgents } from './tools/SearchToolForAgents';

interface QuestionAnswer {
  insight: string;
}

const agentPromptBlueprint = `You are an AI assistant that answers questions or statements of uncertainty in conversations. Use available tools when needed and follow these rules:

1. Analyze the conversation context for explicit questions or implicit uncertainties
2. Use the search tool for factual verification or when additional information is needed
3. Always maintain brevity (under 15 words) in final answers
4. Return "null" if no valid question/uncertainty exists

Tools Available:
search - For factual verification and information retrieval. Input format: {"searchKeyword": "query", "includeImage": boolean}

Output Format:
{"insight": "concise answer"} or {"insight": "null"}

Examples:
User: "When was the first moon landing?"
Assistant: {"insight": "1969"}

User: "I'm not sure how photosynthesis works"
Assistant: {"insight": "Plants convert sunlight to energy"}

Conversation Context:
{input}`;

export class QuestionAnswererAgent implements Agent {
  public agentId = 'question_answerer';
  public agentName = 'QuestionAnswerer';
  public agentDescription = 'Answers questions using verifiable knowledge and search tools';
  public agentPrompt = agentPromptBlueprint;
  public agentTools = [new SearchToolForAgents()];

  private parseOutput(text: string): QuestionAnswer {
    try {
      const parsed = JSON.parse(text);
      return { insight: parsed.insight || "null" };
    } catch (e) {
      const match = text.match(/"insight"\s*:\s*"([^"]+)"/);
      return { insight: match ? match[1] : "null" };
    }
  }

  public async handleContext(userContext: Record<string, any>): Promise<any> {
    try {
      const conversationContext = userContext.conversation_context || "";
      if (!conversationContext.trim()) return { insight: "null" };

      const llm = LLMProvider.getLLM();
      const prompt = PromptTemplate.fromTemplate(this.agentPrompt);
      
      const agent = await createReactAgent({
        llm,
        tools: this.agentTools,
        prompt,
      });

      const executor = new AgentExecutor({
        agent,
        tools: this.agentTools,
        maxIterations: 3,
        verbose: process.env.NODE_ENV === 'development',
      });

      const result = await executor.invoke({ input: conversationContext });
      return this.parseOutput(result.output);
    } catch (err) {
      console.error('[QuestionAnswererAgent] Error:', err);
      return { insight: "null" };
    }
  }
}