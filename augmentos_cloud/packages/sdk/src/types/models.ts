// @augmentos/sdk
// packages/sdk/types/src/models.ts - Core models

import { AppSettingType, AppState, Language, TpaType } from './enums';

/**
 * Base interface for applications
 */
export interface AppI {
  packageName: string;
  name: string;
  webhookURL: string;
  webviewURL?: string;            // URL for phone UI
  logoURL: string;
  tpaType: TpaType;               // Type of TPA
  appStoreId?: string;            // Which app store registered this TPA
  developerId?: string;
  
  // Auth
  hashedEndpointSecret?: string;
  hashedApiKey?: string;
  
  // App details
  description?: string;
  version?: string;
  settings?: AppSettings;

  isPublic?: boolean;
}

/**
 * Setting types for applications
 */
export type AppSetting = 
  | { type: AppSettingType.TOGGLE; key: string; label: string; defaultValue: boolean }
  | { type: AppSettingType.TEXT; key: string; label: string; defaultValue?: string }
  | { type: AppSettingType.SELECT; key: string; label: string; options: { label: string; value: string }[]; defaultValue?: string };

export type AppSettings = AppSetting[];

/**
 * Transcript segment for speech processing
 */
export interface TranscriptSegment {
  speakerId?: string;
  resultId: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

/**
 * Complete transcript
 */
export interface TranscriptI {
  segments: TranscriptSegment[];
}