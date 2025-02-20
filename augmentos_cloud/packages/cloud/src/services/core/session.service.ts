import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { StreamType, UserSession } from '@augmentos/types';
import { TranscriptSegment } from '@augmentos/types';
import DisplayManager from '../layout/DisplayManager';
import { DisplayRequest } from '@augmentos/types';
import appService, { SYSTEM_TPAS } from './app.service';
import transcriptionService from '../processing/transcription.service';

const RECONNECT_GRACE_PERIOD_MS = 30000; // 30 seconds
const LOG_AUDIO = false;

export class SessionService {
  private activeSessions = new Map<string, UserSession>();

  createSession(ws: WebSocket, userId = 'anonymous'): UserSession {
    const sessionId = uuidv4();
    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      activeAppSessions: [],
      installedApps: appService.getSystemApps(),
      whatToStream: new Array<StreamType>(),
      appSubscriptions: new Map<string, StreamType[]>(),
      loadingApps: [],
      appConnections: new Map<string, WebSocket | any>(),
      OSSettings: { brightness: 50, volume: 50 },
      displayManager: new DisplayManager(),
      transcript: { segments: [] },
      websocket: ws as any,
      bufferedAudio: [],
      disconnectedAt: null,
      isTranscribing: false  // Add this flag to track transcription state
    } as UserSession & { disconnectedAt: Date | null };

    this.activeSessions.set(sessionId, session);
    console.log(`[session.service] Created new session ${sessionId} for user ${userId}`);
    return session;
  }

  getSession(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  handleReconnectUserSession(newSession: UserSession, userId: string): void {
    const oldUserSession = this.getSession(userId);
    if (oldUserSession) {
      newSession.activeAppSessions = oldUserSession.activeAppSessions;
      newSession.transcript = oldUserSession.transcript;
      newSession.displayManager = oldUserSession.displayManager;
      newSession.isTranscribing = false; // Reset transcription state

      // Clean up old session resources
      if (oldUserSession.recognizer) {
        transcriptionService.stopTranscription(oldUserSession);
      }

      // Close old websocket
      if (oldUserSession.websocket.readyState === WebSocket.OPEN) {
        oldUserSession.websocket?.close();
      }

      this.activeSessions.delete(oldUserSession.sessionId);
      console.log(`Transferred data from session ${oldUserSession.sessionId} to ${newSession.sessionId}`);
    }

    newSession.userId = userId;
    newSession.sessionId = userId;

    this.activeSessions.set(newSession.sessionId, newSession);
    console.log(`Reconnected session ${newSession.sessionId} for user ${userId}`);

    if (newSession.websocket.readyState === WebSocket.OPEN) {
      newSession.websocket.send(JSON.stringify({ type: 'reconnect' }));
    }
  }

  // In SessionService, update updateDisplay method

  updateDisplay(userSessionId: string, displayRequest: DisplayRequest): void {
    const session = this.getSession(userSessionId);
    if (!session) {
      console.error(`❌ No session found for display update: ${userSessionId}`);
      return;
    }

    const isSystemApp = SYSTEM_TPAS.some(app => app.packageName === displayRequest.packageName);
    console.log('📱 Processing display request:', {
      sessionId: userSessionId,
      view: displayRequest.view,
      packageName: displayRequest.packageName,
      isSystemApp
    });

    // Update display history
    try {
      // Give system apps priority in display management
      // if (isSystemApp) {
      //   displayRequest.priority = 'high';
      // }
      session.displayManager.handleDisplayEvent(displayRequest);
      console.log('✅ Updated display history');
    } catch (error) {
      console.error('❌ Error updating display history:', error);
    }

    // Send to glasses client - ensure system app displays always go through
    if (session.websocket?.readyState === WebSocket.OPEN) {
      try {
        session.websocket.send(JSON.stringify(displayRequest));
        console.log('✅ Sent display update to glasses');
      } catch (error) {
        console.error('❌ Error sending display update:', error);
      }
    } else {
      console.error('⚠️ Glasses websocket not ready:', {
        hasWebsocket: !!session.websocket,
        readyState: session.websocket?.readyState,
        isSystemApp
      });
    }
  }

  addTranscriptSegment(userSession: UserSession, segment: TranscriptSegment): void {
    if (userSession) {
      userSession.transcript.segments.push(segment);
    }
  }

  handleAudioData(userSession: UserSession, audioData: ArrayBuffer | any): void {
    if (!userSession.isTranscribing) {
      if (LOG_AUDIO) console.log('🔇 Not processing audio - transcription is disabled');
      return;
    }

    if (userSession.pushStream) {
      try {
        if (LOG_AUDIO) {
          console.log('🎤 Writing audio chunk to push stream');
          console.log('Session state:', {
            id: userSession.sessionId,
            hasRecognizer: !!userSession.recognizer,
            isTranscribing: userSession.isTranscribing,
            bufferSize: userSession.bufferedAudio.length
          });
        }
        userSession.pushStream.write(audioData);
      } catch (error) {
        console.error('❌ Error writing to push stream:', error);
        console.error('Current session state:', {
          id: userSession.sessionId,
          hasRecognizer: !!userSession.recognizer,
          isTranscribing: userSession.isTranscribing,
          bufferSize: userSession.bufferedAudio.length
        });
        userSession.isTranscribing = false;
        transcriptionService.stopTranscription(userSession);
      }
    } else {
      userSession.bufferedAudio.push(audioData);
      if (userSession.bufferedAudio.length === 1) {
        console.log(`📦 Started buffering audio for session ${userSession.sessionId}`);
        console.log('Waiting for push stream initialization...');
      }
      if (userSession.bufferedAudio.length % 100 === 0) {
        console.log(`📦 Buffered ${userSession.bufferedAudio.length} audio chunks`);
      }
    }
  }

  endSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    if (session.recognizer) {
      transcriptionService.stopTranscription(session);
    }

    this.activeSessions.delete(sessionId);
    console.log(`\n\n\n[Ended session]\n${sessionId}\n\n\n`);
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }

  markSessionDisconnected(userSession: UserSession): void {
    if (userSession) {
      if (userSession.recognizer) {
        transcriptionService.stopTranscription(userSession);
      }

      userSession.disconnectedAt = new Date();
      userSession.isTranscribing = false;
      console.log(
        `Session ${userSession.sessionId} marked as disconnected at ${userSession.disconnectedAt.toISOString()}`
      );
    }
  }

  isItTimeToKillTheSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (session && session.disconnectedAt) {
      const elapsed = Date.now() - session.disconnectedAt.getTime();
      return elapsed > RECONNECT_GRACE_PERIOD_MS;
    }
    return false;
  }
}

export const sessionService = new SessionService();
console.log('✅ Session Service');

export default sessionService;