// src/types/models/session.ts
import { WebSocket } from 'ws';

export enum Language {
  "en" = "en",
  "es" = "es",
  "fr" = "fr",
  // TODO: Add more languages.
}

export type AppState = 
  | 'not_installed'  // Initial state
  | 'installed'      // Installed but never run
  | 'booting'        // Starting up
  | 'running'        // Active and running
  | 'stopped'        // Manually stopped
  | 'error';         // Error state

export interface AppSessionI {
  userId: string;
  packageName: string;
  state: AppState;
  subscriptions: string[];
  translateToLanguages?: Language[];
  translationConfig?: {
    preserveFormatting?: boolean;
    profanityFilter?: boolean;
    contextLength?: number;
  };
  endedAt?: Date;
  disconnectedAt?: Date;
  websocket?: WebSocket;
}
