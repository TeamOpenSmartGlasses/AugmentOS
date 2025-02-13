// src/server.ts
import express, { type Express } from 'express';
import path from 'path';
import { TpaSession } from '../session';

export interface TpaServerConfig {
  packageName: string;
  apiKey: string;
  port?: number;
  webhookPath?: string;     // Allow customizing webhook endpoint
  publicDir?: string | false; // Explicitly false by default
  serverUrl?: string;
  healthCheck?: boolean;
}

export class TpaServer {
  private app: Express;
  private activeSessions = new Map<string, TpaSession>();
  private cleanupHandlers: Array<() => void> = [];

  constructor(private config: TpaServerConfig) {
    this.config = {
      port: 7010,
      webhookPath: '/webhook',  // Default but customizable
      publicDir: false,         // Off by default
      healthCheck: true,
      ...config
    };

    this.app = express();
    this.app.use(express.json());

    // Setup routes
    this.setupWebhook();
    this.setupHealthCheck();
    this.setupPublicDir();
    this.setupShutdown();
  }

  /**
   * Override this method to handle TPA session events
   */
  protected async onSession(tpa: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Default implementation - should be overridden by child class
    console.log(`New session: ${sessionId} for user ${userId}`);
  }

  /**
   * Start the server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        console.log(`TPA server running at http://localhost:${this.config.port}`);
        if (this.config.publicDir) {
          console.log(`Serving static files from ${this.config.publicDir}`);
        }
        resolve();
      });
    });
  }

  /**
   * Stop the server and cleanup all sessions
   */
  public stop(): void {
    console.log('\nShutting down...');
    this.cleanup();
    process.exit(0);
  }

  /**
   * Add a cleanup handler
   */
  protected addCleanupHandler(handler: () => void): void {
    this.cleanupHandlers.push(handler);
  }

  private setupWebhook(): void {
    if (!this.config.webhookPath) {
      console.error('Webhook path not set');
      throw new Error('Webhook path not set');
    }

    this.app.post(this.config.webhookPath, async (req, res) => {
      try {
        const { sessionId, userId } = req.body;
        console.log(`\n\n🗣️🗣️🗣️Received session request for user ${userId}, session ${sessionId}\n\n`);

        // Create new TPA client instance
        const tpa = new TpaSession({
          packageName: this.config.packageName,
          apiKey: this.config.apiKey,
          serverUrl: this.config.serverUrl
        });

        // Handle disconnection
        const cleanupDisconnect = tpa.events.onDisconnected(() => {
          console.log(`Session ${sessionId} disconnected`);
          this.activeSessions.delete(sessionId);
        });

        // Handle errors
        const cleanupError = tpa.events.onError((error) => {
          console.error(`[Session ${sessionId}] Error:`, error);
        });

        // Connect to AugmentOS Cloud
        try {
          await tpa.connect(sessionId);
          this.activeSessions.set(sessionId, tpa);

          // Call the session handler
          await this.onSession(tpa, sessionId, userId);

          res.status(200).json({ status: 'connected' });
        } catch (error) {
          console.error('Failed to connect:', error);
          cleanupDisconnect();
          cleanupError();
          res.status(500).json({ error: 'Failed to connect' });
        }

      } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

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

  private setupPublicDir(): void {
    if (this.config.publicDir) {  // Only if explicitly set
      const publicPath = path.resolve(this.config.publicDir);
      this.app.use(express.static(publicPath));
      console.log(`Serving static files from ${publicPath}`);
    }
  }

  private setupShutdown(): void {
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  private cleanup(): void {
    // Disconnect all active sessions
    for (const [sessionId, tpa] of this.activeSessions) {
      console.log(`Closing session ${sessionId}`);
      tpa.disconnect();
    }
    this.activeSessions.clear();

    // Run all cleanup handlers
    this.cleanupHandlers.forEach(handler => handler());
  }
}

// Example usage:
/*
class CaptionsServer extends TpaServer {
  protected async onSession(tpa: TpaClient, sessionId: string, userId: string): Promise<void> {
    // Handle transcription events
    const cleanup = tpa.events.onTranscription((data) => {
      tpa.layouts.showReferenceCard(
        "Captions",
        data.text,
        data.isFinal ? 3000 : undefined
      );
    });

    // Add cleanup handler
    this.addCleanupHandler(cleanup);
  }
}

const server = new CaptionsServer({
  packageName: 'org.mentra.captions',
  apiKey: 'test_key',
  port: 7010,
  publicDir: './public'
});

await server.start();
*/