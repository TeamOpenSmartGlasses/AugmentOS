import express from 'express';
import path from 'path';
import { TpaSession } from '@augmentos/clients';
// import { TpaSession } from '../../../clients';

const app = express();
const PORT = 7011;

const PACKAGE_NAME = 'org.mentra.flash';
const API_KEY = 'test_key'; // In production, this would be securely stored

// Parse JSON bodies
app.use(express.json());

// Track active TPA client instances
const activeSessions = new Map<string, TpaSession>();

// Handle webhook call from AugmentOS Cloud
app.post('/webhook', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    console.log(`\n\n🗣️🗣️🗣️Received session request for user ${userId}, session ${sessionId}\n\n`);

    // Create new TPA client instance
    const tpa = new TpaSession({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      serverUrl: 'ws://localhost:7002/tpa-ws'
    });

    // Store cleanup functions
    const cleanup = [
      // Handle transcription events
      tpa.events.onTranscription((data: any) => {
        // Show transcription in AR view using reference card
        tpa.layouts.showReferenceCard(
          "Flash",
          data.text,
          data.isFinal ? 3000 : undefined
        );

        // Log transcription
        console.log(`[Session ${sessionId}]: ${data.text}`);
      }),

      // Handle connection events
      tpa.events.onConnected((settings: any) => {
        console.log(`\n[Session ${sessionId}] connected to augmentos-cloud\n`);
        console.log(`Session ${sessionId} connected and subscribed`);
      }),

      // Handle errors
      tpa.events.onError((error: any) => {
        console.error(`[Session ${sessionId}] Error:`, error);
      }),

      // Handle disconnection
      tpa.events.onDisconnected(() => {
        console.log(`Session ${sessionId} disconnected`);
        activeSessions.delete(sessionId);

        // Clean up all event handlers
        cleanup.forEach(unsubscribe => unsubscribe());
      })
    ];

    // Connect to AugmentOS Cloud
    try {
      await tpa.connect(sessionId);
      activeSessions.set(sessionId, tpa);
      res.status(200).json({ status: 'connected' });
    } catch (error) {
      console.error('Failed to connect:', error);
      cleanup.forEach(unsubscribe => unsubscribe());
      res.status(500).json({ error: 'Failed to connect' });
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

// Add a route to verify the server is running
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    app: PACKAGE_NAME,
    activeSessions: activeSessions.size
  });
});

// Cleanup on server shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

function cleanup() {
  console.log('\nShutting down...');
  for (const [sessionId, tpa] of activeSessions) {
    console.log(`Closing session ${sessionId}`);
    tpa.disconnect();
  }
  activeSessions.clear();
  process.exit(0);
}

app.listen(PORT, () => {
  console.log(`Flash TPA server running at http://localhost:${PORT}`);
  console.log(`Logo available at http://localhost:${PORT}/logo.png`);
});