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

    let talkingWithIsaiah = false;
    let triggerPhrase = "isaiah";
    let endPhrase = "peace out";

    // Store cleanup functions
    const cleanup = [
      // Handle connection events
      session.events.onConnected((settings) => {
        if (userId === isaiahUserId) {
          console.log(`Isaiah connected!`);
          isIsaiahConnected = true;
        }

        // Store session.
        appSessions.set(sessionId, session);
        console.log(`User ${userId} started Hey Isaiah!`);
        session.layouts.showReferenceCard(".\I: Bonjour", "Welcome to Flash!", { durationMs: 3000 });
      }),

      session.events.onDisconnected(() => {
        if (userId === isaiahUserId) {
          console.log(`Isaiah disconnected!`);
          isIsaiahConnected = false;
          isIsaiahBusy = false;
        }

        // Remove session
        appSessions.delete(sessionId);
      }),

      // Handle transcription events
      session.events.onTranscription((data) => {
        if (talkingWithIsaiah) {
          // Send transcription to Isaiah.
          if (data.text.toLowerCase().includes(endPhrase)) {
            talkingWithIsaiah = false;
            isIsaiahBusy = false;
            whosTalkingWithIsaiah = undefined;
            session.layouts.showReferenceCard(`.\I: Peace out`, "Goodbye!", { durationMs: 2000 });
          } else {
            // Send transcription to Isaiah.
            console.log(`[User ${userId}]: ${data.text}`);
            appSessions.get(isaiahUserId)?.layouts.showReferenceCard(`.\I ${userId}:`, data.text, { durationMs: undefined });
          }
        } else {
          const isaiahMessage =
            isIsaiahConnected ?
              isIsaiahBusy ? "he's busy atm :.(" : "I'm listening (-_-)"
              : "Isaiah not connected.";
          if (this.didTheySay(triggerPhrase, data.text)) {
            if (isIsaiahConnected && !isIsaiahBusy) {
              talkingWithIsaiah = true;
              isIsaiahBusy = true;
              console.log(`[User ${userId}]: ${data.text}`);
              session.layouts.showReferenceCard(`.\I: ${isaiahMessage}`, isaiahMessage, { durationMs: 2000 });
            }
            else {
              // either isaiah is not connected or he's busy.
              console.log(`[User ${userId}]: ${data.text}`);
              session.layouts.showReferenceCard(".\I: Sorry", isaiahMessage, { durationMs: 2000 });
            }
          }
          // Log transcription
          console.log(`[User ${userId}]: ${data.text}`);
        }
        // Show transcription in AR view using reference card

      }),

      // session.events.onAudioChunk((data) => {
      //   // console.log(`[User ${userId}]: Received audio chunk of length ${data.arrayBuffer}`);
      // }),

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