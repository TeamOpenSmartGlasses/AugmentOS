// augmentos_cloud/packages/cloud/src/services/core/session.service.ts

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { StreamType, UserSession } from '@augmentos/types';
import { TranscriptSegment } from '@augmentos/types';
import { DisplayRequest } from '@augmentos/types';
import appService, { SYSTEM_TPAS } from './app.service';
import transcriptionService from '../processing/transcription.service';
import DisplayManager from '../layout/DisplayManager6';
import { lc3Service } from '@augmentos/utils';

const RECONNECT_GRACE_PERIOD_MS = 30000; // 30 seconds
const LOG_AUDIO = false;
const PROCESS_AUDIO = true;

export class SessionService {
  private activeSessions = new Map<string, UserSession>();
  private isLC3Initialized = false;

  constructor() {
    this.initializeLC3();
  }

  private async initializeLC3(): Promise<void> {
    try {
      await lc3Service.initialize();
      this.isLC3Initialized = true;
      console.log('✅ LC3 Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LC3 service:', error);
      this.isLC3Initialized = false;
    }
  }

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
      newSession.bufferedAudio = oldUserSession.bufferedAudio;
      newSession.OSSettings = oldUserSession.OSSettings;
      newSession.appSubscriptions = oldUserSession.appSubscriptions;
      newSession.appConnections = oldUserSession.appConnections;
      newSession.whatToStream = oldUserSession.whatToStream;
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

  updateDisplay(userSessionId: string, displayRequest: DisplayRequest): void {
    const userSession = this.getSession(userSessionId);
    if (!userSession) {
      console.error(`❌[${userSessionId}]: No userSession found for display update`);
      return;
    }
    try {
      userSession.displayManager.handleDisplayEvent(displayRequest, userSession);
    } catch (error) {
      console.error(`❌[${userSessionId}]: Error updating display history:`, error);
    }
  }

  addTranscriptSegment(userSession: UserSession, segment: TranscriptSegment): void {
    if (userSession) {
      userSession.transcript.segments.push(segment);
    }
  }

  async handleAudioData(
    userSession: UserSession,
    audioData: ArrayBuffer | any,
    isLC3 = true
  ): Promise<void> {
    // Update the last audio timestamp regardless of transcription state
    userSession.lastAudioTimestamp = Date.now();
  
    // Process LC3 first
    let processedAudioData = audioData;
    if (isLC3) {
      if (!this.isLC3Initialized) {
        await this.initializeLC3();
        if (!this.isLC3Initialized) {
          processedAudioData = audioData;
        }
      }
  
      if (this.isLC3Initialized) {
        try {
          processedAudioData = await lc3Service.decodeAudioChunk(audioData);
        } catch (error) {
          console.error('❌ Error decoding LC3 audio:', error);
          processedAudioData = audioData;
        }
      }
    }
  
    // Always buffer if we're not actively transcribing
    // This ensures we don't lose audio during VAD transitions
    if (!userSession.isTranscribing) {
      if (LOG_AUDIO) console.log('📦 Buffering audio while transcription is paused');
      userSession.bufferedAudio.push(processedAudioData);
      
      // Keep buffer from growing too large
      const MAX_BUFFER_SIZE = 1000; // About 20 seconds of audio at 50ms chunks
      if (userSession.bufferedAudio.length > MAX_BUFFER_SIZE) {
        console.log(`⚠️[${userSession}] Buffer exceeded ${MAX_BUFFER_SIZE} chunks, removing oldest chunks`);
        userSession.bufferedAudio = userSession.bufferedAudio.slice(-MAX_BUFFER_SIZE);
      }
      return;
    }
  
    // If we have a push stream, try to write to it
    if (userSession.pushStream) {
      try {
        // Process any buffered audio first
        if (userSession.bufferedAudio.length > 0) {
          console.log(`📤 Processing ${userSession.bufferedAudio.length} buffered chunks`);
          for (const chunk of userSession.bufferedAudio) {
            await userSession.pushStream.write(chunk);
          }
          userSession.bufferedAudio = [];
          console.log('✅ Finished processing buffer');
        }
  
        // Now write the current chunk
        await userSession.pushStream.write(processedAudioData);
        
        if (LOG_AUDIO) {
          console.log('🎤 Wrote audio chunk to push stream', {
            sessionId: userSession.sessionId,
            hasRecognizer: !!userSession.recognizer,
            isTranscribing: userSession.isTranscribing,
            bufferSize: userSession.bufferedAudio.length
          });
        }
      } catch (error) {
        console.error('❌ Error writing to push stream:', error);
        // Don't immediately stop - let transcription service handle cleanup
        transcriptionService.handlePushStreamError(userSession, error);
      }
    } else {
      // No push stream yet, keep buffering
      userSession.bufferedAudio.push(processedAudioData);
      if (userSession.bufferedAudio.length === 1) {
        console.log(`📦 Started new buffer for session ${userSession.sessionId}`);
      }
      if (userSession.bufferedAudio.length % 100 === 0) {
        console.log(`📦 Buffer size: ${userSession.bufferedAudio.length} chunks`);
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

// Initialize LC3 service
lc3Service.initialize().catch(error => {
  console.error('Failed to initialize LC3 service:', error);
});

console.log('✅ Session Service');

export default sessionService;