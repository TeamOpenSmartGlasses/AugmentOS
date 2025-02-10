import express from 'express';
import path from 'path';
import { TpaClient, LayoutBuilder } from './lib/tpa-client'; // Import our new library

const app = express();
const PORT = 7010;

const PACKAGE_NAME = 'org.mentra.captions';
const API_KEY = 'test_key'; // In production, this would be securely stored
const AUGMENT_OS_TPA_WS = 'ws://localhost:7002/tpa-ws';
// Parse JSON bodies
app.use(express.json());

// Track active TPA client instances
const activeSessions = new Map<string, TpaClient>();

// Handle webhook call from AugmentOS Cloud
app.post('/webhook', async (req, res) => {
  try {
    const { sessionId, userId, timestamp } = req.body;
    console.log(`\n\n🗣️🗣️🗣️Received session request for user ${userId}, session ${sessionId}\n\n`);

    // Create new TPA client instance
    const tpa = new TpaClient({
      packageName: PACKAGE_NAME,
      apiKey: API_KEY,
      serverUrl: AUGMENT_OS_TPA_WS
    });

    // Set up event handlers
    tpa.on('connected', (settings) => {
      console.log(`\n[Session ${sessionId}] connected to augmentos-cloud\n`);
      // Subscribe to transcription stream
      tpa.subscribe(['transcription']);
      console.log(`Session ${sessionId} connected and subscribed`);
    });

    tpa.on('transcription', (data) => {
      // Show transcription in AR view
      tpa.sendDisplayEvent(
        LayoutBuilder.textRows([
          'Captions:',
          data.text
        ]),
        data.isFinal ? 3000 : undefined
      );
    });

    tpa.on('error', (error) => {
      console.error(`[Session ${sessionId}] Error:`, error);
    });

    tpa.on('disconnected', () => {
      console.log(`Session ${sessionId} disconnected`);
      activeSessions.delete(sessionId);
    });

    // Connect to AugmentOS Cloud
    try {
      await tpa.connect(sessionId);
      activeSessions.set(sessionId, tpa);
      res.status(200).json({ status: 'connected' });
    } catch (error) {
      console.error('Failed to connect:', error);
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
  console.log(`Captions TPA server running at http://localhost:${PORT}`);
  console.log(`Logo available at http://localhost:${PORT}/logo.png`);
});