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
import appService from './app.service';

// You can adjust this value as needed.
const RECONNECT_GRACE_PERIOD_MS = 30000; // 30 seconds

/**
 * Interface defining the public API of the session service.
 */
export interface ISessionService {
  createSession(ws: WebSocket, userId?: string): UserSession;
  getSession(sessionId: string): UserSession | null;
  handleReconnectUserSession(newSession: UserSession, userId: string): void;
  updateDisplay(sessionId: string, displayRequest: DisplayRequest): void;
  addTranscriptSegment(sessionId: string, segment: TranscriptSegment): void;
  setAudioHandlers(sessionId: string, pushStream: any, recognizer: any): void;
  handleAudioData(sessionId: string, audioData: ArrayBuffer | any): void;
  getAllSessions(): UserSession[];

  // Graceful reconnect.
  // markSessionConnected(sessionId: string, ws?: WebSocket): void;
  markSessionDisconnected(sessionId: string): void;
  isItTimeToKillTheSession(sessionId: string): boolean;
  endSession(sessionId: string): void;
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
      activeAppSessions: [],
      installedApps: appService.getSystemApps(),
      whatToStream: ["*"],
      OSSettings: { brightness: 50, volume: 50 },

      displayManager: new DisplayManager(),
      transcript: { segments: [] },
      websocket: ws as any,
      pushStream: null,
      recognizer: null,
      bufferedAudio: [],
      // New property for graceful reconnects:
      disconnectedAt: null
    } as UserSession & { disconnectedAt: Date | null };

    this.activeSessions.set(sessionId, session);
    console.log(`[session.service] Created new session ${sessionId} for user ${userId}`);
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
   * (Optional) Finds an active session by userId.
   * Useful for reconnect scenarios where the same user reconnects.
   * @param userId - User identifier
   * @returns The first matching session or null if none found.
   */
  findSessionByUserId(userId: string): UserSession | null {
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Updates the user ID associated with a session.
   * See's if this user has an existing session, if so
   * @param newSession - new Session object
   * @param userId - New user identifier
   */
  handleReconnectUserSession(newSession: UserSession, userId: string): void {
    // if the user has an existing session, then transfer the existing session data to the new session. 🧳✈️
    // nuke the old session. 💣💥
    const oldUserSession = this.getSession(userId);
    if (oldUserSession) {
      newSession.activeAppSessions = oldUserSession.activeAppSessions;
      newSession.transcript = oldUserSession.transcript;
      newSession.displayManager = oldUserSession.displayManager;

      this.activeSessions.delete(oldUserSession.sessionId);
      console.log(`Transferred data from session ${oldUserSession.sessionId} to ${newSession.sessionId}`);

      // Cleanup speech services
      if (oldUserSession.recognizer) {
        oldUserSession.recognizer.stopContinuousRecognitionAsync();
      }
      if (oldUserSession.pushStream) {
        oldUserSession.pushStream.close();
      }

      // Close old websocket.
      if (oldUserSession.websocket.readyState === WebSocket.OPEN) {
        oldUserSession.websocket.close();
      }
    }

    // Update the user ID on the new session.
    newSession.userId = userId;
    newSession.sessionId = userId;
    
    this.activeSessions.set(newSession.sessionId, newSession);
    console.log(`Reconnected session ${newSession.sessionId} for user ${userId}`);

    // Mark the session as connected.
    // this.markSessionConnected(newSession.sessionId);

    // Notify the client of the reconnection.
    if (newSession.websocket.readyState === WebSocket.OPEN) {
      newSession.websocket.send(JSON.stringify({ type: 'reconnect' }));
    }

    // Hmm I think all the app sessions should still be connected because those are between server and TPA Servers.
    // only the user session is between the server and the client.
    // this handles the client side of the reconnection.
    // if the user session is disconnected, then the app sessions should still be connected.
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
    // session.activeAppSessions.forEach(appSession => {
    //   if (appSession.websocket?.readyState === WebSocket.OPEN) {
    //     appSession.websocket.close();
    //   }
    // });

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

  /**
   * Marks a session as disconnected by setting the disconnection timestamp.
   * This does not immediately end the session so that a reconnect can resume it.
   * @param sessionId - Session identifier
   */
  markSessionDisconnected(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.disconnectedAt = new Date();
      console.log(
        `Session ${sessionId} marked as disconnected at ${session.disconnectedAt.toISOString()}.`
      );
    }
  }

  // /**
  //  * Checks whether a session is still disconnected beyond the allowed grace period.
  //  * @param sessionId - Session identifier
  //  * @returns True if the session has been disconnected longer than the grace period.
  //  */
  isItTimeToKillTheSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (session && session.disconnectedAt) {
      const elapsed = Date.now() - session.disconnectedAt.getTime();
      return elapsed > RECONNECT_GRACE_PERIOD_MS;
    }
    return false;
  }
}

// Create singleton instance
export const sessionService = new SessionService();
console.log('✅ Session Service');

export default sessionService;
