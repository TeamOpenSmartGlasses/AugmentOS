import path from 'path';
import { TpaServer, TpaSession, StreamType } from '@augmentos/sdk';
import { CLOUD_PORT } from '@augmentos/config';

// Configuration
const PACKAGE_NAME = "dev.augmentos.isaiah";
const API_KEY = 'test_key'; // In production, use a secure environment variable
const PORT = 42022;

// Constants
const ISAIAH_USER_ID = "isaiah@mentra.glass";
const TRIGGER_PHRASE = "isaiah";
const END_PHRASE = "peace out";
const FEEDBACK_DURATION = 2000; // Duration for self-feedback messages (2 seconds)

// Conversation state management
interface Conversation {
  userId: string;        // User talking with Isaiah
  sessionId: string;     // Session ID for the user
  startTime: Date;       // When the conversation started
  lastActivity: Date;    // Last message timestamp
}

/**
 * Actually Isaiah TPA Server
 * 
 * Provides a communication channel between Isaiah and other AR glasses users.
 * Users can initiate conversations by saying "Isaiah", and both parties
 * see transcriptions of what the other is saying.
 */
class ActuallyIsaiahServer extends TpaServer {
  // State tracking
  private activeConversation: Conversation | null = null;
  private isaiahSession: TpaSession | null = null;
  private userSessions = new Map<string, TpaSession>();
  private isIsaiahConnected = false;

  /**
   * Check if text contains a specific phrase (case-insensitive)
   */
  private textContains(text: string, phrase: string): boolean {
    return text.toLowerCase().includes(phrase.toLowerCase());
  }

  /**
   * Format a text as an Isaiah message title
   */
  private formatTitle(speakerId: string): string {
    return speakerId === ISAIAH_USER_ID ? 
      ".\\i: Isaiah" : 
      `.\\i: ${speakerId.split('@')[0]}`;
  }

  /**
   * Handle a new session connection
   */
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    console.log(`User ${userId} connected with session ${sessionId}`);
    
    // Store session for later use
    this.userSessions.set(sessionId, session);
    
    // Set up special handling for Isaiah's session
    if (userId === ISAIAH_USER_ID) {
      this.isIsaiahConnected = true;
      this.isaiahSession = session;
      console.log(`🎉 Isaiah connected! Ready to help users.`);
      
      // Welcome message for Isaiah
      session.layouts.showReferenceCard(
        ".\\i: System", 
        "You are now connected. Users can reach you by saying 'Isaiah'.",
        { durationMs: 5000 }
      );
    } else {
      // Welcome for regular users
      session.layouts.showReferenceCard(
        ".\\i: Welcome", 
        "Say 'Isaiah' to start a conversation.",
        { durationMs: 3000 }
      );
    }

    // Subscribe to transcription events
    session.subscribe(StreamType.TRANSCRIPTION);

    // Set up event handlers
    const cleanupHandlers = [
      // Handle disconnection
      session.events.onDisconnected(() => {
        this.handleDisconnection(sessionId, userId);
      }),

      // Handle transcription events
      session.events.onTranscription((data) => {
        this.handleTranscription(sessionId, userId, data.text);
      }),

      // Handle errors
      session.events.onError((error) => {
        console.error(`[${userId}] Error:`, error);
      })
    ];

