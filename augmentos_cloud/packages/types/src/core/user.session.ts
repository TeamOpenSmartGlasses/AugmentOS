// src/types/models/session.ts
import type { Layout, DisplayRequest } from '../layout/layout';
import type { StreamType } from '../websocket/common';
import type { AppI, AppSettings } from './app';
import type { AppSessionI, AppState } from './app.session';
import type { TranscriptI } from './transcript';
import { WebSocket } from 'ws';

import {
  ConversationTranscriber,
  PushAudioInputStream,
} from 'microsoft-cognitiveservices-speech-sdk';


/**
 * Represents an active user session with a glasses client.
 * Design decision: Keep all real-time state in memory for minimal latency.
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  disconnectedAt: Date | null;

  // App Sessions and App State
  installedApps: AppI[];
  activeAppSessions: string[];
  loadingApps: string[];
  appSubscriptions: Map<string, StreamType[]> | Object; // packageName -> subscriptions;
  appConnections: Map<string, WebSocket>; // packageName -> websocket connection for the system app / TPA;

  displayManager: DisplayManagerI;

  websocket: WebSocket;
  transcript: TranscriptI


  // Azure Speech Service handles
  pushStream?: PushAudioInputStream;
  recognizer?: ConversationTranscriber;
  isTranscribing: boolean;  // New flag to track transcription state

  // Pre-initialization audio buffer
  bufferedAudio: ArrayBuffer[];

  // TODO:
  whatToStream: StreamType[];

  // OS Settings.
  OSSettings: any;
}

/**
 * Interface for active TPA WebSocket connections.
 */
// export interface TpaConnection {
//   packageName: string;
//   userSessionId: string;
//   websocket: WebSocket;
//   lastPing?: Date;
// }


// The DisplayManager is responsible for holding the current state of the displays to the user.
// Each App can make a display request to the DisplayManager, which will then be displayed to the user.
// Currently there is only one view, so all requests from system and apps are overwriting the current display.
// We can support multiple views, and neatly orginize them by app id, by holding them in state in the shape of this interface.
// Each user session will have a DisplayManager instance.
export interface DisplayManagerI {
  handleDisplayEvent(displayRequest: DisplayRequest, userSession: UserSession): Promise<boolean>;
}

/** What's showing right now in a session */
export interface ActiveDisplay {
  displayRequest: DisplayRequest;
  endsAt?: Date;  // When to auto-clear this display
}

/**
 * Represents an active TPA session within a user session.
 */
export interface AppSession {
  packageName: string;
  userId: string;
  subscriptions: StreamType[];
  settings: AppSettings;
  websocket?: WebSocket;
  state: AppState;
  startTime: Date;
  lastActiveTime: Date;
}
