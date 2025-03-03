// Config for cloud environment variables.
// We will use this as our source of truth for cloud environment variables, and secrets so we can define them in one place.
// And have a different file for prod and dev environments.

export interface SystemApp {
  port: number;
  packageName: string;
  name: string; // Making name required since it's accessed in the code
}

export const BASE_PORT = 8000;
export const CLOUD_PORT = 8002;
export const DEBUGGER_PORT = 6173;

export const systemApps = {
  captions: {
    port: BASE_PORT + 10,
    packageName: 'org.augmentos.live-captions',
    name: 'Live Captions'
  },
  flash: {
    port: BASE_PORT + 11,
    packageName: 'org.augmentos.flash',
    name: 'Flash'
  },
  dashboard: {
    port: BASE_PORT + 12,
    packageName: 'org.augmentos.dashboard',
    name: 'Dashboard'
  },
  merge: {
    port: BASE_PORT + 13,
    packageName: 'org.augmentos.agentgatekeeper',
    name: 'Agent Gatekeeper'
  },
  notify: {
    port: BASE_PORT + 14,
    packageName: 'org.augmentos.shownotifications',
    name: 'Notifications'
  },
  mira: {
    port: BASE_PORT + 15,
    packageName: 'org.augmentos.miraai',
    name: 'Mira AI'
  }
};

// Environment Variables
export const NODE_ENV = "development";
export const CLOUD_VERSION = "1.0.0";

// SECRETS. DO NOT COMMIT.
// MongoDB
export const MONGO_URL = "mongodb://localhost:27017/augmentos";

// Sentry
export const SENTRY_DSN = "https://xxx@xxx.ingest.sentry.io/xxx";

// Azure
export const AZURE_SPEECH_REGION = "centralus";
export const AZURE_SPEECH_KEY = "xxx";

// LLM Configuration
// Need to define LLMModel enum for the switch case in LLMProvider
export enum LLMModel {
  GPT4 = 'gpt-4o',
  CLAUDE = 'claude-3',
  GEMINI = 'gemini-pro',
}

// Set LLM_MODEL to the enum value for compatibility
export const LLM_MODEL = LLMModel.GPT4;
export const AZURE_OPENAI_API_KEY = "xxx";
export const AZURE_OPENAI_API_INSTANCE_NAME = "xxx";
export const AZURE_OPENAI_API_DEPLOYMENT_NAME = "xxx";
export const AZURE_OPENAI_API_VERSION = "2023-05-15";
export const ANTHROPIC_API_KEY = "xxx";

// Search API
export const SERPAPI_API_KEY = "xxx";

// JWT Secrets
export const SUPABASE_JWT_SECRET = 'xxx';
export const AUGMENTOS_AUTH_JWT_SECRET = 'xxx';
export const JOE_MAMA_USER_JWT = 'xxx';

// posthog env vars
export const POSTHOG_PROJECT_API_KEY = "phc_xxx";
export const POSTHOG_HOST = "https://app.posthog.com"; 