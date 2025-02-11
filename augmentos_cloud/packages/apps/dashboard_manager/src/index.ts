import express from 'express';
import WebSocket from 'ws';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // if you need unique IDs
import {
  TpaConnectionInitMessage,
  TpaDisplayEventMessage,
  TpaSubscriptionUpdateMessage,
  CloudDataStreamMessage,
  DashboardDisplayEventMessage,
  DashboardCard,
} from '@augmentos/types';

import { NewsAgent } from './dashboard_modules/NewsAgent';  // lowercase 'n'
// e.g. { languageLearning: LanguageLearningAgent, news: NewsAgent, ... }

const app = express();
const PORT = 7012; // your Dashboard Manager port

const PACKAGE_NAME = 'org.mentra.dashboard';
const API_KEY = 'test_key'; // In production, store securely

// For demonstration, we'll keep session-based info in-memory.
// In real usage, you might store persistent data in a DB.
interface SessionInfo {
  userId: string;
  ws: WebSocket;
  // track last agent calls
  lastNewsUpdate?: number; 
  [key: string]: any;
}

const activeSessions = new Map<string, SessionInfo>();
const activeDashboards = new Map<string, DashboardCard>();

function createDashboardLayout(card: DashboardCard) {
  return {
    layoutType: card.layoutType,
    timeDateAndBattery: card.timeDateAndBattery,
    topRight: card.topRight,
    bottomRight: card.bottomRight,
    bottomLeft: card.bottomLeft,
  };
}

// Parse JSON bodies
app.use(express.json());

