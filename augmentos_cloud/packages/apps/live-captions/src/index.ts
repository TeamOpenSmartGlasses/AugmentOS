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
import axios from 'axios';

const app = express();
const PORT = systemApps.captions.port;
const PACKAGE_NAME = systemApps.captions.packageName;
const API_KEY = 'test_key'; // In production, this would be securely stored

const userFinalTranscripts: Map<string, string> = new Map();
const userTranscriptProcessors: Map<string, TranscriptProcessor> = new Map();
const userSessions = new Map<string, Set<string>>(); // userId -> Set<sessionId>

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
    case 'very narrow': return 21;
    case 'narrow': return 30;
    case 'medium': return 38;
    case 'wide': return 46;
    case 'very wide': return 52;
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

    // console.log(`==========`, lineWidthSetting);
    const lineWidth = lineWidthSetting ? convertLineWidth(lineWidthSetting.value) : 30; // fallback default
    const numberOfLines = numberOfLinesSetting ? Number(numberOfLinesSetting.value) : 3; // fallback default

    // console.log(`==========`, lineWidth);
    // console.log(`==========`, numberOfLines);
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
      const initMessage: TpaConnectionInit = {
        // type: 'tpa_connection_init',
        type: TpaToCloudMessageType.CONNECTION_INIT,
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
      
      // Remove session from user's sessions map
      if (userSessions.has(userId)) {
        const sessions = userSessions.get(userId)!;
        sessions.delete(sessionId);
        if (sessions.size === 0) {
          userSessions.delete(userId);
        }
      }
      
      transcriptDebouncers.delete(sessionId);
    });

    // Track this session for the user
    if (!userSessions.has(userId)) {
      userSessions.set(userId, new Set());
    }
    userSessions.get(userId)!.add(sessionId);

    activeSessions.set(sessionId, ws);
    userFinalTranscripts.set(userId, "");
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
    case CloudToTpaMessageType.CONNECTION_ACK: {
      // Connection acknowledged, subscribe to transcription
      const subMessage: TpaSubscriptionUpdate = {
        type: TpaToCloudMessageType.SUBSCRIPTION_UPDATE,
        packageName: PACKAGE_NAME,
        sessionId,
        subscriptions: [StreamType.TRANSCRIPTION]
      };
      ws.send(JSON.stringify(subMessage));
      console.log(`Session ${sessionId} connected and subscribed`);
      break;
    }

    case CloudToTpaMessageType.DATA_STREAM: {
      const streamMessage = message as DataStream;
      if (streamMessage.streamType === StreamType.TRANSCRIPTION) {
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
  let userFinalTranscript = userFinalTranscripts.get(userId);
  if (userFinalTranscript === undefined) {
    userFinalTranscript = "";
    userFinalTranscripts.set(userId, userFinalTranscript);
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
  const displayRequest: DisplayRequest = {
    type: TpaToCloudMessageType.DISPLAY_REQUEST,
    view: ViewType.MAIN,
    packageName: PACKAGE_NAME,
    sessionId,
    layout: {
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

/**
 * Refreshes all sessions for a user after settings changes.
 * Returns true if at least one session was refreshed.
 */
function refreshUserSessions(userId: string, newUserTranscript: string) {
  const sessionIds = userSessions.get(userId);
  if (!sessionIds || sessionIds.size === 0) {
    console.log(`No active sessions found for user ${userId}`);
    return false;
  }
  
  console.log(`Refreshing ${sessionIds.size} sessions for user ${userId}`);
  console.log(`New user transcript: ${newUserTranscript}`);
  
  // Refresh each session
  for (const sessionId of sessionIds) {
    const ws = activeSessions.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log(`Refreshing session ${sessionId}`);
      
      // Clear display to reset visual state
      const clearDisplayRequest: DisplayRequest = {
        type: TpaToCloudMessageType.DISPLAY_REQUEST,
        view: ViewType.MAIN,
        packageName: PACKAGE_NAME,
        sessionId,
        layout: {
          layoutType: LayoutType.TEXT_WALL,
          text: newUserTranscript // Empty text to clear the display
        },
        timestamp: new Date(),
        durationMs: 20 * 1000 // 20 seconds. If no other transcript is received it will be cleared after this time.
      };
      
      try {
        ws.send(JSON.stringify(clearDisplayRequest));
      } catch (error) {
        console.error(`Error clearing display for session ${sessionId}:`, error);
      }
    } else {
      console.log(`Session ${sessionId} is not open, removing from tracking`);
      activeSessions.delete(sessionId);
      sessionIds.delete(sessionId);
    }
  }
  
  return sessionIds.size > 0;
}

app.post('/settings', (req, res) => {
  try {
    console.log('Received settings update for captions:', req.body);
    const { userIdForSettings, settings } = req.body;
    
    if (!userIdForSettings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Missing userId or settings array in payload' });
    }
    
    const lineWidthSetting = settings.find((s: any) => s.key === 'line_width');
    const numberOfLinesSetting = settings.find((s: any) => s.key === 'number_of_lines');

    // Validate settings
    let lineWidth = 30; // default
    if (lineWidthSetting) {
      lineWidth = typeof lineWidthSetting.value === 'string' ? 
        convertLineWidth(lineWidthSetting.value) : 
        (typeof lineWidthSetting.value === 'number' ? lineWidthSetting.value : 30);
    }
    
    let numberOfLines = 3; // default
    if (numberOfLinesSetting) {
      numberOfLines = Number(numberOfLinesSetting.value);
      if (isNaN(numberOfLines) || numberOfLines < 1) numberOfLines = 3;
    }
    
    // Update processor and clear transcript
    console.log(`Updating settings for user ${userIdForSettings}: lineWidth=${lineWidth}, numberOfLines=${numberOfLines}`);
    const lastUserTranscript = userTranscriptProcessors.get(userIdForSettings)?.getLastUserTranscript() || "";
    const newProcessor = new TranscriptProcessor(lineWidth, numberOfLines);
    userTranscriptProcessors.set(userIdForSettings, newProcessor);
    userFinalTranscripts.set(userIdForSettings, lastUserTranscript);

    const newUserTranscript = userTranscriptProcessors.get(userIdForSettings)?.processString(lastUserTranscript, true) || "";

    // Refresh active sessions
    const sessionsRefreshed = refreshUserSessions(userIdForSettings, newUserTranscript);
    
    res.json({ 
      status: 'Settings updated successfully',
      sessionsRefreshed: sessionsRefreshed
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error updating settings' });
  }
});

// Add a route to verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.listen(PORT, () => {
  console.log(`${PACKAGE_NAME} server running at http://localhost:${PORT}`);
});