// augmentos_cloud/packages/apps/captions/src/index.ts
import express from 'express';
import WebSocket from 'ws';
import path from 'path';
import {
  TpaConnectionInit,
  DataStream,
  DisplayRequest,
  TpaSubscriptionUpdate,
  TpaToCloudMessageType,
  StreamType,
  CloudToGlassesMessageType,
  CloudToTpaMessageType,
  ViewType,
  LayoutType,
} from '@augmentos/types'; // Import the types from the shared package
import { TranscriptProcessor } from '@augmentos/utils';
import { systemApps, CLOUD_PORT } from '@augmentos/config';

const app = express();
const PORT = systemApps.captions.port;
const PACKAGE_NAME = systemApps.captions.packageName;
const API_KEY = 'test_key'; // In production, this would be securely stored

const userFinalTranscripts: Map<string, string> = new Map();
const userTranscriptProcessors: Map<string, TranscriptProcessor> = new Map();

// For debouncing transcripts per session
interface TranscriptDebouncer {
  lastSentTime: number;
  timer: NodeJS.Timeout | null;
}
const transcriptDebouncers: Map<string, TranscriptDebouncer> = new Map();

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
      const initMessage: TpaConnectionInit = {
        // type: 'tpa_connection_init',
        type: TpaToCloudMessageType.CONNECTION_INIT,
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
      userFinalTranscripts.delete(sessionId);
      transcriptDebouncers.delete(sessionId);
    });

    activeSessions.set(sessionId, ws);
    userFinalTranscripts.set(sessionId, "");
    // Initialize debouncer for the session
    transcriptDebouncers.set(sessionId, { lastSentTime: 0, timer: null });

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
    // case 'tpa_connection_ack': {
    case CloudToTpaMessageType.CONNECTION_ACK: {
      // Connection acknowledged, subscribe to transcription
      const subMessage: TpaSubscriptionUpdate = {
        // type: 'subscription_update',
        type: TpaToCloudMessageType.SUBSCRIPTION_UPDATE,
        packageName: PACKAGE_NAME,
        sessionId,
        // subscriptions: ['transcription']
        subscriptions: [StreamType.TRANSCRIPTION]
      };
      ws.send(JSON.stringify(subMessage));
      console.log(`Session ${sessionId} connected and subscribed`);
      break;
    }

    // case 'data_stream': {
    case CloudToTpaMessageType.DATA_STREAM: {
      const streamMessage = message as DataStream;
      // if (streamMessage.streamType === 'transcription') {
      if (streamMessage.streamType === StreamType.TRANSCRIPTION) {
        handleTranscription(sessionId, ws, streamMessage.data);
      }
      break;
    }

    default:
      console.log('Unknown message type:', message.type);
  }
}

/**
 * Processes the transcription, applies debouncing, and then sends a display event.
 */
function handleTranscription(sessionId: string, ws: WebSocket, transcriptionData: any) {
  let userFinalTranscript = userFinalTranscripts.get(sessionId);
  if (userFinalTranscript === undefined) {
    userFinalTranscript = "";
    userFinalTranscripts.set(sessionId, userFinalTranscript);
  }

  let transcriptProcessor = userTranscriptProcessors.get(sessionId);
  if (!transcriptProcessor) {
    transcriptProcessor = new TranscriptProcessor(30, 3);
    userTranscriptProcessors.set(sessionId, transcriptProcessor);
  }

  const isFinal = transcriptionData.isFinal;
  const newTranscript = transcriptionData.text;

  const text = transcriptProcessor.processString(userFinalTranscript + " " + newTranscript, isFinal);

  console.log(`[Session ${sessionId}]: ${text}`);
  console.log(`[Session ${sessionId}]: isFinal=${isFinal}`);

  if (isFinal) {
    const finalLiveCaption = newTranscript.length > 100 ? newTranscript.substring(newTranscript.length - 100) : newTranscript;

    userFinalTranscripts.set(sessionId, finalLiveCaption);
  }

  console.log(`[Session ${sessionId}]: finalLiveCaption=${isFinal}`);

  debounceAndShowTranscript(sessionId, ws, text, isFinal);
}

/**
 * Debounces the sending of transcript display events so that non-final transcripts
 * are not sent too frequently. Final transcripts are sent immediately.
 */
function debounceAndShowTranscript(sessionId: string, ws: WebSocket, transcript: string, isFinal: boolean) {
  const debounceDelay = 400; // in milliseconds
  const debouncer = transcriptDebouncers.get(sessionId);
  if (!debouncer) {
    // Initialize if it doesn't exist
    transcriptDebouncers.set(sessionId, { lastSentTime: 0, timer: null });
  }
  const currentDebouncer = transcriptDebouncers.get(sessionId)!;

  // Clear any previously scheduled timer
  if (currentDebouncer.timer) {
    clearTimeout(currentDebouncer.timer);
    currentDebouncer.timer = null;
  }

  const now = Date.now();

  if (isFinal) {
    showTranscriptsToUser(sessionId, ws, transcript, true);
    currentDebouncer.lastSentTime = now;
    return;
  }

  if (now - currentDebouncer.lastSentTime >= debounceDelay) {
    showTranscriptsToUser(sessionId, ws, transcript, false);
    currentDebouncer.lastSentTime = now;
  } else {
    currentDebouncer.timer = setTimeout(() => {
      showTranscriptsToUser(sessionId, ws, transcript, false);
      currentDebouncer.lastSentTime = Date.now();
    }, debounceDelay);
  }
}

/**
 * Sends a display event (transcript) to the cloud.
 */
function showTranscriptsToUser(sessionId: string, ws: WebSocket, transcript: string, isFinal: boolean) {
  const displayRequest: DisplayRequest = {
    // type: 'display_event',
    // view: "main",
    type: TpaToCloudMessageType.DISPLAY_REQUEST,
    view: ViewType.MAIN,
    packageName: PACKAGE_NAME,
    sessionId,
    layout: {
      // layoutType: 'text_wall',
      layoutType: LayoutType.TEXT_WALL,
      text: transcript
    },
    timestamp: new Date(),
    // Use a fixed duration for final transcripts; non-final ones omit the duration
    // durationMs: isFinal ? 3000 : undefined
    durationMs: 20 * 1000 // 20 seconds. If no other transcript is received it will be cleared after this time.
  };

  ws.send(JSON.stringify(displayRequest));
}

// Add a route to verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.listen(PORT, () => {
  console.log(`${PACKAGE_NAME} server running at http://localhost:${PORT}`);
});
