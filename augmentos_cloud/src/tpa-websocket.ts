// backend/src/tpa-websocket.ts
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import axios from 'axios';
import { AppService } from './services/app.service';
import subscriptionService from './services/subscription.service';
import displayService from './services/display.service';
import {
  TpaConnectionInitMessage,
  CloudTpaConnectionAckMessage,
  TpaToCloudMessage,
  TpaSubscriptionUpdateMessage,
  TpaDisplayEventMessage,
  CloudDataStreamMessage,
} from './types/websocket.types';
import userSessionService from './services/session.service';
import { Subscription } from './types/augment-os.types';

interface PendingTpaSession {
  userSessionId: string;
  userId: string;
  appId: string;
  timestamp: Date;
}

// Track pending TPA sessions waiting for WebSocket connection
const pendingTpaSessions = new Map<string, PendingTpaSession>();

// Active TPA WebSocket connections
const tpaConnections = new Map<string, {
  appId: string;
  userSessionId: string;
  websocket: WebSocket;
}>();

export async function initiateTpaSession(userSessionId: string, userId: string, appId: string) {
  try {
    const app = (await AppService.getAllApps()).find(a => a.appId === appId);
    if (!app) {
      throw new Error(`App ${appId} not found`);
    }

    const tpaSessionId = `${userSessionId}-${appId}`;
    console.log(`Initiating TPA session: ${tpaSessionId}`);
    
    pendingTpaSessions.set(tpaSessionId, {
      userSessionId,
      userId,
      appId,
      timestamp: new Date()
    });

    // Call TPA's webhook
    await axios.post(app.webhookURL, {
      type: 'session_request',
      sessionId: tpaSessionId,
      userId,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      if (pendingTpaSessions.has(tpaSessionId)) {
        pendingTpaSessions.delete(tpaSessionId);
        console.log(`TPA session ${tpaSessionId} expired without connection`);
      }
    }, 30000);

    return tpaSessionId;
  } catch (error) {
    console.error('Error initiating TPA session:', error);
    throw error;
  }
}

export function setupTpaWebSocket(tpaWss: WebSocketServer) {
  console.log('Setting up TPA WebSocket server...');

  tpaWss.on('connection', (ws: WebSocket) => {
    console.log('TPA attempting to connect...');
    let currentTpaSession: string | null = null;

    ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
      try {
        if (isBinary) {
          console.warn('Received unexpected binary message from TPA');
          return;
        }

        const message = JSON.parse(data.toString()) as TpaToCloudMessage;
        console.log('Received TPA message:', message.type);
        
        switch (message.type) {
          case 'tpa_connection_init': {
            // TODO: implement this logic but in the new websocket.service.ts file
            const initMessage = message as TpaConnectionInitMessage;
            const pendingSession = pendingTpaSessions.get(initMessage.sessionId);

            if (!pendingSession) {
              console.error(`No pending session found for ${initMessage.sessionId}`);
              ws.close(1008, 'Invalid or expired session ID');
              return;
            }

            // Verify app and API key (temporarily disabled)
            const app = (await AppService.getAllApps()).find(a => a.appId === pendingSession.appId);
            if (!app) {
              console.error(`App not found: ${pendingSession.appId}`);
              ws.close(1008, 'Invalid app ID');
              return;
            }

            // Setup TPA connection
            currentTpaSession = initMessage.sessionId;
            tpaConnections.set(currentTpaSession, {
              appId: pendingSession.appId,
              userSessionId: pendingSession.userSessionId,
              websocket: ws
            });

            pendingTpaSessions.delete(initMessage.sessionId);

            // Send acknowledgement
            const ackMessage: CloudTpaConnectionAckMessage = {
              type: 'tpa_connection_ack',
              sessionId: initMessage.sessionId,
              timestamp: new Date().toISOString()
            };

            ws.send(JSON.stringify(ackMessage));
            console.log(`TPA ${pendingSession.appId} connected for session ${initMessage.sessionId}`);
            break;
          }

          case 'subscription_update': {
            if (!currentTpaSession) {
              ws.close(1008, 'No active session');
              return;
            }

            const subMessage = message as TpaSubscriptionUpdateMessage;
            const connection = tpaConnections.get(currentTpaSession);
            if (!connection) return;

            // get the current user app session from id;
            const currentSession = userSessionService.getSession(connection.userSessionId);
            if (!currentSession) {
              ws.close(1008, 'No active session');
              return;
            }

            // Update subscriptions through subscription service
            subscriptionService.updateSubscriptions(
              connection.userSessionId,
              connection.appId,
              currentSession.userId,
              subMessage.subscriptions
            );

            console.log(`Updated subscriptions for ${currentTpaSession}`);
            break;
          }

          case 'display_event': {
            if (!currentTpaSession) {
              ws.close(1008, 'No active session');
              return;
            }

            const displayMessage = message as TpaDisplayEventMessage;
            const connection = tpaConnections.get(currentTpaSession);
            if (!connection) return;

            // Handle display through display service
            await displayService.handleDisplayEvent(
              connection.userSessionId,
              connection.appId,
              displayMessage.layout,
              displayMessage.durationMs
            );
            break;
          }
        }
      } catch (error) {
        console.error('Error handling TPA message:', error);
      }
    });

    ws.on('close', () => {
      if (currentTpaSession) {
        const connection = tpaConnections.get(currentTpaSession);
        if (connection) {
          // Clean up subscriptions
          subscriptionService.removeSubscriptions(
            connection.userSessionId,
            connection.appId
          );
        }
        tpaConnections.delete(currentTpaSession);
        console.log(`TPA session ${currentTpaSession} disconnected`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (currentTpaSession) {
        tpaConnections.delete(currentTpaSession);
      }
      ws.close();
    });
  });

  console.log('TPA WebSocket server setup complete');
}

// Function to broadcast data to subscribed TPAs
export function broadcastToTpa(
  userSessionId: string, 
  streamType: Subscription, 
  data: any
) {
  // Get all apps subscribed to this stream type
  const subscribedApps = subscriptionService.getSubscribedApps(userSessionId, streamType);

  for (const appId of subscribedApps) {
    const tpaSessionId = `${userSessionId}-${appId}`;
    const connection = tpaConnections.get(tpaSessionId);
    
    if (connection?.websocket) {
      const streamMessage: CloudDataStreamMessage = {
        type: 'data_stream',
        sessionId: tpaSessionId,
        streamType: streamType as any,
        data
      };
      
      connection.websocket.send(JSON.stringify(streamMessage));
    }
  }
}

export default {
  initiateTpaSession,
  setupTpaWebSocket,
  broadcastToTpa
};