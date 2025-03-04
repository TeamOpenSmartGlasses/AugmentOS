import { ChatOpenAI } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { 
  AZURE_OPENAI_API_KEY, 
  ANTHROPIC_API_KEY, 
  LLM_MODEL, 
  AZURE_OPENAI_API_INSTANCE_NAME, 
  AZURE_OPENAI_API_DEPLOYMENT_NAME, 
  AZURE_OPENAI_API_VERSION, 
  OPENAI_API_KEY,
  LLM_PROVIDER,
  LLMModel,
  LLMService
} from "@augmentos/config";

export class LLMProvider {
  static getLLM() {
    const supportedAzureModels = [
      LLMModel.GPT4,
    ]
    const supportedOpenAIModels = [
      LLMModel.GPT4,
      LLMModel.GPT4_MINI,
    ]
    const supportedAnthropicModels = [
      LLMModel.CLAUDE,
    ]

    // Convert model to enum value if it's a string
    const model = typeof LLM_MODEL === 'string' ? LLM_MODEL as LLMModel : LLM_MODEL;
    const provider = LLM_PROVIDER || LLMService.AZURE;

    if (provider === LLMService.AZURE) {
      if (!supportedAzureModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported Azure model: ${model}`);
      }
      return new AzureChatOpenAI({
        modelName: model,
        temperature: 0.3,
        maxTokens: 300,
        azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
        azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
        azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
      });
    } else if (provider === LLMService.OPENAI) {
      if (!supportedOpenAIModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported OpenAI model: ${model}`);
      }
      return new ChatOpenAI({
        modelName: model,
        temperature: 0.3,
        maxTokens: 300,
        openAIApiKey: OPENAI_API_KEY,
      });
    } else if (provider === LLMService.ANTHROPIC) {
      if (!supportedAnthropicModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported Anthropic model: ${model}`);
      }
      return new ChatAnthropic({
        modelName: model,
        temperature: 0.3,
        maxTokens: 300,
        anthropicApiKey: ANTHROPIC_API_KEY,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}