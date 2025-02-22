// augmentos_cloud/packages/cloud/src/services/core/session.service.ts

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { StreamType, UserSession } from '@augmentos/types';
import { TranscriptSegment } from '@augmentos/types';
import { DisplayRequest } from '@augmentos/types';
import appService, { SYSTEM_TPAS } from './app.service';
import transcriptionService from '../processing/transcription.service';
import DisplayManager from '../layout/DisplayManager2';
import { lc3Service, createAudioProcessor } from '@augmentos/utils';

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
    if (!userSession.isTranscribing) {
      if (LOG_AUDIO) console.log('🔇 Not processing audio - transcription is disabled');
      return;
    }

    let processedAudioData = audioData;

    // Decode LC3 if needed
    if (isLC3) {
      if (!this.isLC3Initialized) {
        console.log('⚠️ LC3 Service not initialized, attempting to initialize...');
        await this.initializeLC3();

        if (!this.isLC3Initialized) {
          console.error('❌ LC3 Service failed to initialize, falling back to raw audio');
          processedAudioData = audioData;
        }
      }

      if (this.isLC3Initialized) {
        try {
          processedAudioData = await lc3Service.decodeAudioChunk(audioData);
          if (LOG_AUDIO) console.log('🎵 Decoded LC3 audio chunk');
        } catch (error) {
          console.error('❌ Error decoding LC3 audio:', error);
          // Fall back to raw audio
          processedAudioData = audioData;
        }
      }
    }

    // Add audio processor to enchance audio data. to make it Even Better.
    // Step 2: Process PCM audio if requested
    // if (PROCESS_AUDIO) {
    //   // Create audio processor if needed
    //   if (!userSession.audioProcessor) {
    //     userSession.audioProcessor = createAudioProcessor({
    //       threshold: -24,
    //       ratio: 3,
    //       gainDb: 16,
    //       attack: 5,
    //       release: 50,
    //       sampleRate: 16000,
    //       channels: 1
    //     });
    //   }

    //   try {
    //     const chunks: Buffer[] = [];
    //     await new Promise<void>((resolve, reject) => {
    //       if (!userSession.audioProcessor) {
    //         throw new Error(`[${userSession}]: Audio processor not initialized`);
    //       }
    //       userSession.audioProcessor
    //         .on('data', (chunk: Buffer) => {
    //           chunks.push(chunk);
    //         })
    //         .on('end', () => {
    //           processedAudioData = Buffer.concat(chunks);
    //           resolve();
    //         })
    //         .on('error', (err) => {
    //           console.error('❌ Error processing audio:', err);
    //           reject(err);
    //         });

    //       userSession.audioProcessor.write(Buffer.from(processedAudioData));
    //       userSession.audioProcessor.end();
    //     });

    //     if (LOG_AUDIO) console.log('🎚️ Applied audio processing');
    //   } catch (error) {
    //     console.error('❌ Error in audio processing:', error);
    //     // Continue with unprocessed PCM rather than failing completely
    //   }
    // }

    if (userSession.pushStream) {
      try {
        if (LOG_AUDIO) {
          console.log('🎤 Writing audio chunk to push stream');
          console.log('Session state:', {
            id: userSession.sessionId,
            hasRecognizer: !!userSession.recognizer,
            isTranscribing: userSession.isTranscribing,
            bufferSize: userSession.bufferedAudio.length,
            isLC3,
            lc3Initialized: this.isLC3Initialized
          });
        }
        userSession.pushStream.write(processedAudioData);
      } catch (error) {
        console.error('❌ Error writing to push stream:', error);
        console.error('Current session state:', {
          id: userSession.sessionId,
          hasRecognizer: !!userSession.recognizer,
          isTranscribing: userSession.isTranscribing,
          bufferSize: userSession.bufferedAudio.length,
          isLC3,
          lc3Initialized: this.isLC3Initialized
        });
        userSession.isTranscribing = false;
        transcriptionService.stopTranscription(userSession);
      }
    } else {
      userSession.bufferedAudio.push(processedAudioData);
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

// Initialize LC3 service
lc3Service.initialize().catch(error => {
  console.error('Failed to initialize LC3 service:', error);
});

console.log('✅ Session Service');

export default sessionService;