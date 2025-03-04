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
const FEEDBACK_DURATION = 3000; // Duration for self-feedback messages (3 seconds)
const MAX_SELF_PREVIEW_LENGTH = 30; // Maximum characters for self-preview

// Conversation state management
interface Conversation {
  userId: string;        // User talking with Isaiah
  sessionId: string;     // Session ID for the user
  startTime: Date;       // When the conversation started
  lastActivity: Date;    // Last message timestamp
  lastUserText: string;  // Last thing the user said
  lastIsaiahText: string; // Last thing Isaiah said
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
   * Truncate text for self-preview
   */
  private truncateForPreview(text: string): string {
    if (text.length <= MAX_SELF_PREVIEW_LENGTH) {
      return text;
    }
    return text.substring(0, MAX_SELF_PREVIEW_LENGTH) + "...";
  }

  /**
   * Create a combined display with self-preview and other's text
   */
  private createCombinedDisplay(selfText: string, otherText: string, otherSpeakerId: string): {title: string, text: string} {
    const selfPreview = this.truncateForPreview(selfText);
    
    return {
      title: this.formatTitle(otherSpeakerId),
      text: `You: (${selfPreview})\n${otherText}`
    };
  }

  // Get all users user names. exclude isaiah.
  private getAllUsers(): string[] {
    const _emails =  Array.from(this.userSessions.keys()).filter((userId) => userId !== ISAIAH_USER_ID);
    return _emails.map((email) => email.split('@')[0]);
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
      console.log("⚡️ Displaying welcome message to Isaiah");
      console.log("All users: ", this.getAllUsers());
    } else {
      // Welcome for regular users
      session.layouts.showReferenceCard(
        ".\\i: Welcome", 
        "Say 'Isaiah' to start a conversation.",
        { durationMs: 3000 }
      );
      console.log("⚡️ Displaying welcome message to " + userId);
      console.log("All users: ", this.getAllUsers());
    }

    // Subscribe to transcription events
    session.events.onTranscription((data) => {
      this.handleTranscription(sessionId, userId, data.text);
    });

    let _headDirection: "up" | "down" = "down";



    // Set up event handlers
    const cleanupHandlers = [
      // Handle disconnection
      session.events.onDisconnected(() => {
        this.handleDisconnection(sessionId, userId);
      }),

      session.events.onHeadPosition((data) => {
        console.log(`[${userId}] Head Position:`, data);
        _headDirection = data.position === "up" ? "up" : "down";
        if (this.isaiahSession) {
          this.isaiahSession.layouts.showReferenceCard(
            ".\\i: Connected Users",
            `${userId} is look ing ${_headDirection}`,
            { durationMs: 3000 }
          );
        }
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
    
    console.log(`[TRANSCRIPT] ${userId}: "${text}"`);
    
    // CASE 1: There is an active conversation
    if (this.activeConversation) {
      // Check if conversation should end
      if (this.textContains(text, END_PHRASE)) {
        this.endConversation("User requested to end the conversation");
        return;
      }

      // Get the other party in the conversation
      const isUserInConversation = (sessionId === this.activeConversation.sessionId);
      const otherSession = isIsaiahSpeaking ? 
                          this.userSessions.get(this.activeConversation.sessionId) : 
                          this.isaiahSession;
      
      if (isIsaiahSpeaking) {
        // Isaiah is speaking
        
        // 1. Update conversation state
        this.activeConversation.lastIsaiahText = text;
        this.activeConversation.lastActivity = new Date();
        
        // 2. Show brief self-feedback to Isaiah
        if (this.isaiahSession) {
          this.isaiahSession.layouts.showReferenceCard(
            ".\\i: You",
            text,
            { durationMs: FEEDBACK_DURATION }
          );
        }
        
        // 3. Show Isaiah's message to the user in conversation (persistent)
        if (otherSession && isUserInConversation) {
          const display = this.activeConversation.lastUserText ? 
            this.createCombinedDisplay(
              this.activeConversation.lastUserText,
              text,
              ISAIAH_USER_ID
            ) : 
            { title: this.formatTitle(ISAIAH_USER_ID), text };
            
          otherSession.layouts.showReferenceCard(
            display.title,
            display.text,
            { durationMs: -1 }
          );
        }
      } else if (isUserInConversation) {
        // User in conversation is speaking
        
        // 1. Update conversation state
        this.activeConversation.lastUserText = text;
        this.activeConversation.lastActivity = new Date();
        
        // 2. Show brief self-feedback to the user
        userSession.layouts.showReferenceCard(
          ".\\i: You",
          text,
          { durationMs: FEEDBACK_DURATION }
        );
        
        // 3. Show the message to Isaiah (persistent)
        if (otherSession) {
          const display = this.activeConversation.lastIsaiahText ? 
            this.createCombinedDisplay(
              this.activeConversation.lastIsaiahText,
              text,
              userId
            ) : 
            { title: this.formatTitle(userId), text };
            
          otherSession.layouts.showReferenceCard(
            display.title,
            display.text,
            { durationMs: -1 }
          );
        }
      }
    }
    // CASE 2: No active conversation - check if trying to start one
    else if (!isIsaiahSpeaking && this.textContains(text, TRIGGER_PHRASE)) {
      // User wants to talk to Isaiah
      if (this.isIsaiahConnected) {
        // Start a new conversation
        this.startConversation(sessionId, userId, text);
        
        // Show initial messages
        userSession.layouts.showReferenceCard(
          ".\\i: Connected",
          "Isaiah is now listening. Say 'peace out' when you're done.",
          { durationMs: 5000 }
        );
        
        if (this.isaiahSession) {
          this.isaiahSession.layouts.showReferenceCard(
            ".\\i: New Conversation",
            `${userId} wants to talk with you. They said: "${text}"`,
            { durationMs: -1 }
          );
        }
      } else {
        // Isaiah is not available
        userSession.layouts.showReferenceCard(
          ".\\i: Unavailable",
          "Isaiah is not connected right now. Please try again later.",
          { durationMs: 5000 }
        );
      }
    }

    // If Isaiah is speaking while not in a conversation
    // Show him his own speech as feedback
    else if (isIsaiahSpeaking && !this.activeConversation) {
      userSession.layouts.showReferenceCard(
        ".\\i: You (Isaiah)",
        text,
        { durationMs: 5000 }
      );
    }
  }

  /**
   * Start a new conversation between Isaiah and a user
   */
  private startConversation(sessionId: string, userId: string, initialText: string): void {
    console.log(`Starting conversation between Isaiah and ${userId}`);
    
    this.activeConversation = {
      userId,
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      lastUserText: initialText,
      lastIsaiahText: ""
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
        ".\\i: Peace out!!!",
        "Conversation Ended",
        { durationMs: 5000 }
      );
    }
    
    if (this.isaiahSession) {
      this.isaiahSession.layouts.showReferenceCard(
        `.\\i: Peace out!!!`,
        `Conversation with ${this.activeConversation.userId} ended.`,
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