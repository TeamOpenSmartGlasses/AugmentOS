// src/types/models/app.ts

export interface AppI {
  packageName: string;
  name: string;
  webhookURL: string;
  logoURL: string;
  developerId?: string;
  
  // Auth
  hashedEndpointSecret?: string;
  hashedApiKey?: string;
  
  // App details
  description?: string;
  version?: string;
  settings?: AppSettings;
}

// Setting types
export type AppSettingType = 
  | { type: "toggle"; key: string; label: string; defaultValue: boolean }
  | { type: "text"; key: string; label: string; defaultValue?: string }
  | { type: "select"; key: string; label: string; options: { label: string; value: string }[]; defaultValue?: string };

export type AppSettings = AppSettingType[];