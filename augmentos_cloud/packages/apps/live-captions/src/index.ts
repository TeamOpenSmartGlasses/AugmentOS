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
import { TranscriptProcessor } from '@augmentos/utils';
import { systemApps, CLOUD_PORT } from '@augmentos/config';
import axios from 'axios';

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


function convertLineWidth(width: string | number): number {
  if (typeof width === 'number') return width;
  switch (width.toLowerCase()) {
    case 'very narrow': return 25;
    case 'narrow': return 35;
    case 'medium': return 45;
    case 'wide': return 60;
    case 'very wide': return 80;
    default: return 45;
  }
}

async function fetchAndApplySettings(sessionId: string, userId: string) {
  try {
    const response = await axios.get(`http://localhost:${CLOUD_PORT}/tpasettings/user/${PACKAGE_NAME}`, {
      headers: { Authorization: `Bearer ${userId}` }
    });
    const settings = response.data.settings;
    console.log(`Fetched settings for session ${sessionId}:`, settings);
    const lineWidthSetting = settings.find((s: any) => s.key === 'line_width');
    const numberOfLinesSetting = settings.find((s: any) => s.key === 'number_of_lines');

    console.log(`==========`, lineWidthSetting);
    const lineWidth = lineWidthSetting ? convertLineWidth(lineWidthSetting.value) : 30; // fallback default
    const numberOfLines = numberOfLinesSetting ? Number(numberOfLinesSetting.value) : 3; // fallback default

    console.log(`==========`, lineWidth);
    console.log(`==========`, numberOfLines);
    const transcriptProcessor = new TranscriptProcessor(lineWidth, numberOfLines);
    userTranscriptProcessors.set(userId, transcriptProcessor);
  } catch (err) {
    console.error(`Error fetching settings for session ${sessionId}:`, err);
    // Fallback to default values.
    const transcriptProcessor = new TranscriptProcessor(30, 3);
    userTranscriptProcessors.set(userId, transcriptProcessor);
  }
}

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

      // Fetch and apply settings for the session
      fetchAndApplySettings(sessionId, userId).catch(err =>
        console.error(`Error in fetchAndApplySettings for session ${sessionId}:`, err)
      );
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(sessionId, userId, ws, message);
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

function handleMessage(sessionId: string, userId: string, ws: WebSocket, message: any) {
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
        handleTranscription(sessionId, userId, ws, streamMessage.data);
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
function handleTranscription(sessionId: string, userId: string, ws: WebSocket, transcriptionData: any) {
  let userFinalTranscript = userFinalTranscripts.get(sessionId);
  if (userFinalTranscript === undefined) {
    userFinalTranscript = "";
    userFinalTranscripts.set(sessionId, userFinalTranscript);
  }

  let transcriptProcessor = userTranscriptProcessors.get(userId);
  if (!transcriptProcessor) {
    transcriptProcessor = new TranscriptProcessor(30, 3);
    userTranscriptProcessors.set(userId, transcriptProcessor);
  }

  const isFinal = transcriptionData.isFinal;
  const newTranscript = transcriptionData.text;

  const text = transcriptProcessor.processString(userFinalTranscript + " " + newTranscript, isFinal);

  console.log(`[Session ${sessionId}]: ${text}`);
  console.log(`[Session ${sessionId}]: isFinal=${isFinal}`);

  if (isFinal) {
    const finalLiveCaption = newTranscript.length > 100 ? newTranscript.substring(newTranscript.length - 100) : newTranscript;

    userFinalTranscripts.set(userId, finalLiveCaption);
  }

  console.log(`[Session ${sessionId}]: finalLiveCaption=${isFinal}`);

  debounceAndShowTranscript(sessionId, userId, ws, text, isFinal);
}

/**
 * Debounces the sending of transcript display events so that non-final transcripts
 * are not sent too frequently. Final transcripts are sent immediately.
 */
function debounceAndShowTranscript(sessionId: string, userId: string, ws: WebSocket, transcript: string, isFinal: boolean) {
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
  const displayEvent: DisplayRequest = {
    type: 'display_event',
    view: "main",
    packageName: PACKAGE_NAME,
    sessionId,
    layout: {
      layoutType: 'text_wall',
      text: transcript
    },
    timestamp: new Date(),
    // Use a fixed duration for final transcripts; non-final ones omit the duration
    // durationMs: isFinal ? 3000 : undefined
    durationMs: 20 * 1000 // 20 seconds. If no other transcript is received it will be cleared after this time.
  };

  ws.send(JSON.stringify(displayEvent));
}

app.post('/settings', (req, res) => {
  console.log('Received settings update for captions:', req.body);
  const { userIdForSettings, settings } = req.body;
  if (!userIdForSettings || !Array.isArray(settings)) {
    return res.status(400).json({ error: 'Missing userId or settings array in payload' });
  }
  const lineWidthSetting = settings.find((s: any) => s.key === 'line_width');
  const numberOfLinesSetting = settings.find((s: any) => s.key === 'number_of_lines');

  if (lineWidthSetting && numberOfLinesSetting) {
    const newLineWidth = lineWidthSetting.value;
    const newNumberOfLines = numberOfLinesSetting.value;
    // Update TranscriptProcessor only for active sessions belonging to this user.
    userTranscriptProcessors.forEach((processor, userId) => {
      if (userId === userIdForSettings) {
        console.log(`Updating TranscriptProcessor for user ${userId} with lineWidth: ${newLineWidth} and numberOfLines: ${newNumberOfLines}`);
        const newProcessor = new TranscriptProcessor(newLineWidth, newNumberOfLines);
        userTranscriptProcessors.set(userId, newProcessor);
      }
    });
  }
  res.json({ status: 'settings updated for user in captions app' });
});

// Add a route to verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.listen(PORT, () => {
  console.log(`${PACKAGE_NAME} server running at http://localhost:${PORT}`);
});