    // Register cleanup handlers
    cleanupHandlers.forEach(handler => this.addCleanupHandler(handler));
  }

  /**
   * Handle user disconnection
   */
  private handleDisconnection(sessionId: string, userId: string): void {
    console.log(`User ${userId} disconnected`);
    
    // Remove from sessions map
    this.userSessions.delete(sessionId);
    
    // Special handling for Isaiah
    if (userId === ISAIAH_USER_ID) {
      this.isIsaiahConnected = false;
      this.isaiahSession = null;
      console.log("😢 Isaiah disconnected!");
      
      // If there was an active conversation, notify the user
      if (this.activeConversation) {
        const userSession = this.userSessions.get(this.activeConversation.sessionId);
        if (userSession) {
          userSession.layouts.showReferenceCard(
            ".\\i: Disconnected", 
            "Isaiah has disconnected. Conversation ended.",
            { durationMs: 3000 }
          );
        }
        this.activeConversation = null;
      }
    }
    
    // Handle if disconnected user was in active conversation
    if (this.activeConversation && this.activeConversation.sessionId === sessionId) {
      console.log("User in active conversation disconnected");
      this.activeConversation = null;
      
      // Notify Isaiah if connected
      if (this.isaiahSession) {
        this.isaiahSession.layouts.showReferenceCard(
          ".\\i: System", 
          `${userId} has disconnected. Conversation ended.`,
          { durationMs: 3000 }
        );
      }
    }
  }

  /**
   * Handle transcription events
   */
  private handleTranscription(sessionId: string, userId: string, text: string): void {
    // Get session for this user
    const userSession = this.userSessions.get(sessionId);
    if (!userSession) return;

    // Check if this is Isaiah speaking
    const isIsaiahSpeaking = (userId === ISAIAH_USER_ID);
    
    // CASE 1: There is an active conversation
    if (this.activeConversation) {
      // Check if conversation should end
      if (this.textContains(text, END_PHRASE)) {
        this.endConversation("User requested to end the conversation");
        return;
      }

      // Get the other party in the conversation
      const isUserInConversation = (sessionId === this.activeConversation.sessionId);
      
      if (isIsaiahSpeaking) {
        // Isaiah is speaking - show to user in conversation
        if (isUserInConversation) {
          // Show Isaiah's message to the user (persistent)
          userSession.layouts.showReferenceCard(
            this.formatTitle(ISAIAH_USER_ID),
            text,
            { durationMs: -1 }
          );
          
          // Show brief self-feedback to Isaiah
          if (this.isaiahSession) {
            this.isaiahSession.layouts.showReferenceCard(
              ".\\I: You",
              text,
              { durationMs: FEEDBACK_DURATION }
            );
          }
        }
      } else if (isUserInConversation) {
        // User in conversation is speaking
        
        // 1. Show to Isaiah (persistent)
        if (this.isaiahSession) {
          this.isaiahSession.layouts.showReferenceCard(
            this.formatTitle(userId),
            text,
            { durationMs: -1 }
          );
        }
        
        // 2. Show brief self-feedback to the user
        userSession.layouts.showReferenceCard(
          ".\\I: You",
          text,
          { durationMs: FEEDBACK_DURATION }
        );
        
        // Update activity timestamp
        this.activeConversation.lastActivity = new Date();
      }
    }
    // CASE 2: No active conversation - check if trying to start one
    else if (!isIsaiahSpeaking && this.textContains(text, TRIGGER_PHRASE)) {
      // User wants to talk to Isaiah
      if (this.isIsaiahConnected) {
        // Start a new conversation
        this.startConversation(sessionId, userId);
        
        // Show initial messages
        userSession.layouts.showReferenceCard(
          ".\\I: Connected",
          "Isaiah is now listening. Say 'peace out' when you're done.",
          { durationMs: 3000 }
        );
        
        if (this.isaiahSession) {
          this.isaiahSession.layouts.showReferenceCard(
            ".\\I: New Conversation",
            `${userId} wants to talk with you. They said: "${text}"`,
            { durationMs: -1 }
          );
        }
      } else {
        // Isaiah is not available
        userSession.layouts.showReferenceCard(
          ".\\I: Unavailable",
          "Isaiah is not connected right now. Please try again later.",
          { durationMs: 3000 }
        );
      }
    }

    // Or it is Isaiah speaking and there is no active conversation.
    // In this case lets show Isaiah his own message...
    if (isIsaiahSpeaking && !this.activeConversation) {
      userSession.layouts.showReferenceCard(
        this.formatTitle(ISAIAH_USER_ID),
        text,
        { durationMs: 3000 }
      );
    }
  }

  /**
   * Start a new conversation between Isaiah and a user
   */
  private startConversation(sessionId: string, userId: string): void {
    console.log(`Starting conversation between Isaiah and ${userId}`);
    
    this.activeConversation = {
      userId,
      sessionId,
      startTime: new Date(),
      lastActivity: new Date()
    };
  }

  /**
   * End the current conversation
   */
  private endConversation(reason: string): void {
    if (!this.activeConversation) return;
    
    console.log(`Ending conversation with ${this.activeConversation.userId}: ${reason}`);
    
    // Notify both parties
    const userSession = this.userSessions.get(this.activeConversation.sessionId);
    if (userSession) {
      userSession.layouts.showReferenceCard(
        ".\\I: Conversation Ended",
        "Your conversation with Isaiah has ended. Say 'Isaiah' to start a new one.",
        { durationMs: 3000 }
      );
    }
    
    if (this.isaiahSession) {
      this.isaiahSession.layouts.showReferenceCard(
        ".\\I: Conversation Ended",
        `Your conversation with ${this.activeConversation.userId} has ended.`,
        { durationMs: 3000 }
      );
    }
    
    // Clear the active conversation
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
  // Uncomment if you have static assets to serve
  // publicDir: path.join(__dirname, './public')
});

// Start the server
server.start()
  .then(() => console.log(`✅ Actually Isaiah server running on port ${PORT}`))
  .catch(error => console.error('Failed to start server:', error));