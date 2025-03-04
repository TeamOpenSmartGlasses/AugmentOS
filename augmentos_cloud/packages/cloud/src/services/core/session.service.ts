// augmentos_cloud/packages/cloud/src/services/core/session.service.ts

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { StreamType, UserSession } from '@augmentos/sdk';
import { TranscriptSegment } from '@augmentos/sdk';
import { DisplayRequest } from '@augmentos/sdk';
import appService, { SYSTEM_TPAS } from './app.service';
import transcriptionService from '../processing/transcription.service';
import DisplayManager from '../layout/DisplayManager6.1';
import { LC3Service } from '@augmentos/utils';
import { ASRStreamInstance } from '../processing/transcription.service';

const RECONNECT_GRACE_PERIOD_MS = 30000; // 30 seconds
const LOG_AUDIO = false;
const PROCESS_AUDIO = true;

interface TimestampedAudioChunk {
  data: ArrayBuffer;
  timestamp: number;
}

export interface ExtendedUserSession extends UserSession {
  lc3Service?: LC3Service;
}

export class SessionService {
  private activeSessions = new Map<string, ExtendedUserSession>();

  constructor() { }

  async createSession(ws: WebSocket, userId = 'anonymous'): Promise<ExtendedUserSession> {
    const sessionId = uuidv4();
    const session: ExtendedUserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      activeAppSessions: [],
      installedApps: await appService.getAllApps(),
      whatToStream: new Array<StreamType>(),
      appSubscriptions: new Map<string, StreamType[]>(),
      transcriptionStreams: new Map<string, ASRStreamInstance>(),
      loadingApps: new Set<string>(),
      appConnections: new Map<string, WebSocket | any>(),
      OSSettings: { brightness: 50, volume: 50 },
      displayManager: new DisplayManager(),
      transcript: { segments: [] },
      websocket: ws as any,
      bufferedAudio: [],
      disconnectedAt: null,
      isTranscribing: false
    } as UserSession & { disconnectedAt: Date | null };

    // Create and initialize a new LC3Service instance for this session.
    const lc3ServiceInstance = new LC3Service();
    try {
      await lc3ServiceInstance.initialize();
      console.log(`✅ LC3 Service initialized for session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to initialize LC3 service for session ${sessionId}:`, error);
    }
    session.lc3Service = lc3ServiceInstance;

    this.activeSessions.set(sessionId, session);
    console.log(`[session.service] Created new session ${sessionId} for user ${userId}`);
    return session;
  }

  getSession(sessionId: string): ExtendedUserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  handleReconnectUserSession(newSession: ExtendedUserSession, userId: string): void {
    const oldUserSession = this.getSession(userId);
    if (oldUserSession) {
      newSession.activeAppSessions = oldUserSession.activeAppSessions;
      newSession.transcript = oldUserSession.transcript;
      newSession.OSSettings = oldUserSession.OSSettings;
      newSession.appSubscriptions = oldUserSession.appSubscriptions;
      newSession.appConnections = oldUserSession.appConnections;
      newSession.whatToStream = oldUserSession.whatToStream;
      newSession.isTranscribing = false; // Reset transcription state

      // Transfer LC3Service instance to new session
      if (oldUserSession.lc3Service) {
        newSession.lc3Service = oldUserSession.lc3Service;
      } else {
        console.error(`❌[${userId}]: No LC3 service found for reconnected session`);
        const lc3ServiceInstance = new LC3Service();
        try {
          lc3ServiceInstance.initialize();
          console.log(`✅ LC3 Service initialized for reconnected session ${newSession.sessionId}`);
        }
        catch (error) {
          console.error(`❌ Failed to initialize LC3 service for reconnected session ${newSession.sessionId}:`, error);
        }
        newSession.lc3Service = lc3ServiceInstance;
      }

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

  addTranscriptSegment(userSession: ExtendedUserSession, segment: TranscriptSegment): void {
    if (userSession) {
      userSession.transcript.segments.push(segment);
    }
  }

  async handleAudioData(
    userSession: ExtendedUserSession,
    audioData: ArrayBuffer | any,
    isLC3 = true
  ): Promise<ArrayBuffer | void> {
    // Update the last audio timestamp
    userSession.lastAudioTimestamp = Date.now();
  
    // If not transcribing, just ignore the audio
    if (!userSession.isTranscribing) {
      if (LOG_AUDIO) console.log('🔇 Skipping audio while transcription is paused');
      return;
    }
  
    // Process LC3 first if needed
    let processedAudioData = audioData;
    if (isLC3 && userSession.lc3Service) {
      try {
        processedAudioData = await userSession.lc3Service.decodeAudioChunk(audioData);
        if (!processedAudioData) {
          if (LOG_AUDIO) console.error(`❌ LC3 decode returned null for session ${userSession.sessionId}`);
          return; // Skip this chunk
        }
      } catch (error) {
        console.error('❌ Error decoding LC3 audio:', error);
        processedAudioData = null;
      }
    }

    transcriptionService.feedAudioToTranscriptionStreams(userSession, processedAudioData);
    return processedAudioData;
  }
  

  endSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    if (session.recognizer) {
      transcriptionService.stopTranscription(session);
    }

    // Clean up the LC3 instance for this session if it exists
    if (session.lc3Service) {
      session.lc3Service.cleanup();
    }

    this.activeSessions.delete(sessionId);
    console.log(`[Ended session] ${sessionId}`);
  }

  getAllSessions(): ExtendedUserSession[] {
    return Array.from(this.activeSessions.values());
  }

  markSessionDisconnected(userSession: ExtendedUserSession): void {
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
