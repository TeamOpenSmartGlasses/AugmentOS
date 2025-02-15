import express from 'express';
import WebSocket from 'ws';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // if you need unique IDs
import {
  TpaConnectionInitMessage,
  TpaSubscriptionUpdateMessage,
  CloudDataStreamMessage,
  DashboardCard,
  DisplayRequest,
  DoubleTextWall,
} from '@augmentos/types';

import { NewsAgent } from '../../../agents/NewsAgent';  // lowercase 'n'
import { WeatherModule } from './dashboard-modules/WeatherModule';
// e.g. { languageLearning: LanguageLearningAgent, news: NewsAgent, ... }

const app = express();
const PORT = 7012; // your Dashboard Manager port

const PACKAGE_NAME = 'org.mentra.dashboard';
const API_KEY = 'test_key'; // In production, store securely
const LOCATION = 'New York'; // Hardcoded for now

// For demonstration, we'll keep session-based info in-memory.
// In real usage, you might store persistent data in a DB.
interface SessionInfo {
  userId: string;
  ws: WebSocket;
  // track last agent calls
  lastNewsUpdate?: number;
  // cache for transcription data (could be an array to accumulate multiple transcriptions)
  transcriptionCache?: any[];
  // embed the dashboard card into session info
  dashboard: DoubleTextWall;
  [key: string]: any;
}

