// augmentos_cloud/packages/apps/captions/src/index.ts
import express from 'express';
import WebSocket from 'ws';
import path from 'path';
import {
  TpaConnectionInitMessage,
  CloudDataStreamMessage,
  DisplayRequest,
  TpaSubscriptionUpdateMessage,
} from '@augmentos/types'; // Import the types from the shared package
import { TranscriptProcessor } from '../../../utils/text-wrapping/TranscriptProcessor';
import { systemApps, CLOUD_PORT } from '@augmentos/types/config/cloud.env';

const app = express();
const PORT = systemApps.captions.port;
const PACKAGE_NAME = systemApps.captions.packageName;
const API_KEY = 'test_key'; // In production, this would be securely stored

const userTranscriptProcessors: Map<string, TranscriptProcessor> = new Map();

// Parse JSON bodies
app.use(express.json());

// Track active sessions
const activeSessions = new Map<string, WebSocket>();

// Handle webhook call from AugmentOS Cloud
app.post('/webhook', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    console.log(`\n\n🗣️🗣️🗣️Received session request for user ${userId}, session ${sessionId}\n\n`);

    // Start WebSocket connection to cloud
    const ws = new WebSocket(`ws://localhost:${CLOUD_PORT}/tpa-ws`);

    ws.on('open', () => {
      console.log(`\n[Session ${sessionId}]\n connected to augmentos-cloud\n`);
      // Send connection init with session ID
      const initMessage: TpaConnectionInitMessage = {
        type: 'tpa_connection_init',
        sessionId,
        packageName: PACKAGE_NAME,
        apiKey: API_KEY
      };
      ws.send(JSON.stringify(initMessage));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(sessionId, ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`Session ${sessionId} disconnected`);
      activeSessions.delete(sessionId);
      userTranscriptProcessors.delete(sessionId);
    });

    activeSessions.set(sessionId, ws);
    userTranscriptProcessors.set(sessionId, new TranscriptProcessor(30, 3));
    res.status(200).json({ status: 'connecting' });

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

function handleMessage(sessionId: string, ws: WebSocket, message: any) {
  switch (message.type) {
    case 'tpa_connection_ack': {
      // Connection acknowledged, subscribe to transcription
      const subMessage: TpaSubscriptionUpdateMessage = {
        type: 'subscription_update',
        packageName: PACKAGE_NAME,
        sessionId,
        subscriptions: ['transcription']
      };
      ws.send(JSON.stringify(subMessage));
      console.log(`Session ${sessionId} connected and subscribed`);
      break;
    }

    case 'data_stream': {
      const streamMessage = message as CloudDataStreamMessage;
      if (streamMessage.streamType === 'transcription') {
        handleTranscription(sessionId, ws, streamMessage.data);
      }
      break;
    }

    default:
      console.log('Unknown message type:', message.type);
  }
}

function handleTranscription(sessionId: string, ws: WebSocket, transcriptionData: any) {
  let transcriptProcessor = userTranscriptProcessors.get(sessionId);
  if (!transcriptProcessor) {
    transcriptProcessor = new TranscriptProcessor(30, 3);
    userTranscriptProcessors.set(sessionId, transcriptProcessor);
  }

  const isFinal = transcriptionData.isFinal;
  const text = transcriptProcessor.processString(transcriptionData.text, isFinal);

  console.log(`[Session ${sessionId}]: ${text}`);
  console.log(`[Session ${sessionId}]: ${isFinal}`);

  // Create a display event for the transcription
  const displayEvent: DisplayRequest = {
    type: 'display_event',
    view: "main",
    packageName: PACKAGE_NAME,
    sessionId,
    layout: {
      layoutType: 'text_wall',
      text: text
    },
    timestamp: new Date(),
    durationMs: isFinal ? 3000 : undefined
  };

  // Send the display event back to the cloud
  ws.send(JSON.stringify(displayEvent));
}

// Add a route to verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.listen(PORT, () => {
  console.log(`Captions TPA server running at http://localhost:${PORT}`);
});
