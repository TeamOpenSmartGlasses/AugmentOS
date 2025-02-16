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
import tzlookup from 'tz-lookup';
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
  // cache for phone notifications as strings
  phoneNotificationCache?: { title: string; content: string, timestamp: number }[];
  transcriptionCache: any[];
  // embed the dashboard card into session info
  dashboard: DoubleTextWall;
  // cache latest location update, e.g., { latitude, longitude, timezone }
  latestLocation?: { latitude: number; longitude: number; timezone?: string };
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
      topText: 'Loading contextual dashboard...',
      bottomText: '',
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
        handleMessage(sessionId, ws, message);
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
function handleMessage(sessionId: string, ws: WebSocket, message: any) {
  const sessionInfo = activeSessions.get(sessionId);
  if (!sessionInfo) {
    console.warn(`Session ${sessionId} not found in activeSessions`);
    return;
  }

  switch (message.type) {
    case 'tpa_connection_ack': {
      // Connection acknowledged, subscribe to transcription
      const subMessage: TpaSubscriptionUpdateMessage = {
        type: 'subscription_update',
        packageName: PACKAGE_NAME,
        sessionId,
        subscriptions: ['phone_notification', 'location_update']
      };
      ws.send(JSON.stringify(subMessage));
      console.log(`Session ${sessionId} connected and subscribed`);
      break;
    }

    case 'data_stream': {
      const streamMessage = message as CloudDataStreamMessage;
      switch (streamMessage.streamType) {
        case 'phone_notification':
          // Instead of immediately calling the NewsAgent, cache the transcription.
          handlePhoneNotification(sessionId, streamMessage.data);
          break;

        case 'location_update':
          handleLocationUpdate(sessionId, streamMessage.data);
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

function handlePhoneNotification(sessionId: string, phoneNotificationData: any) {
  const sessionInfo = activeSessions.get(sessionId);
  if (!sessionInfo) return;
  
  if (!sessionInfo.phoneNotificationCache) {
    sessionInfo.phoneNotificationCache = [];
  }

  // Push the new notification.
  sessionInfo.phoneNotificationCache.push({
    title: phoneNotificationData.title,
    content: phoneNotificationData.content,
    timestamp: phoneNotificationData.timestamp,
  });

  // Remove duplicate notifications by filtering the array.
  sessionInfo.phoneNotificationCache = sessionInfo.phoneNotificationCache.filter((notification, index, self) => 
    index === self.findIndex((n) =>
      n.title === notification.title &&
      n.content === notification.content
    )
  );

  console.log(
    `[Session ${sessionId}] Cached phone notification. Total cached items: ${sessionInfo.phoneNotificationCache.length}`
  );
  console.log(sessionInfo.phoneNotificationCache);

  updateDashboard();
}

// -----------------------------------
// New: Handle Location Update
// -----------------------------------
function handleLocationUpdate(sessionId: string, locationData: any) {
  const sessionInfo = activeSessions.get(sessionId);
  if (!sessionInfo) return;

  // Extract lat, lng, and timestamp from the locationData.
  const { lat, lng, timestamp } = locationData;

  // Validate that lat and lng are numbers.
  if (typeof lat !== "number" || typeof lng !== "number") {
    console.error(`[Session ${sessionId}] Invalid location data:`, locationData);
    return;
  }

  // Determine the timezone for any given coordinates.
  let timezone: string;
  try {
    timezone = tzlookup(lat, lng);
  } catch (error) {
    console.error(`[Session ${sessionId}] Error looking up timezone for lat=${lat}, lng=${lng}:`, error);
    // Fallback to a default timezone if lookup fails.
    timezone = "America/New_York";
  }

  // Cache the location update in the session with the determined timezone.
  sessionInfo.latestLocation = { 
    latitude: lat, 
    longitude: lng, 
    timezone, 
  };

  console.log(
    `[Session ${sessionId}] Cached location update: lat=${lat}, lng=${lng}, timezone=${timezone}`
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
async function updateDashboard() {
  // Utility function to wrap text to a maximum line length without breaking words.
  function wrapText(text: string, maxLength = 25): string {
    return text.split('\n').map(line => {
      const words = line.split(' ');
      let currentLine = '';
      const wrappedLines: string[] = [];
  
      words.forEach(word => {
        if ((currentLine.length + (currentLine ? 1 : 0) + word.length) <= maxLength) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine);
          }
          currentLine = word;
  
          // If a single word is too long, hardcut it
          while (currentLine.length > maxLength) {
            wrappedLines.push(currentLine.slice(0, maxLength));
            currentLine = currentLine.slice(maxLength);
          }
        }
      });
  
      if (currentLine) {
        wrappedLines.push(currentLine.trim());
      }
      
      return wrappedLines.join('\n');
    }).join('\n');
  }  

  // Define left modules in group 1 (same-line modules).
  // Note: We now pass the sessionInfo into each run function so that the time module can
  // use the session’s cached location (if available) to determine the timezone.
  const leftModulesGroup1 = [
    {
      name: "time",
      async run(sessionInfo: SessionInfo) {
        // Use the timezone from the latest location update if available; else default.
        let timezone = "America/New_York";
        if (sessionInfo.latestLocation && sessionInfo.latestLocation.timezone) {
          timezone = sessionInfo.latestLocation.timezone;
        }

        console.log(`[Session ${sessionInfo.userId}] Using timezone: ${timezone}`);
        const options = {
          timeZone: timezone,
          hour: "2-digit" as const,
          minute: "2-digit" as const,
          month: "numeric" as const,
          day: "numeric" as const,
          hour12: true
        };
        let formatted = new Date().toLocaleString("en-US", options);
        // Remove the space and AM/PM from the formatted string
        formatted = formatted.replace(/ [AP]M/, "");
        return `◌ ${formatted}`;
      }
    },
    { 
      name: "status", 
      async run(sessionInfo: SessionInfo) { 
        return `100%`; 
      } 
    },
  ];

  const rightModules = [
    {
      name: "news",
      async run(context: any) {
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
    const leftGroup1Promises = leftModulesGroup1.map(module => module.run(sessionInfo));
    const leftGroup1Results = await Promise.all(leftGroup1Promises);
    // Join group 1 results with a comma so they appear on the same line.
    const leftGroup1Text = leftGroup1Results.filter(text => text.trim()).join(', ');

    // Define left group 2 modules to include notifications.
    const leftModulesGroup2 = [
      {
        name: "notifications",
        async run() {
          // Fetch the top 2 notifications (if any) from the session's cache.
          const notifications = sessionInfo.phoneNotificationCache || [];
          const topTwoNotifications = notifications.slice(-2);
          console.log(notifications);
          console.log(`[Session ${sessionId}] Notifications:`, topTwoNotifications);
          return topTwoNotifications.map(notification => `${notification.title}: ${notification.content}`).join('\n');
        }
      }
    ];

    // Run left group 2 modules concurrently.
    const leftGroup2Promises = leftModulesGroup2.map(module => module.run());
    const leftGroup2Results = await Promise.all(leftGroup2Promises);
    const leftGroup2Text = leftGroup2Results.filter(text => text.trim()).join('\n');

    // Combine left text: group 1 (same line) then group 2 (notifications) on a new line.
    let leftText = leftGroup1Text;
    if (leftGroup2Text) {
      leftText += `\n${leftGroup2Text}`;
    }
    // Wrap left text so that no individual line exceeds 25 characters.
    leftText = wrapText(leftText, 22);

    // Run right modules concurrently.
    const rightPromises = rightModules.map(module => module.run(context));
    const rightResults = await Promise.all(rightPromises);
    let rightText = rightResults.filter(text => text.trim()).join('\n');
    rightText = wrapText(rightText, 22);

    // Create display event with the dashboard card layout.
    const displayRequest: DisplayRequest = {
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
}

setTimeout(() => {
  // Run updateDashboard 5 seconds after the file runs.
  updateDashboard();
  // Then, schedule it to run every 60 seconds.
  setInterval(updateDashboard, 5000);
}, 5000);

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
