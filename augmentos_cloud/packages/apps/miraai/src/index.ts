// augmentos_cloud/packages/apps/agent-gatekeeper/src/index.ts
import express from 'express';
import WebSocket from 'ws';
import path from 'path';
import {
  TpaConnectionInitMessage,
  TpaSubscriptionUpdateMessage,
  CloudDataStreamMessage,
  DisplayRequest,
} from '@augmentos/types';

import { CLOUD_PORT, systemApps } from '@augmentos/config';
import { MiraAgent } from '@augmentos/agents';
import { wrapText } from '@augmentos/utils';

// If needed, use node-fetch (if Node version < 18)
// import fetch from 'node-fetch';

const app = express();
const PORT = systemApps.mira.port;
const PACKAGE_NAME = systemApps.mira.packageName;
const API_KEY = 'test_key'; // In production, secure this key

const explicitWakeWords = [
  "hey mira",
  "he mira",
  "hey mara",
  "he mara",
  "hey mirror",
  "he mirror",
  "hey miara",
  "he miara",
  "hey mia",
  "he mia",
  "hey mural",
  "he mural",
  "hey amira",    
  "hey myra",
  "he myra",
  "hay mira",
  "hai mira",
  "hey-mira",
  "he-mira",
  "heymira",
  "heymara",
  "hey mirah",
  "he mirah",
  "hey meera",
  "he meera",
];

// Parse JSON bodies
app.use(express.json());

const miraAgent = new MiraAgent();

// Track active sessions and listening state
const activeSessions = new Map<string, WebSocket>();
// Map for storing the start time (timestamp in ms) of the listening session per sessionId
const activeListeningSessions = new Map<string, number>();
// Map for storing the current inactivity timer per sessionId
const sessionTimers = new Map<string, NodeJS.Timeout>();

// Handle webhook call from AugmentOS Cloud
app.post('/webhook', async (req, res) => {
  try {
    // Expecting sessionId, userId, and (optionally) conversation_context in the POST body
    const { sessionId, userId, conversation_context } = req.body;
    console.log(`\n\n🗣️ Received session request for user ${userId}, session ${sessionId}\n\n`);

    // Start WebSocket connection to cloud (adjust the URL if needed)
    const ws = new WebSocket(`ws://localhost:${CLOUD_PORT}/tpa-ws`);
    
    ws.on('open', () => {
      console.log(`\n[Session ${sessionId}]\n connected to augmentos-cloud`);
      // Send connection init message
      const initMessage: TpaConnectionInitMessage = {
        type: 'tpa_connection_init',
        sessionId,
        packageName: PACKAGE_NAME,
        apiKey: API_KEY
      };

      console.log(`Sending init message: ${JSON.stringify(initMessage)}`);
      ws.send(JSON.stringify(initMessage));
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(sessionId, ws, message, conversation_context);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`Session ${sessionId} disconnected`);
      activeSessions.delete(sessionId);
      // Also clear any existing timers for this session
      if (sessionTimers.has(sessionId)) {
        clearTimeout(sessionTimers.get(sessionId));
        sessionTimers.delete(sessionId);
      }
      activeListeningSessions.delete(sessionId);
    });

    activeSessions.set(sessionId, ws);
    res.status(200).json({ status: 'connecting' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files if necessary
app.use(express.static(path.join(__dirname, './public')));

async function debug() {
  // Debugging function if needed.
}

// Handle incoming WebSocket messages
async function handleMessage(sessionId: string, ws: WebSocket, message: any, conversation_context?: string) {
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
          await handleTranscription(sessionId, ws, streamMessage.data);
        }
        break;
    }

    // Handle additional message types if necessary.
    default:
      console.log('Unknown message type:', message.type);
  }
}

// This function handles transcription messages
async function handleTranscription(sessionId: string, ws: WebSocket, transcriptionData: any) {
  const text = transcriptionData.text;
  // Check for wake words in transcription
  const lowercaseText = text.toLowerCase().replace(/[^\w\s]/g, '');
  const hasWakeWord = explicitWakeWords.some(word => lowercaseText.includes(word));
  
  if (!hasWakeWord) {
    console.log('No wake word detected');
    return;
  }

  console.log(`[Session ${sessionId}]: Wake word detected in text "${text}"`);

  // Start the listening session if not already started
  if (!activeListeningSessions.has(sessionId)) {
    activeListeningSessions.set(sessionId, Date.now());
    console.log(`Starting new listening session for ${sessionId}`);
  }

  // Send immediate display feedback (e.g., "Listening...")
  const listeningDisplayRequest: DisplayRequest = {
    type: 'display_event',
    view: 'main',
    packageName: PACKAGE_NAME,
    sessionId,
    layout: {
      layoutType: 'text_wall',
      text: "Listening..."
    },
    durationMs: 10000,
    timestamp: new Date()
  };
  ws.send(JSON.stringify(listeningDisplayRequest));

  // Reset the inactivity timer: if no new transcript arrives in 5 seconds, process accumulated transcripts
  if (sessionTimers.has(sessionId)) {
    clearTimeout(sessionTimers.get(sessionId));
  }
  const timer = setTimeout(async () => {
    // Calculate duration (in seconds) since the listening session started
    const startTime = activeListeningSessions.get(sessionId);
    const durationSeconds = Math.ceil((Date.now() - (startTime ?? Date.now())) / 1000);
    console.log(`No transcript received for 5 seconds. Fetching transcripts from the last ${durationSeconds} seconds for session ${sessionId}`);

    try {
      // Adjust the backend URL and port as needed. Here, we assume the backend is on localhost:PORT_BACKEND.
      const backendUrl = `http://localhost:${CLOUD_PORT}/api/transcripts/${sessionId}?duration=${durationSeconds}`;
      const response = await fetch(backendUrl);
      const data = await response.json();
      console.log(`Retrieved transcripts: ${JSON.stringify(data)}`);

      // Combine the text from the transcript segments
      const combinedText = data.segments.map((segment: any) => segment.text).join(' ');

      const displayProcessingQueryRequest: DisplayRequest = {
        type: 'display_event',
        view: 'main',
        packageName: PACKAGE_NAME,
        sessionId,
        layout: {
          layoutType: 'text_wall',
          text: wrapText("Processing query: " + combinedText, 30)
        },
        durationMs: 7000,
        timestamp: new Date()
      };
      ws.send(JSON.stringify(displayProcessingQueryRequest));

      const inputData = { query: combinedText };

      // Send the combined transcript to the agent
      const agentResponse = await miraAgent.handleContext(inputData);
      if (!agentResponse) {
        console.log("No insight found");
        return;
      } else {
        console.log("Insight found:", agentResponse);
      }

      // Create a display event for the agent's response
      const displayRequest: DisplayRequest = {
        type: 'display_event',
        view: 'main',
        packageName: PACKAGE_NAME,
        sessionId,
        layout: {
          layoutType: 'text_wall',
          text: wrapText(agentResponse, 30)
        },
        durationMs: 6000,
        timestamp: new Date()
      };

      ws.send(JSON.stringify(displayRequest));
    } catch (error) {
      console.error("Error retrieving transcripts:", error);
    } finally {
      // Clear the listening session state for this sessionId
      activeListeningSessions.delete(sessionId);
      sessionTimers.delete(sessionId);
    }
  }, 3000);
  sessionTimers.set(sessionId, timer);
}

// A simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.listen(PORT, () => {
  console.log(`MiraAI TPA server running at http://localhost:${PORT}`);
  console.log(`Logo available at http://localhost:${PORT}/logo.png`);
});
