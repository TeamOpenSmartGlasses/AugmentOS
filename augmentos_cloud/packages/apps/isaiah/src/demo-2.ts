import path from 'path';
import { TpaServer, TpaSession, StreamType } from '@augmentos/sdk';
import { CLOUD_PORT } from '@augmentos/config';

// Configuration
const PACKAGE_NAME = "dev.augmentos.isaiah";
const API_KEY = 'test_key'; // In production, use a secure environment variable
const PORT = 42022;

// Constants
const ISAIAH_USER_ID = "isaiah@mentra.glass";
const TRIGGER_PHRASE_ISAIAH = "isaiah";
const TRIGGER_PHRASE_HEY = "hey";
const END_PHRASE = "peace out";
const FEEDBACK_DURATION = 10000; // in ms
const MAX_DISPLAY_REFRESH_DELAY = 1000; // in ms

// Structures
interface TranscriptMessage {
  userId: string;
  text: string;
  timestamp: Date;
}

interface Participant {
  sessionId: string;
  userId: string;
  // Determines which transcript to show:
  // true = show own transcript (i.e. head is "up")
  // false = show partner's transcript (i.e. head is "down")
  isLookingUp: boolean;
}

interface Conversation {
  participantA: Participant;
  participantB: Participant;
  transcript: TranscriptMessage[];
  lastActivity: Date;
  pendingDisplayUpdate: boolean;
  displayUpdateTimer: NodeJS.Timeout | null;
}

/**
 * Isaiah server – simpler version.
 * 
 * Display behavior:
 * - When in a conversation:
 *     - Title always shows ".\i (name): speaking... | listening..."
 *     - When head position is up, you see your own transcript.
 *     - When down, you see your partner's transcript.
 * - When not in a conversation:
 *     - The display shows the chat room listing.
 * 
 * Conversation triggers:
 * - Saying "isaiah" (for non-Isaiah users) connects with Isaiah.
 * - Saying "hey <name fragment>" connects with a matching user.
 */
class ActuallyIsaiahServer extends TpaServer {
  private activeConversation: Conversation | null = null;
  private isaiahSession: TpaSession | null = null;
  private userSessions = new Map<string, { session: TpaSession, userId: string }>();

  private textContains(text: string, phrase: string): boolean {
    return text.toLowerCase().includes(phrase.toLowerCase());
  }

  // Returns an array of connected user names (excluding domain)
  private getAllUsers(): string[] {
    const users: string[] = [];
    for (const [_, info] of this.userSessions) {
      if (info.userId) {
        users.push(info.userId.split('@')[0]);
      }
    }
    return users;
  }

  // Get your own transcript messages from the conversation.
  private filterTranscriptByUser(userId: string): string {
    if (!this.activeConversation) return "";
    const messages = this.activeConversation.transcript.filter(msg => msg.userId === userId);
    return messages.map(msg => `${msg.userId.split('@')[0]}: ${msg.text.trim()}`).join("\n\n");
  }

  // Get your partner's transcript messages.
  private filterTranscriptByPartner(userId: string): string {
    if (!this.activeConversation) return "";
    const messages = this.activeConversation.transcript.filter(msg => msg.userId !== userId);
    return messages.map(msg => `${msg.userId.split('@')[0]}: ${msg.text.trim()}`).join("\n\n");
  }

  /**
   * Update the display for a given session.
   * 
   * - In a conversation, uses head position flag to choose the transcript.
   * - Out of conversation, shows the chat room (list of users).
   */
  private updateDisplayForSession(sessionId: string): void {
    const sessionInfo = this.userSessions.get(sessionId);
    if (!sessionInfo) return;
    const userId = sessionInfo.userId;
    let title = `.\\i ${userId.split('@')[0]}: `;
    let body = "";
    
    if (this.activeConversation) {
      let selfParticipant: Participant | null = null;
      const { participantA, participantB } = this.activeConversation;
      if (participantA.sessionId === sessionId) {
        selfParticipant = participantA;
      } else if (participantB.sessionId === sessionId) {
        selfParticipant = participantB;
      }
      if (selfParticipant) {
        title += "speaking... | listening...";
        body = selfParticipant.isLookingUp ? 
          this.filterTranscriptByUser(userId) :
          this.filterTranscriptByPartner(userId);
      }
    } else {
      title += "idle";
      body = `Users in room:\n${this.getAllUsers().join(', ') || "None"}`;
    }
    
    sessionInfo.session.layouts.showReferenceCard(title, body, { durationMs: 10000 });
  }

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    console.log(`User ${userId} connected with session ${sessionId}`);
    this.userSessions.set(sessionId, { session, userId });
    
