import { TpaServer, TpaSession } from '@augmentos/clients';
import path from 'path';

class FlashServer extends TpaServer {
  // Changed from onNewSession to onSession to match parent class
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    console.log(`Setting up flash for session ${sessionId}`);

    // Store cleanup functions
    const cleanup = [
      // Handle transcription events
      session.events.onTranscription((data) => {
        // Show transcription in AR view using reference card
        session.layouts.showReferenceCard(
          "Flash",
          data.text,
          data.isFinal ? 3000 : undefined
        );

        // Log transcription
        console.log(`[User ${userId}]: ${data.text}`);
      }),

      // Handle connection events
      session.events.onConnected((settings) => {
        console.log(`\n[User ${userId}] connected to augmentos-cloud\n`);
      }),

      // Handle errors
      session.events.onError((error) => {
        console.error(`[User ${userId}] Error:`, error);
      })
    ];

    // Add cleanup handlers
    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}

// Create and start the server
const server = new FlashServer({
  packageName: 'org.mentra.flash',
  apiKey: 'test_key',
  port: 7011,
  serverUrl: 'ws://localhost:7002/tpa-ws',
  webhookPath: '/webhook',
  publicDir: path.join(__dirname, './public')
});

server.start().catch(console.error);