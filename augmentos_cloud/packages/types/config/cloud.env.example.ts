// Config for cloud environment variables.
// We will use this as our source of truth for cloud environment variables, and secrets so we can define them in one place.
// And have a different file for prod and dev environments.

export interface SystemApp {
  port: number;
  packageName: string;
}

export const BASE_PORT = 8000;
export const CLOUD_PORT = 8002;
export const DEBUGGER_PORT = 6173;

export const systemApps = {
  captions: {
    port: BASE_PORT + 10,
    packageName: 'org.mentra.captions',
  },
  flash: {
    port: BASE_PORT + 11,
    packageName: 'org.mentra.flash',
  },
  dashboard: {
    port: BASE_PORT + 12,
    packageName: 'org.mentra.dashboard',
  },
  merge: {
    port: BASE_PORT + 15,
    packageName: 'org.mentra.merge',
  },
};

// SECRETS. DO NOT COMMIT.
// Azure
export const AZURE_SPEECH_REGION="centralus"
export const AZURE_SPEECH_KEY="xxx"

// JWT Secrets
export const SUPABASE_JWT_SECRET='xxx';
export const AUGMENTOS_AUTH_JWT_SECRET='xxx'

// posthog env vars
export const POSTHOG_PROJECT_API_KEY = "phc_xxx";
export const POSTHOG_HOST = "https://app.posthog.com";