    if (userId === ISAIAH_USER_ID) {
      this.isaiahSession = session;
      session.layouts.showReferenceCard(
        ".\\i: System", 
        "You are now connected. Normal users can reach you by saying 'isaiah'. You can also use 'hey' to test as a normal user.",
        { durationMs: 5000 }
      );
    } else {
      session.layouts.showReferenceCard(
        ".\\i: Welcome", 
        "Say 'isaiah' to connect with Isaiah or 'hey <name>' to connect with someone.",
        { durationMs: 5000 }
      );
    }
    
    session.subscribe(StreamType.TRANSCRIPTION);
    session.subscribe(StreamType.HEAD_POSITION);

    const cleanupHandlers = [
      session.events.onDisconnected(() => {
        this.handleDisconnection(sessionId);
      }),
      session.events.onTranscription((data) => {
        this.handleTranscription(sessionId, data.text);
      }),
      session.events.onHeadPosition((data) => {
        // Expecting data.position to be "up" or "down"
        if (this.activeConversation) {
          const conv = this.activeConversation;
          for (const participant of [conv.participantA, conv.participantB]) {
            if (participant.sessionId === sessionId) {
              participant.isLookingUp = (data.position.toLowerCase() === "up");
            }
          }
        }
        this.updateDisplayForSession(sessionId);
      }),
      session.events.onError((error) => {
        console.error(`[${userId}] Error:`, error);
      })
    ];
    cleanupHandlers.forEach(handler => this.addCleanupHandler(handler));
  }

  private handleDisconnection(sessionId: string): void {
    const sessionInfo = this.userSessions.get(sessionId);
    if (!sessionInfo) return;
    const userId = sessionInfo.userId;
    console.log(`User ${userId} disconnected`);
    this.userSessions.delete(sessionId);
    
    if (userId === ISAIAH_USER_ID) {
      this.isaiahSession = null;
      console.log("Isaiah disconnected!");
      if (this.activeConversation) {
        const otherSessionId = (this.activeConversation.participantA.sessionId === sessionId ?
                                this.activeConversation.participantB.sessionId :
                                this.activeConversation.participantA.sessionId);
        const otherSessionInfo = this.userSessions.get(otherSessionId);
        if (otherSessionInfo) {
          otherSessionInfo.session.layouts.showReferenceCard(
            ".\\i: Disconnected", 
            "Isaiah has disconnected. Conversation ended.",
            { durationMs: 5000 }
          );
        }
        if (this.activeConversation.displayUpdateTimer) {
          clearTimeout(this.activeConversation.displayUpdateTimer);
        }
        this.activeConversation = null;
      }
    } else {
      if (this.activeConversation &&
          (this.activeConversation.participantA.sessionId === sessionId ||
           this.activeConversation.participantB.sessionId === sessionId)) {
        const otherSessionId = (this.activeConversation.participantA.sessionId === sessionId ?
                                this.activeConversation.participantB.sessionId :
                                this.activeConversation.participantA.sessionId);
        const otherSessionInfo = this.userSessions.get(otherSessionId);
        if (otherSessionInfo) {
          otherSessionInfo.session.layouts.showReferenceCard(
            ".\\i: Disconnected", 
            `${userId} disconnected. Conversation ended.`,
            { durationMs: 5000 }
          );
        }
        if (this.activeConversation.displayUpdateTimer) {
          clearTimeout(this.activeConversation.displayUpdateTimer);
        }
        this.activeConversation = null;
      }
    }
  }

  private handleTranscription(sessionId: string, text: string): void {
    const sessionInfo = this.userSessions.get(sessionId);
    if (!sessionInfo) return;
    const userId = sessionInfo.userId;
    const isIsaiahSpeaking = (userId === ISAIAH_USER_ID);
    console.log(`[TRANSCRIPT] ${userId}: "${text}"`);
    
    if (this.activeConversation) {
      if (this.textContains(text, END_PHRASE)) {
        this.endConversation(`User ${userId} requested to end conversation.`);
        return;
      }
      this.activeConversation.transcript.push({
        userId,
        text,
        timestamp: new Date()
      });
      this.activeConversation.lastActivity = new Date();
      
      sessionInfo.session.layouts.showReferenceCard(
        ".\\i: You", text, { durationMs: FEEDBACK_DURATION }
      );
      
      if (!this.activeConversation.pendingDisplayUpdate) {
        this.activeConversation.pendingDisplayUpdate = true;
        if (this.activeConversation.displayUpdateTimer) {
          clearTimeout(this.activeConversation.displayUpdateTimer);
        }
        this.activeConversation.displayUpdateTimer = setTimeout(() => {
          this.updateDisplayForSession(this.activeConversation!.participantA.sessionId);
          this.updateDisplayForSession(this.activeConversation!.participantB.sessionId);
          this.activeConversation!.pendingDisplayUpdate = false;
          this.activeConversation!.displayUpdateTimer = null;
        }, MAX_DISPLAY_REFRESH_DELAY);
      }
    } else {
      // When not in a conversation, update the chat room display after FEEDBACK_DURATION.
      setTimeout(() => {
        this.updateDisplayForSession(sessionId);
      }, FEEDBACK_DURATION);
      
      // Process trigger phrases
      if (!isIsaiahSpeaking && this.textContains(text, TRIGGER_PHRASE_ISAIAH)) {
        if (this.isaiahSession) {
          this.startConversationWith(ISAIAH_USER_ID, sessionId, userId, text);
          sessionInfo.session.layouts.showReferenceCard(
            ".\\i: Connected", 
            "You are now connected with Isaiah. Look up to see your messages; down to see his.",
            { durationMs: 5000 }
          );
          this.isaiahSession.layouts.showReferenceCard(
            ".\\i: New Conversation",
            `${userId} wants to talk with you: "${text}"`,
            { durationMs: 5000 }
          );
        } else {
          sessionInfo.session.layouts.showReferenceCard(
            ".\\i: Unavailable",
            "Isaiah is not connected. Please try again later.",
            { durationMs: 5000 }
          );
        }
      } else if (this.textContains(text, TRIGGER_PHRASE_HEY)) {
        const match = text.toLowerCase().split(TRIGGER_PHRASE_HEY)[1]?.trim();
        if (match) {
          let targetUser: string | null = null;
          for (const [_, info] of this.userSessions) {
            if (!isIsaiahSpeaking && info.userId === userId) continue;
            if (info.userId.toLowerCase().includes(match)) {
              targetUser = info.userId;
              break;
            }
          }
          if (targetUser) {
            this.startConversationWith(targetUser, sessionId, userId, text);
            sessionInfo.session.layouts.showReferenceCard(
              ".\\i: Connected",
              `You are now connected with ${targetUser.split('@')[0]}. Look up for your own messages; down for theirs.`,
              { durationMs: 5000 }
            );
            for (const [sessId, info] of this.userSessions) {
              if (info.userId === targetUser) {
                info.session.layouts.showReferenceCard(
                  ".\\i: New Conversation",
                  `${userId.split('@')[0]} wants to talk with you: "${text}"`,
                  { durationMs: 5000 }
                );
              }
            }
          } else {
            sessionInfo.session.layouts.showReferenceCard(
              ".\\i: Not Found",
              `No user found matching "${match}".`,
              { durationMs: 5000 }
            );
          }
        }
      } else {
        sessionInfo.session.layouts.showReferenceCard(
          ".\\i: You", text, { durationMs: FEEDBACK_DURATION }
        );
      }
    }
  }

  private startConversationWith(targetUserId: string, initiatorSessionId: string, initiatorUserId: string, initialText: string): void {
    console.log(`Starting conversation between ${initiatorUserId} and ${targetUserId}`);
    let targetSessionId: string | null = null;
    for (const [sessId, info] of this.userSessions) {
      if (info.userId === targetUserId) {
        targetSessionId = sessId;
        break;
      }
    }
    if (!targetSessionId) return;
    const participantA: Participant = { sessionId: initiatorSessionId, userId: initiatorUserId, isLookingUp: true };
    const participantB: Participant = { sessionId: targetSessionId, userId: targetUserId, isLookingUp: true };
    this.activeConversation = {
      participantA,
      participantB,
      transcript: [{
        userId: initiatorUserId,
        text: initialText,
        timestamp: new Date()
      }],
      lastActivity: new Date(),
      pendingDisplayUpdate: false,
      displayUpdateTimer: null
    };
  }

  private endConversation(reason: string): void {
    if (!this.activeConversation) return;
    console.log(`Ending conversation: ${reason}`);
    for (const participant of [this.activeConversation.participantA, this.activeConversation.participantB]) {
      const sessInfo = this.userSessions.get(participant.sessionId);
      if (sessInfo) {
        sessInfo.session.layouts.showReferenceCard(
          ".\\i: Peace out!",
          "Conversation ended. Say 'isaiah' or 'hey <name>' to start a new one.",
          { durationMs: 5000 }
        );
      }
    }
    if (this.activeConversation.displayUpdateTimer) {
      clearTimeout(this.activeConversation.displayUpdateTimer);
    }
    this.activeConversation = null;
  }
}

// Create and start the server
const server = new ActuallyIsaiahServer({
  packageName: PACKAGE_NAME,
  apiKey: API_KEY,
  port: PORT,
  augmentOSWebsocketUrl: `ws://localhost:${CLOUD_PORT}/tpa-ws`,
  webhookPath: '/webhook',
  // publicDir: path.join(__dirname, './public')
});

server.start()
  .then(() => console.log(`✅ Actually Isaiah server running on port ${PORT}`))
  .catch(error => console.error('Failed to start server:', error));