const activeSessions = new Map<string, SessionInfo>();

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
    const dashboardCard: DoubleTextWall = {
      layoutType: 'double_text_wall',
      topText: new Date().toLocaleString("en-US", {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' 100%',
      bottomText: 'Meeting with John',
    };

    // Store session info, including the dashboard card.
    activeSessions.set(sessionId, {
      userId,
      ws,
      lastNewsUpdate: Date.now(), // start time for e.g. news
      transcriptionCache: [],
      dashboard: dashboardCard,
    });

    // 2) On open, send tpa_connection_init and initial dashboard display event
    ws.on('open', () => {
      console.log(`[Session ${sessionId}] Connected to augmentos-cloud`);

      const initMessage: TpaConnectionInitMessage = {
        type: 'tpa_connection_init',
        sessionId,
        packageName: PACKAGE_NAME,
        apiKey: API_KEY,
      };
      ws.send(JSON.stringify(initMessage));

      const displayRequest: DisplayRequest = {
        type: 'display_event',
        view: 'dashboard',
        packageName: PACKAGE_NAME,
        sessionId,
        layout: dashboardCard,
        durationMs: 4000,
        timestamp: new Date(),
      };
      ws.send(JSON.stringify(displayRequest));
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
          // Instead of immediately calling the NewsAgent, cache the transcription.
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


function handleTranscription(sessionId: string, transcriptionData: any) {
  const sessionInfo = activeSessions.get(sessionId);
  if (!sessionInfo) return;
  if (!sessionInfo.transcriptionCache) {
    sessionInfo.transcriptionCache = [];
  }
  sessionInfo.transcriptionCache.push(transcriptionData);
  console.log(
    `[Session ${sessionId}] Cached transcription. Total cached items: ${sessionInfo.transcriptionCache.length}`
  );
}

// -----------------------------------
// 4) Handle Settings
// -----------------------------------
function handleSettings(sessionId: string, settingsData: any) {
  console.log(`[Session ${sessionId}] Received context_settings:`, settingsData);
  const sessionInfo = activeSessions.get(sessionId);
  if (sessionInfo) {
    sessionInfo['currentSettings'] = settingsData;
  }
}

// -----------------------------------
// 7) Internal Dashboard Updater
// -----------------------------------
setInterval(async () => {
  // Utility function to wrap text to a maximum line length without breaking words.
  function wrapText(text, maxLength = 20) {
    // Process each existing line separately.
    return text.split('\n').map(line => {
      const words = line.split(' ');
      let currentLine = '';
      const wrappedLines = [];
      
      words.forEach(word => {
        // Check if adding the word (plus a space if needed) exceeds maxLength.
        if ((currentLine.length + (currentLine ? 1 : 0) + word.length) <= maxLength) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          // If the current line is not empty, push it and start a new line.
          if (currentLine) {
            wrappedLines.push(currentLine);
          }
          // Start the new line with the current word.
          currentLine = word;
        }
      });
      // Push any remaining words.
      if (currentLine) {
        wrappedLines.push(currentLine.trim());
      }
      // Join the wrapped lines with newline characters.
      return wrappedLines.join('\n');
    }).join('\n');
  }

  // Define left modules in two groups:
  // Group 1: Modules to be displayed on the same line.
  const leftModulesGroup1 = [
    {
      name: "time",
      async run() {
        return `◌ ${new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: '2-digit',
          minute: '2-digit',
          month: 'numeric',
          day: 'numeric'
        })}`;
      }
    },
    { 
      name: "status", 
      async run() { 
        return `100%`; 
      } 
    },
  ];
  
  // Group 2: Modules to be displayed on separate lines below Group 1.
  const leftModulesGroup2 = [
    { 
      name: "uptime", 
      async run() { 
        return `Thomas: Welcome to the dashboard!`; 
      } 
    },
    // Additional left modules can be added here.
  ];

  const rightModules = [
    {
      name: "news",
      async run(context) {
        const newsAgent = new NewsAgent();
        const newsResult = await newsAgent.handleContext(context);
        console.log(newsResult);
        return (newsResult &&
                newsResult.news_summaries &&
                newsResult.news_summaries.length > 0)
          ? newsResult.news_summaries[0]
          : '';
      },
    },
    {
      name: "weather",
      async run() {
        const newYorkLatitude = 40.7128;
        const newYorkLongitude = -74.0060;
        const weatherAgent = new WeatherModule();
        const weather = await weatherAgent.fetchWeatherForecast(newYorkLatitude, newYorkLongitude);
        return weather ? `${weather.condition}, ${weather.avg_temp_f}°F` : '';
      },
    },
  ];

  // Iterate through each active session.
  for (const [sessionId, sessionInfo] of activeSessions.entries()) {
    // Prepare a context for modules that need it.
    const context = { transcriptions: sessionInfo.transcriptionCache };
    // Clear the transcription cache.
    sessionInfo.transcriptionCache = [];

    // Run left group 1 modules concurrently.
    const leftGroup1Promises = leftModulesGroup1.map(module => module.run());
    const leftGroup1Results = await Promise.all(leftGroup1Promises);
    // Join group 1 results with a space so they appear on the same line.
    const leftGroup1Text = leftGroup1Results.filter(text => text.trim()).join(', ');

    // Run left group 2 modules concurrently.
    const leftGroup2Promises = leftModulesGroup2.map(module => module.run());
    const leftGroup2Results = await Promise.all(leftGroup2Promises);
    // Join group 2 results with a newline so each appears on a new line.
    const leftGroup2Text = leftGroup2Results.filter(text => text.trim()).join('\n');

    // Combine left groups.
    // If group 2 exists, append it on a new line.
    let leftText = leftGroup2Text ? `${leftGroup1Text}\n${leftGroup2Text}` : leftGroup1Text;
    // Wrap left text so that no individual line exceeds 20 characters.
    leftText = wrapText(leftText, 25);

    // Run right modules concurrently.
    const rightPromises = rightModules.map(module => module.run(context));
    const rightResults = await Promise.all(rightPromises);
    // Join right module outputs; adjust the delimiter as needed.
    let rightText = rightResults.filter(text => text.trim()).join('\n');
    // Wrap right text similarly.
    rightText = wrapText(rightText, 25);

    // Create display event with the dashboard card layout.
    const displayRequest = {
      type: 'display_event',
      view: 'dashboard',
      packageName: PACKAGE_NAME,
      sessionId,
      layout: {
        layoutType: 'double_text_wall',
        topText: leftText,
        bottomText: rightText,
      },
      durationMs: 4000,
      timestamp: new Date(),
    };

    console.log(`[Session ${sessionId}] Sending updated dashboard:`, displayRequest);
    sessionInfo.ws.send(JSON.stringify(displayRequest));
  }
}, 4000);

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
