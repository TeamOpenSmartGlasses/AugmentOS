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

interface SessionData {
  startTime: number;
  firstTranscriptReceived: boolean;
}
const activeListeningSessions = new Map<string, SessionData>();
const sessionTimers = new Map<string, NodeJS.Timeout>();

app.post('/webhook', async (req, res) => {
  try {
    const { sessionId, userId, conversation_context } = req.body;
    console.log(`\n\n🗣️ Received session request for user ${userId}, session ${sessionId}\n\n`);

    const ws = new WebSocket(`ws://localhost:${CLOUD_PORT}/tpa-ws`);
    
    ws.on('open', () => {
      console.log(`\n[Session ${sessionId}]\n connected to augmentos-cloud`);
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

app.use(express.static(path.join(__dirname, './public')));

async function debug() {
  // Debugging function if needed.
}

async function handleMessage(sessionId: string, ws: WebSocket, message: any, conversation_context?: string) {
  switch (message.type) {
    case 'tpa_connection_ack': {
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
    default:
      console.log('Unknown message type:', message.type);
  }
}

async function handleTranscription(sessionId: string, ws: WebSocket, transcriptionData: any) {
  const text = transcriptionData.text;
  // Clean the text: lowercase and remove punctuation for easier matching.
  const cleanedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const hasWakeWord = explicitWakeWords.some(word => cleanedText.includes(word));
  
  if (!hasWakeWord) {
    console.log('No wake word detected');
    return;
  }

  console.log(`[Session ${sessionId}]: Wake word detected in text "${text}"`);

  let timerDuration: number;

  if (transcriptionData.isFinal) {
    // Check if the final transcript ends with a wake word.
    if (endsWithWakeWord(cleanedText)) {
      // If the final transcript ends with just a wake word (or with trailing punctuation),
      // wait 5 seconds to allow for additional query text.
      timerDuration = 3000;
      console.log(`[Session ${sessionId}]: Final transcript ends with a wake word; waiting 5 seconds.`);
    } else {
      // Final transcript with additional content should be processed immediately.
      timerDuration = 1500;
    }
  } else {
    // For non-final transcripts, use the established heuristic.
    if (!activeListeningSessions.has(sessionId)) {
      activeListeningSessions.set(sessionId, { startTime: Date.now(), firstTranscriptReceived: false });
      timerDuration = 3000;
    } else {
      timerDuration = 1500;
    }
  }

  // Send immediate display feedback (e.g., "Listening...")
  const listeningDisplayRequest: DisplayRequest = {
    type: 'display_event',
    view: 'main',
    packageName: PACKAGE_NAME,
    sessionId,
    layout: { layoutType: 'text_wall', text: "Listening..." },
    durationMs: 10000,
    timestamp: new Date()
  };
  ws.send(JSON.stringify(listeningDisplayRequest));

  if (timerDuration === 0) {
    if (sessionTimers.has(sessionId)) {
      clearTimeout(sessionTimers.get(sessionId));
      sessionTimers.delete(sessionId);
    }
    console.log(`[Session ${sessionId}]: Final transcript with query content received; processing immediately.`);
    await processTranscripts(sessionId, ws);
    return;
  }

  if (sessionTimers.has(sessionId)) {
    clearTimeout(sessionTimers.get(sessionId));
  }
  const timer = setTimeout(async () => {
    await processTranscripts(sessionId, ws);
  }, timerDuration);
  sessionTimers.set(sessionId, timer);
}

async function processTranscripts(sessionId: string, ws: WebSocket) {
  const sessionData = activeListeningSessions.get(sessionId);
  const startTime = sessionData ? sessionData.startTime : Date.now();
  const durationSeconds = Math.ceil((Date.now() - startTime) / 1000);
  console.log(`Processing transcripts for session ${sessionId} after ${durationSeconds} seconds`);

  try {
    const backendUrl = `http://localhost:${CLOUD_PORT}/api/transcripts/${sessionId}?duration=${durationSeconds}`;
    const response = await fetch(backendUrl);
    const data = await response.json();
    console.log(`Retrieved transcripts: ${JSON.stringify(data)}`);

    const rawCombinedText = data.segments.map((segment: any) => segment.text).join(' ');
    const combinedText = removeWakeWord(rawCombinedText);

    const displayProcessingQueryRequest: DisplayRequest = {
      type: 'display_event',
      view: 'main',
      packageName: PACKAGE_NAME,
      sessionId,
      layout: { layoutType: 'text_wall', text: wrapText("Processing query: " + combinedText, 30) },
      durationMs: 7000,
      timestamp: new Date()
    };
    ws.send(JSON.stringify(displayProcessingQueryRequest));

    const inputData = { query: combinedText };
    const agentResponse = await miraAgent.handleContext(inputData);
    if (!agentResponse) {
      console.log("No insight found");
      return;
    } else {
      console.log("Insight found:", agentResponse);
    }

    const displayRequest: DisplayRequest = {
      type: 'display_event',
      view: 'main',
      packageName: PACKAGE_NAME,
      sessionId,
      layout: { layoutType: 'text_wall', text: wrapText(agentResponse, 30) },
      durationMs: 6000,
      timestamp: new Date()
    };
    ws.send(JSON.stringify(displayRequest));
  } catch (error) {
    console.error("Error retrieving transcripts:", error);
  } finally {
    activeListeningSessions.delete(sessionId);
    if (sessionTimers.has(sessionId)) {
      clearTimeout(sessionTimers.get(sessionId));
      sessionTimers.delete(sessionId);
    }
  }
}

function removeWakeWord(text: string): string {
  // Escape each wake word for regex special characters
  const escapedWakeWords = explicitWakeWords.map(word =>
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  // Build patterns that allow for spaces, commas, or periods between the words
  const wakePatterns = escapedWakeWords.map(word =>
    word.split(' ').join('[\\s,\\.]*')
  );
  // Create a regex that removes everything from the start until (and including) a wake word
  const wakeRegex = new RegExp(`.*?(?:${wakePatterns.join('|')})[\\s,\\.]*`, 'i');
  return text.replace(wakeRegex, '').trim();
}

// Helper to check if a text ends with one of the wake words.
function endsWithWakeWord(text: string): boolean {
  return explicitWakeWords.some(word => text.trim().endsWith(word));
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.listen(PORT, () => {
  console.log(`MiraAI TPA server running at http://localhost:${PORT}`);
  console.log(`Logo available at http://localhost:${PORT}/logo.png`);
});
