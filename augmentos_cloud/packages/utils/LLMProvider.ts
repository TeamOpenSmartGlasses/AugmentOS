import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { OPENAI_API_KEY, ANTHROPIC_API_KEY, LLM_MODEL } from "@augmentos/types/config/cloud.env";

export class LLMProvider {
  static getLLM() {
    const model = LLM_MODEL || 'gpt-4'; // Default to GPT-4

    switch (model) {
      case 'gpt-4':
        return new ChatOpenAI({
          modelName: model,
          temperature: 0.3,
          maxTokens: 300,
          openAIApiKey: OPENAI_API_KEY,
        });

      case 'claude-3':
        return new ChatAnthropic({
          modelName: model,
          temperature: 0.3,
          maxTokens: 300,
          anthropicApiKey: ANTHROPIC_API_KEY,
        });

      case 'gemini-pro':
        return new ChatVertexAI({
          modelName: model,
          temperature: 0.3,
        });

      default:
        throw new Error(`Unsupported LLM model: ${model}`);
    }
  }
}
