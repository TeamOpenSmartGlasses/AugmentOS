// src/types/websocket/tpa.ts
import { WebSocketMessage } from './common';
import { Layout } from '../events/display';
import { AppSettings } from '../models/app';
import { Subscription } from './common';
import { Language } from '../base';

// TPA -> Cloud Messages
export interface TpaConnectionInitMessage extends WebSocketMessage {
  type: "tpa_connection_init";
  packageName: string;
  sessionId: string;
  apiKey: string;
}

export interface TpaDisplayEventMessage extends WebSocketMessage {
  type: "display_event";
  packageName: string;
  layout: Layout;
  durationMs?: number;
}

export interface TpaSubscriptionUpdateMessage extends WebSocketMessage {
  type: "subscription_update";
  packageName: string;
  subscriptions: Subscription[];
}

export interface DashboardDisplayEventMessage extends WebSocketMessage {
  type: "dashboard_display_event";
  packageName: string;
  layout: Layout;
  durationMs?: number;
}

export interface TranslationConfig {
  sourceLang: Language;
  targetLangs: Language[];
  preserveFormatting?: boolean;
  profanityFilter?: boolean;
  contextLength?: number;
}

export type TpaMessageType = 
  | 'tpa_connection_init'
  | 'display_event'
  | 'subscription_update'
  | 'dashboard_display_event';

export type TpaToCloudMessage =
  | TpaConnectionInitMessage
  | TpaDisplayEventMessage
  | TpaSubscriptionUpdateMessage
  | DashboardDisplayEventMessage;

// Cloud -> TPA Messages
export interface CloudTpaConnectionAckMessage extends WebSocketMessage {
  type: "tpa_connection_ack";
  settings?: AppSettings;
}

export interface CloudTpaConnectionErrorMessage extends WebSocketMessage {
  type: "tpa_connection_error";
  message: string;
  code?: string;
}

export interface CloudDataStreamMessage extends WebSocketMessage {
  type: "data_stream";
  streamType: Subscription;
  data: any; // Type depends on subscription type // TODO fix this any. it heavily allows potential bugs
}

export interface CloudSettingsUpdateMessage extends WebSocketMessage {
  type: "settings_update";
  packageName: string;
  settings: AppSettings;
}

export type CloudToTpaMessage =
  | CloudTpaConnectionAckMessage
  | CloudTpaConnectionErrorMessage
  | CloudDataStreamMessage
  | CloudSettingsUpdateMessage;