import path from 'path';
import { TpaServer, TpaSession } from '@augmentos/sdk';
import { CLOUD_PORT } from '@augmentos/config';

const PACKAGE_NAME = "dev.augmentos.isaiah";
const API_KEY = 'test_key'; // In production, this would be securely stored
const PORT = 42022;

const isaiahUserId = "isaiah@mentra.glass";
const appSessions = new Map<string, TpaSession>();
let isIsaiahConnected = false;
let isIsaiahBusy = false;
let whosTalkingWithIsaiah: string | undefined;

class ActuallyIsaiahServer extends TpaServer {
  private didTheySay(triggerPhrase: string, transcription: string): boolean {
    return transcription.toLowerCase().includes(triggerPhrase.toLowerCase());
  }

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Store cleanup functions
    const cleanup = [
      session.events.onAudioChunk((data) => {
        console.log('Audio chunk:', data.arrayBuffer.byteLength);
      }),

      session.events.onTranscription((transcription) => {
        console.log('Transcription:', transcription.text);
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
const server = new ActuallyIsaiahServer({
  packageName: PACKAGE_NAME,
  apiKey: API_KEY,
  port: PORT,
  augmentOSWebsocketUrl: `ws://localhost:${CLOUD_PORT}/tpa-ws`,
  webhookPath: '/webhook',
  // publicDir: path.join(__dirname, './public')
});

server.start().catch(console.error);