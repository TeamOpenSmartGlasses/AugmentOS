/**
 * 🚀 TPA Server Module
 * 
 * Creates and manages a server for Third Party Apps (TPAs) in the AugmentOS ecosystem.
 * Handles webhook endpoints, session management, and cleanup.
 */
import express, { type Express } from 'express';
import path from 'path';
import { TpaSession } from '../session';

/**
 * 🔧 Configuration options for TPA Server
 * 
 * @example
 * ```typescript
 * const config: TpaServerConfig = {
 *   packageName: 'org.example.myapp',
 *   apiKey: 'your_api_key',
 *   port: 7010,
 *   publicDir: './public'
 * };
 * ```
 */
export interface TpaServerConfig {
  /** 📦 Unique identifier for your TPA (e.g., 'org.company.appname') */
  packageName: string;
  /** 🔑 API key for authentication with AugmentOS Cloud */
  apiKey: string;
  /** 🌐 Port number for the server (default: 7010) */
  port?: number;
  /** 🛣️ Custom path for the webhook endpoint (default: '/webhook') */
  webhookPath?: string;
  /** 
   * 📂 Directory for serving static files (e.g., images, logos)
   * Set to false to disable static file serving
   */
  publicDir?: string | false;
  /** 🔌 WebSocket server URL for AugmentOS Cloud */
  serverUrl?: string;
  /** ❤️ Enable health check endpoint at /health (default: true) */
  healthCheck?: boolean;
}

/**
 * 🎯 TPA Server Implementation
 * 
 * Base class for creating TPA servers. Handles:
 * - 🔄 Session lifecycle management
 * - 📡 Webhook endpoints for AugmentOS Cloud
 * - 📂 Static file serving
 * - ❤️ Health checks
 * - 🧹 Cleanup on shutdown
 * 
 * @example
 * ```typescript
 * class MyAppServer extends TpaServer {
 *   protected async onSession(session: TpaSession, sessionId: string, userId: string) {
 *     // Handle new user sessions here
 *     session.events.onTranscription((data) => {
 *       session.layouts.showTextWall(data.text);
 *     });
 *   }
 * }
 * 
 * const server = new MyAppServer({
 *   packageName: 'org.example.myapp',
 *   apiKey: 'your_api_key'
 * });
 * 
 * await server.start();
 * ```
 */
export class TpaServer {
  /** Express app instance */
  private app: Express;
  /** Map of active user sessions by sessionId */
  private activeSessions = new Map<string, TpaSession>();
  /** Array of cleanup handlers to run on shutdown */
  private cleanupHandlers: Array<() => void> = [];

  constructor(private config: TpaServerConfig) {
    // Set defaults and merge with provided config
    this.config = {
      port: 7010,
      webhookPath: '/webhook',
      publicDir: false,
      healthCheck: true,
      ...config
    };

    // Initialize Express app
    this.app = express();
    this.app.use(express.json());

    // Setup server features
    this.setupWebhook();
    this.setupHealthCheck();
    this.setupPublicDir();
    this.setupShutdown();
  }

  /**
   * 👥 Session Handler
   * Override this method to handle new TPA sessions.
   * This is where you implement your app's core functionality.
   * 
   * @param session - TPA session instance for the user
   * @param sessionId - Unique identifier for this session
   * @param userId - User's identifier
   */
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    console.log(`New session: ${sessionId} for user ${userId}`);
  }

  /**
   * 🚀 Start the Server
   * Starts listening for incoming connections and webhook calls.
   * 
   * @returns Promise that resolves when server is ready
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        console.log(`🎯 TPA server running at http://localhost:${this.config.port}`);
        if (this.config.publicDir) {
          console.log(`📂 Serving static files from ${this.config.publicDir}`);
        }
        resolve();
      });
    });
  }

  /**
   * 🛑 Stop the Server
   * Gracefully shuts down the server and cleans up all sessions.
   */
  public stop(): void {
    console.log('\n🛑 Shutting down...');
    this.cleanup();
    process.exit(0);
  }

  /**
   * 🧹 Add Cleanup Handler
   * Register a function to be called during server shutdown.
   * 
   * @param handler - Function to call during cleanup
   */
  protected addCleanupHandler(handler: () => void): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * 🎯 Setup Webhook Endpoint
   * Creates the webhook endpoint that AugmentOS Cloud calls to start new sessions.
   */
  private setupWebhook(): void {
    if (!this.config.webhookPath) {
      console.error('❌ Webhook path not set');
      throw new Error('Webhook path not set');
    }

    this.app.post(this.config.webhookPath, async (req, res) => {
      try {
        const { sessionId, userId } = req.body;
        console.log(`\n\n🗣️ Received session request for user ${userId}, session ${sessionId}\n\n`);

        // Create new TPA session
        const session = new TpaSession({
          packageName: this.config.packageName,
          apiKey: this.config.apiKey,
          serverUrl: this.config.serverUrl
        });

        // Setup session event handlers
        const cleanupDisconnect = session.events.onDisconnected(() => {
          console.log(`👋 Session ${sessionId} disconnected`);
          this.activeSessions.delete(sessionId);
        });

        const cleanupError = session.events.onError((error) => {
          console.error(`❌ [Session ${sessionId}] Error:`, error);
        });

        // Start the session
        try {
          await session.connect(sessionId);
          this.activeSessions.set(sessionId, session);
          await this.onSession(session, sessionId, userId);
          res.status(200).json({ status: 'connected' });
        } catch (error) {
          console.error('❌ Failed to connect:', error);
          cleanupDisconnect();
          cleanupError();
          res.status(500).json({ error: 'Failed to connect' });
        }
      } catch (error) {
        console.error('❌ Error handling webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  /**
   * ❤️ Setup Health Check Endpoint
   * Creates a /health endpoint for monitoring server status.
   */
  private setupHealthCheck(): void {
    if (this.config.healthCheck) {
      this.app.get('/health', (req, res) => {
        res.json({ 
          status: 'healthy', 
          app: this.config.packageName,
          activeSessions: this.activeSessions.size
        });
      });
    }
  }

  /**
   * 📂 Setup Static File Serving
   * Configures Express to serve static files from the specified directory.
   */
  private setupPublicDir(): void {
    if (this.config.publicDir) {
      const publicPath = path.resolve(this.config.publicDir);
      this.app.use(express.static(publicPath));
      console.log(`📂 Serving static files from ${publicPath}`);
    }
  }

  /**
   * 🛑 Setup Shutdown Handlers
   * Registers process signal handlers for graceful shutdown.
   */
  private setupShutdown(): void {
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  /**
   * 🧹 Cleanup
   * Closes all active sessions and runs cleanup handlers.
   */
  private cleanup(): void {
    // Close all active sessions
    for (const [sessionId, session] of this.activeSessions) {
      console.log(`👋 Closing session ${sessionId}`);
      session.disconnect();
    }
    this.activeSessions.clear();

    // Run cleanup handlers
    this.cleanupHandlers.forEach(handler => handler());
  }
}