/**
 * @fileoverview Core service for managing user sessions and app sessions.
 * This service is the central state manager for all real-time connections
 * and coordinates between glasses clients, TPAs, and various data streams.
 * 
 * Primary responsibilities:
 * - User session lifecycle management
 * - App session state management
 * - Audio stream handling and buffering
 * - Display state coordination
 * - Transcript management
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { UserSession } from '@augmentos/types';
import { TranscriptSegment } from '@augmentos/types/core/transcript';
import DisplayManager from '../layout/DisplayManager';
import { DisplayRequest } from '@augmentos/types/events/display';

/**
 * Interface defining the public API of the session service.
 */
export interface ISessionService {
  createSession(ws: WebSocket, userId?: string): UserSession;
  getSession(sessionId: string): UserSession | null;
  updateUserId(sessionId: string, userId: string): void;
  updateDisplay(sessionId: string, displayRequest: DisplayRequest): void;
  addTranscriptSegment(sessionId: string, segment: TranscriptSegment): void;
  setAudioHandlers(sessionId: string, pushStream: any, recognizer: any): void;
  handleAudioData(sessionId: string, audioData: ArrayBuffer | any): void;
  endSession(sessionId: string): void;
  getAllSessions(): UserSession[];
}

/**
 * Implementation of the session management service.
 * Design decisions:
 * 1. In-memory state for minimal latency
 * 2. Separation of user and app sessions
 * 3. Audio buffering for handling race conditions
 * 4. Stateless where possible for easier scaling
 */
export class SessionService implements ISessionService {
  /**
   * Map of active user sessions keyed by sessionId.
   * @private
   */
  private activeSessions = new Map<string, UserSession>();

  /**
   * Creates a new user session for a glasses client connection.
   * @param ws - WebSocket connection from the glasses client
   * @param userId - Optional user identifier, defaults to 'anonymous'
   * @returns Newly created user session
   */
  createSession(ws: WebSocket, userId = 'anonymous'): UserSession {
    const sessionId = uuidv4();
    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      activeAppSessions: new Map(),
      displayManager: new DisplayManager(),
      websocket: ws as any,
      transcript: { segments: [] },
      pushStream: null,
      recognizer: null,
      bufferedAudio: []
    };

    this.activeSessions.set(sessionId, session);
    console.log(`Created new session ${sessionId} for user ${userId}`);
    return session;
  }

  /**
   * Retrieves an active user session by ID.
   * @param sessionId - Session identifier
   * @returns User session if found, null otherwise
   */
  getSession(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Updates the user ID associated with a session.
   * @param sessionId - Session identifier
   * @param userId - New user identifier
   */
  updateUserId(sessionId: string, userId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.userId = userId;
      console.log(`Updated user ID for session ${sessionId} to ${userId}`);
    }
  }

  /**
   * Updates the display state for a session and notifies the client.
   * @param userSessionId - userSession identifier
   * @param displayRequest - New display request
   */
  updateDisplay(userSessionId: string, displayRequest: DisplayRequest): void {
    const session = this.getSession(userSessionId);
    if (!session) return;

    // Add to display history
    session.displayManager.handleDisplayEvent(displayRequest);

    if (session.websocket.readyState === WebSocket.OPEN) {
      session.websocket.send(JSON.stringify(displayRequest));
    }
  }

  /**
   * Adds a transcript segment to the session history.
   * @param sessionId - Session identifier
   * @param segment - Transcript segment to add
   */
  addTranscriptSegment(sessionId: string, segment: TranscriptSegment): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.transcript.segments.push(segment);
    }
  }

  /**
   * Sets up audio handling for a session.
   * @param sessionId - Session identifier
   * @param pushStream - Azure Speech Service push stream
   * @param recognizer - Azure Speech Service recognizer
   */
  setAudioHandlers(sessionId: string, pushStream: any, recognizer: any): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.pushStream = pushStream;
    session.recognizer = recognizer;

    // Process any buffered audio
    if (session.bufferedAudio.length > 0) {
      console.log(`Processing ${session.bufferedAudio.length} buffered audio chunks`);
      for (const chunk of session.bufferedAudio) {
        pushStream.write(chunk);
      }
      session.bufferedAudio = [];
    }
  }

  /**
   * Handles incoming audio data from the glasses client.
   * @param sessionId - Session identifier
   * @param audioData - Raw audio data buffer
   */
  handleAudioData(sessionId: string, audioData: ArrayBuffer | any): void {
    const session = this.getSession(sessionId);
    if (!session) return console.error(`🔥🔥🔥 Session ${sessionId} not found`);

    if (session.pushStream) {
      session.pushStream.write(audioData);
    } else {
      session.bufferedAudio.push(audioData);
      if (session.bufferedAudio.length === 1) {  // Log only for first buffer
        console.log(`Buffering audio data for session ${sessionId} (pushStream not ready)`);
      }
    }
  }

  /**
   * Ends a user session and cleans up all resources.
   * @param sessionId - Session identifier
   */
  endSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    // Cleanup speech services
    if (session.recognizer) {
      session.recognizer.stopContinuousRecognitionAsync();
    }
    if (session.pushStream) {
      session.pushStream.close();
    }

    // Close all app sessions
    session.activeAppSessions.forEach(appSession => {
      if (appSession.websocket?.readyState === WebSocket.OPEN) {
        appSession.websocket.close();
      }
    });

    this.activeSessions.delete(sessionId);
    console.log(`Ended session ${sessionId}`);
  }

  /**
   * Returns all active user sessions.
   * @returns Array of active user sessions
   */
  getAllSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }
}

// Create singleton instance
export const sessionService = new SessionService();
console.log('✅ Session Service');

export default sessionService;