// -----------------------------------
// 1) Webhook Endpoint
// -----------------------------------
app.post('/webhook', async (req: express.Request, res: express.Response) => {
  try {
    const { sessionId, userId } = req.body;
    console.log(`\n[Webhook] Session start for user ${userId}, session ${sessionId}\n`);

    // 1) Create a new WebSocket connection to the cloud
    const ws = new WebSocket('ws://localhost:7002/tpa-ws');

    // Create a new dashboard card
    const dashboardCard: DashboardCard = {
      layoutType: 'dashboard_card',
      timeDateAndBattery: '02/12/2025 12:00:00 100%',
      bottomRight: '100%',
      topRight: 'Meeting with John',
      bottomLeft: '',
    };

    activeDashboards.set(sessionId, dashboardCard);

    // 2) On open, send tpa_connection_init
    ws.on('open', () => {
      console.log(`[Session ${sessionId}] Connected to augmentos-cloud`);

      const initMessage: TpaConnectionInitMessage = {
        type: 'tpa_connection_init',
        sessionId,
        packageName: PACKAGE_NAME,
        apiKey: API_KEY,
      };
      ws.send(JSON.stringify(initMessage));

      const dashboardLayout = createDashboardLayout(dashboardCard);

      const displayEvent: DashboardDisplayEventMessage = {
        type: 'dashboard_display_event',
        packageName: PACKAGE_NAME,
        sessionId,
        layout: dashboardLayout,
        durationMs: 4000,
      };

      console.log('Sending display event:', displayEvent);

      ws.send(JSON.stringify(displayEvent));

    });

    // 3) On message, handle incoming data
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(sessionId, message);
      } catch (err) {
        console.error(`[Session ${sessionId}] Error parsing message:`, err);
      }
    });

    // 4) On close, clean up session
    ws.on('close', () => {
      console.log(`[Session ${sessionId}] Disconnected`);
      activeSessions.delete(sessionId);
      activeDashboards.delete(sessionId);
    });

    // Store session info
    activeSessions.set(sessionId, {
      userId,
      ws,
      lastNewsUpdate: Date.now(), // start time for e.g. news
    });

    // Respond to the cloud
    res.status(200).json({ status: 'connecting' });
  } catch (err) {
    console.error('Error handling /webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------------
// 2) Handle Incoming Messages
// -----------------------------------
function handleMessage(sessionId: string, message: any) {
  const sessionInfo = activeSessions.get(sessionId);
  if (!sessionInfo) {
    console.warn(`Session ${sessionId} not found in activeSessions`);
    return;
  }

  switch (message.type) {

    case 'data_stream': {
      const streamMessage = message as CloudDataStreamMessage;
      switch (streamMessage.streamType) {
        case 'transcription':
          handleTranscription(sessionId, streamMessage.data);
          break;

        // add more streams here if needed
        default:
          console.log(`[Session ${sessionId}] Unknown data stream: ${streamMessage.streamType}`);
      }
      break;
    }

    default:
      console.log(`[Session ${sessionId}] Unhandled message type: ${message.type}`);
  }
}

// -----------------------------------
// 3) Handle Transcription
// -----------------------------------
async function handleTranscription(sessionId: string, transcriptionData: any) {
  // Create an instance of NewsAgent
  const newsAgent = new NewsAgent();
  try {
    const sessionInfo = activeSessions.get(sessionId);
    if (!sessionInfo) return;
    
    const result = await newsAgent.handleContext({});

    // If you have something to display, send a display_event
    if (result && result.translatedWords) {
      const displayEvent: DashboardDisplayEventMessage = {
        type: 'dashboard_display_event',
        packageName: PACKAGE_NAME,
        sessionId,
        layout: {
          layoutType: 'text_rows',
          text: [
            'Language Learning Agent Output:',
            JSON.stringify(result.translatedWords),
          ],
        },
        durationMs: 4000,
      };
      sessionInfo.ws.send(JSON.stringify(displayEvent));
    }
  } catch (err) {
    console.error(`[Session ${sessionId}] handleTranscription error:`, err);
  }
}

// -----------------------------------
// 4) Handle Settings
// -----------------------------------
function handleSettings(sessionId: string, settingsData: any) {
  console.log(`[Session ${sessionId}] Received context_settings:`, settingsData);
  // Optionally store them in session data, pass them to agents, etc.
  const sessionInfo = activeSessions.get(sessionId);
  if (sessionInfo) {
    // maybe store these settings
    sessionInfo['currentSettings'] = settingsData;
  }
}

// -----------------------------------
// 5) Periodic Checks (Internal Clock)
// -----------------------------------
// For example, check every minute whether it's time to call the News Agent
setInterval(async () => {
  const now = Date.now();
  console.log(`[Dashboard Manager] Checking for news updates at ${now}`);
  for (const [sessionId, session] of activeSessions.entries()) {
    const { lastNewsUpdate, ws } = session;
    if (!ws || ws.readyState !== WebSocket.OPEN) continue;

    // Check if 1 hour (3600000 ms) has passed
    if (now - (lastNewsUpdate ?? 0) >= 60 * 60 * 1000) {
      // time for a news update
      try {
        const newsAgent = new NewsAgent(); // Create instance
        const result = await newsAgent.handleContext({});
        
        if (result && result.text) {
          const displayEvent: TpaDisplayEventMessage = {
            type: 'display_event',
            packageName: PACKAGE_NAME,
            sessionId,
            layout: {
              layoutType: 'text_rows',
              text: [
                'News Update:',
                result.text,
              ],
            },
            durationMs: 5000,
          };
          ws.send(JSON.stringify(displayEvent));
        }

        session.lastNewsUpdate = now; // update timestamp
      } catch (err) {
        console.error(`[Session ${sessionId}] News Agent error:`, err);
      }
    }
  }
}, 60 * 1000); // check once every minute

// -----------------------------------
// 6) Health Check & Static
// -----------------------------------
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'healthy', app: PACKAGE_NAME });
});

app.use(express.static(path.join(__dirname, './public')));

// -----------------------------------
// Listen
// -----------------------------------
app.listen(PORT, () => {
  console.log(`Dashboard Manager TPA running at http://localhost:${PORT}`);
});
