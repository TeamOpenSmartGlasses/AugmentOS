// backend/src/services/session.service.ts

import { WebSocket } from 'ws';
// import { 
//   Layout, 
//   DisplayHistory,
//   AppSettings,
//   Subscription 
// } from '../types/augment-os.types';
// import { CloudDisplayEventMessage } from '../types/websocket.types';
// import { TranscriptSegment } from '../types/augment-os.types';
import { v4 as uuidv4 } from 'uuid';
import { Layout, DisplayHistory, TranscriptSegment, Subscription, AppSettings, CloudDisplayEventMessage } from '../types';

// Core interfaces for session management
export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  activeAppSessions: Map<string, AppSession>;
  currentDisplay?: Layout;
  displayHistory: DisplayHistory;
  websocket: WebSocket;
  transcript: {
    segments: TranscriptSegment[];
    lastUpdated: Date;
  };
  pushStream: any; // For audio streaming
  recognizer: any; // For speech recognition
  bufferedAudio: ArrayBuffer[];
}

export interface AppSession {
  appId: string;
  userId: string;
  subscriptions: Subscription[];
  settings: AppSettings;
  websocket?: WebSocket;
  state: 'active' | 'paused' | 'disconnected';
  startTime: Date;
  lastActiveTime: Date;
}

class UserSessionService {
  private activeSessions: Map<string, UserSession> = new Map();

  createSession(ws: WebSocket, userId = 'anonymous'): UserSession {
    const sessionId = uuidv4();
    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      activeAppSessions: new Map(),
      displayHistory: [],
      websocket: ws,
      transcript: {
        segments: [],
        lastUpdated: new Date()
      },
      pushStream: null,
      recognizer: null,
      bufferedAudio: []
    };

    this.activeSessions.set(sessionId, session);
    console.log(`\n[UserSessionService]\nCreated new session ${sessionId} for user ${userId}\n`);
    return session;
  }

  getSession(sessionId: string): UserSession | null {
    // log all active sessions.
    console.log("\n\n[UserSessionService] Active Sessions:");
    for (const [key, value] of this.activeSessions) {
      console.log(key, value);
    }
    return this.activeSessions.get(sessionId) || null;
  }

  updateUserId(sessionId: string, userId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.userId = userId;
      console.log(`\n[UserSessionService]\nUpdated user ID for session ${sessionId}\n to ${userId}\n`);
    }
  }

  updateDisplay(sessionId: string, layout: Layout, durationMs?: number): void {
    const session = this.getSession(sessionId);
    if (session) {
      // Update current display
      session.currentDisplay = layout;

      // Add to display history
      session.displayHistory.push({
        layout,
        timestamp: new Date(),
        durationInMilliseconds: durationMs || 0
      });

      // Send display message to client
      const displayMessage: CloudDisplayEventMessage = {
        type: 'display_event',
        sessionId,
        layout,
        durationMs
      };
      session.websocket.send(JSON.stringify(displayMessage));
    }
  }

  addTranscriptSegment(sessionId: string, segment: TranscriptSegment): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.transcript.segments.push(segment);
      session.transcript.lastUpdated = new Date();
    }
  }

  setAudioHandlers(
    sessionId: string, 
    pushStream: any, 
    recognizer: any
  ): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.pushStream = pushStream;
      session.recognizer = recognizer;

      // Process any buffered audio
      if (session.bufferedAudio.length > 0) {
        for (const chunk of session.bufferedAudio) {
          pushStream.write(chunk);
        }
        session.bufferedAudio = [];
      }
    }
  }

  handleAudioData(sessionId: string, audioData: ArrayBuffer): void {
    const session = this.getSession(sessionId);
    if (session) {
      if (session.pushStream) {
        session.pushStream.write(audioData);
      } else {
        session.bufferedAudio.push(audioData);
        console.warn(`[Session ${sessionId}] Audio data buffered before pushStream initialization.`);
      }
    }
  }

  endSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      // Cleanup recognizer
      if (session.recognizer) {
        session.recognizer.stopContinuousRecognitionAsync();
      }

      // Cleanup push stream
      if (session.pushStream) {
        session.pushStream.close();
      }

      // Close all app sessions
      session.activeAppSessions.forEach(appSession => {
        if (appSession.websocket) {
          appSession.websocket.close();
        }
      });

      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      console.log(`\n[UserSessionService]\nEnded session ${sessionId}\n`);
    }
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }
}

// Create a singleton instance
export const userSessionService = new UserSessionService();

// Export the singleton by default
export default userSessionService;