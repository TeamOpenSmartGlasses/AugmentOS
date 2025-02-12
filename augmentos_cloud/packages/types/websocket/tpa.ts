// src/types/websocket/tpa.ts
import type { WebSocketMessage } from './common';
import type { Layout } from '../layout/layout';
import type { AppSettings } from '../models/app';
import type { StreamType } from './common';
import type { Language } from '../core/app.session';

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

export interface DashboardDisplayEventMessage extends WebSocketMessage {
  type: "dashboard_display_event";
  packageName: string;
  layout: Layout;
  durationMs?: number;
}

export interface TpaSubscriptionUpdateMessage extends WebSocketMessage {
  type: "subscription_update";
  packageName: string;
  subscriptions: StreamType[];
}


export interface TranslationConfig {
  sourceLang: Language;
  targetLangs: Language[];
  preserveFormatting?: boolean;
  profanityFilter?: boolean;
  contextLength?: number;
}

export type TpaToCloudMessage =
  | TpaConnectionInitMessage
  | TpaDisplayEventMessage
  | TpaSubscriptionUpdateMessage;

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
  streamType: StreamType;
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