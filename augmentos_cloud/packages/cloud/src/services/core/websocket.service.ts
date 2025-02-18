/**
 * @fileoverview WebSocket service that handles both glasses client and TPA connections.
 * This service is responsible for:
 * - Managing WebSocket connection lifecycles
 * - Handling real-time message routing
 * - Managing TPA session states
 * - Coordinating audio streaming and transcription
 * 
 * Typical usage:
 * const wsService = createWebSocketService(sessionService, subscriptionService, 
 *                                        transcriptionService, appService);
 * wsService.setupWebSocketServers(httpServer);
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import {
  // Client Messages
  GlassesToCloudMessage,
  GlassesConnectionInitMessage,
  CloudConnectionAckMessage,
  CloudConnectionErrorMessage,

  // TPA Messages
  TpaConnectionInitMessage,
  CloudTpaConnectionAckMessage,
  TpaToCloudMessage,
  TpaSubscriptionUpdateMessage,
  CloudDataStreamMessage,

  // Common
  WebSocketError,
  StreamType,
  GlassesStartAppMessage,
  GlassesStopAppMessage,
  HeadPositionEvent,
  CloudToTpaMessage,
  CloudAppStateChangeMessage,
  UserSession,
  CloudAuthErrorMessage,
} from '@augmentos/types';

import sessionService, { ISessionService } from './session.service';
import subscriptionService, { ISubscriptionService } from './subscription.service';
import transcriptionService, { ITranscriptionService } from '../processing/transcription.service';
import appService, { IAppService } from './app.service';
import { DisplayRequest } from '@augmentos/types';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AxiosError } from 'axios';
import { PosthogService } from '../logging/posthog.service';
import { AUGMENTOS_AUTH_JWT_SECRET, systemApps } from '@augmentos/types/config/cloud.env';
import { User } from '../../models/user.model';

// Constants
const TPA_SESSION_TIMEOUT_MS = 5000;  // 30 seconds

/**
 * Interface for pending TPA sessions awaiting WebSocket connection.
 */
// interface PendingTpaSession {
//   userSessionId: string;  // ID of the user's glasses session
//   userId: string;         // User identifier
//   packageName: string;         // TPA identifier
//   timestamp: Date;       // When the session was initiated
// }

/**
 * Interface for active TPA WebSocket connections.
 */
interface TpaConnection {
  packageName: string;
  userSessionId: string;
  websocket: WebSocket;
  lastPing?: Date;
}

/**
 * Interface defining the public API of the WebSocket service.
 */
export interface IWebSocketService {
  setupWebSocketServers(server: Server): void;
  broadcastToTpa(userSessionId: string, streamType: StreamType, data: any): void; // TODO: Specify data type.
  startAppSession(userSession: UserSession, packageName: string): Promise<string>;
}

/**
 * ⚡️🕸️🚀 Implementation of the WebSocket service.
 */
export class WebSocketService implements IWebSocketService {
  private glassesWss: WebSocketServer;
  private tpaWss: WebSocketServer;
  // private pendingTpaSessions = new Map<string, PendingTpaSession>();
  private tpaConnections = new Map<string, TpaConnection>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly sessionService: ISessionService,
    private readonly subscriptionService: ISubscriptionService,
    private readonly transcriptionService: ITranscriptionService,
    private readonly appService: IAppService,
    // private readonly displayService: IDisplayService
  ) {
    this.glassesWss = new WebSocketServer({ noServer: true });
    this.tpaWss = new WebSocketServer({ noServer: true });
  }

  /**
   * 🚀⚡️ Initializes WebSocket servers and sets up connection handling.
   * @param server - HTTP/HTTPS server instance to attach WebSocket servers to
   */
  setupWebSocketServers(server: Server): void {
    this.initializeWebSocketServers();
    this.setupUpgradeHandler(server);
  }

  /**
   * 🚀🪝 Initiates a new TPA session and triggers the TPA's webhook.
   * @param userSession - userSession object for the user initiating the TPA session
   * @param packageName - TPA identifier
   * @returns Promise resolving to the TPA session ID
   * @throws Error if app not found or webhook fails
   */
  async startAppSession(userSession: UserSession, packageName: string): Promise<string> {
    // check if it's already loading or running, if so return the session id.
    if (userSession.loadingApps.includes(packageName) || userSession.activeAppSessions.includes(packageName)) {
      console.log(`\n[websocket.service]\n🚀🚀🚀 App ${packageName} already loading or running\n `);
      
      return userSession.sessionId + '-' + packageName;
    }
    const app = await this.appService.getApp(packageName);
    if (!app) {
      throw new Error(`App ${packageName} not found`);
    }

    // const tpaSessionId = `${userSessionId}-${packageName}`;
    console.log(`\n[websocket.service]\n⚡️ Loading app ${packageName} for user ${packageName}\n`);

    // Store pending session. // TODO: move pendingTpaSessions inside userSession so we can clean it up when the user session ends. and because for some reason this.pendingTpaSession is not the same as this.pendingTpaSession in the handleTpaMessage method.
    userSession.loadingApps.push(packageName);
    // this.pendingTpaSessions.set(tpaSessionId, {
    //   userSessionId,
    //   userId,
    //   packageName,
    //   timestamp: new Date()
    // });

    console.log(`\nCurrent Loading Apps:`, userSession.loadingApps);

    try {
      // Trigger TPA webhook
      await this.appService.triggerWebhook(app.webhookURL, {
        type: 'session_request',
        sessionId: userSession.sessionId + '-' + packageName,
        userId: userSession.userId,
        timestamp: new Date().toISOString()
      });

      // Set timeout to clean up pending session
      setTimeout(() => {
        if (userSession.loadingApps.includes(packageName)) {
          userSession.loadingApps = userSession.loadingApps.filter(
            (packageName) => packageName !== packageName
          );
          console.log(`👴🏻 TPA ${packageName} expired without connection`);
        }
      }, TPA_SESSION_TIMEOUT_MS);

      return userSession.sessionId + '-' + packageName;
    } catch (error) {
      // this.pendingTpaSessions.delete(tpaSessionId);
      console.error(`\n[GG]\nError starting app ${packageName}:`, error);
      userSession.loadingApps = userSession.loadingApps.filter(
        (packageName) => packageName !== packageName
      );
      throw error;
    }
  }

  /**
   * 🗣️📣 Broadcasts data to all TPAs subscribed to a specific stream type.
   * @param userSessionId - ID of the user's glasses session
   * @param streamType - Type of data stream
   * @param data - Data to broadcast
   */
  broadcastToTpa(userSessionId: string, streamType: StreamType, data: CloudToTpaMessage): void {
    const subscribedApps = this.subscriptionService.getSubscribedApps(userSessionId, streamType);

    for (const packageName of subscribedApps) {
      const tpaSessionId = `${userSessionId}-${packageName}`;
      const connection = this.tpaConnections.get(tpaSessionId);

      if (connection?.websocket.readyState === WebSocket.OPEN) {
        const streamMessage: CloudDataStreamMessage = {
          type: 'data_stream',
          sessionId: tpaSessionId,
          streamType,
          data,
          timestamp: new Date()
        };

        connection.websocket.send(JSON.stringify(streamMessage));
      }
    }
  }

  /**
   * ⚡️⚡️ Initializes the WebSocket servers for both glasses and TPAs.
   * @private
   */
  private initializeWebSocketServers(): void {
    this.glassesWss.on('connection', this.handleGlassesConnection.bind(this));
    this.tpaWss.on('connection', this.handleTpaConnection.bind(this));
  }

  /**
   * 🗿 Sets up the upgrade handler for WebSocket connections.
   * @param server - HTTP/HTTPS server instance
   * @private
   */
  private setupUpgradeHandler(server: Server): void {
    server.on('upgrade', (request, socket, head) => {
      const { url } = request;

      if (url === '/glasses-ws') {
        this.glassesWss.handleUpgrade(request, socket, head, (ws) => {
          this.glassesWss.emit('connection', ws, request);
        });
      } else if (url === '/tpa-ws') {
        this.tpaWss.handleUpgrade(request, socket, head, (ws) => {
          this.tpaWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  /**
   * 🥳🤓 Handles new glasses client connections.
   * @param ws - WebSocket connection
   * @private
   */
  private handleGlassesConnection(ws: WebSocket): void {
    console.log('[websocket.service] New glasses client attempting to connect...');

    const session = this.sessionService.createSession(ws);
    ws.on('message', async (message: Buffer | string, isBinary: boolean) => {
      try {
        if (isBinary && Buffer.isBuffer(message)) {
          // Convert Node.js Buffer to ArrayBuffer
          const arrayBuf: ArrayBufferLike = message.buffer.slice(
            message.byteOffset,
            message.byteOffset + message.byteLength
          );

          // Pass the ArrayBuffer to Azure Speech or wherever you need it
          this.sessionService.handleAudioData(session, arrayBuf);
          return;
        }

        const parsedMessage = JSON.parse(message.toString()) as GlassesToCloudMessage;
        await this.handleGlassesMessage(session, ws, parsedMessage);
      } catch (error) {
        console.error(`Error handling glasses message:`, error);
        this.sendError(ws, {
          code: 'MESSAGE_HANDLING_ERROR',
          message: 'Error processing message'
        });
      }
    });

    const RECONNECT_GRACE_PERIOD_MS = 1000 * 60 * 5; // 5 minutes
    ws.on('close', () => {
      console.log(`Glasses WebSocket disconnected: ${session.sessionId}`);
      // Mark the session as disconnected but do not remove it immediately.
      this.sessionService.markSessionDisconnected(session);

      // Optionally, set a timeout to eventually clean up the session if not reconnected.
      setTimeout(() => {
        if (this.sessionService.isItTimeToKillTheSession(session.sessionId)) {
          this.sessionService.endSession(session.sessionId);
        }
      }, RECONNECT_GRACE_PERIOD_MS);
    });

    ws.on('error', (error) => {
      console.error(`Glasses WebSocket error:`, error);
      this.sessionService.endSession(session.sessionId);
      ws.close();
    });
  }

  /**
   * 🤓 Handles messages from glasses clients.
   * @param userSession - User Session identifier
   * @param ws - WebSocket connection
   * @param message - Parsed message from client
   * @private
   */
  private async handleGlassesMessage(
    userSession: UserSession,
    ws: WebSocket,
    message: GlassesToCloudMessage
  ): Promise<void> {
    try {
      // Track the incoming message event
      PosthogService.trackEvent(message.type, userSession.userId, {
        sessionId: userSession.sessionId,
        eventType: message.type,
        timestamp: new Date().toISOString()
        // message: message, // May contain sensitive data so let's not log it. just the event name cause i'm ethical like that 😇
      });

      switch (message.type) {
        case 'connection_init': {
          const initMessage = message as GlassesConnectionInitMessage;
          const coreToken = initMessage.coreToken || "";
          let userId = '';

          // Verify the core token, and extract the user ID.
          try {
            const userData = jwt.verify(coreToken, AUGMENTOS_AUTH_JWT_SECRET);
            userId = (userData as JwtPayload).email;
            if (!userId) {
              throw new Error('User ID is required');
            }
          }
          catch (error) {
            console.error(`[websocket.service] Error verifying core token:`, error);
            console.error('User ID is required');
            const errorMessage: CloudAuthErrorMessage = {
              type: 'auth_error',
              message: 'User not authenticated',
              timestamp: new Date()
            };
            ws.send(JSON.stringify(errorMessage));
            return;
          }
          console.log(`[websocket.service] Glasses client connected: ${userId}`);

          // See if this user has an existing session and reconnect if so.
          try {
            this.sessionService.handleReconnectUserSession(userSession, userId);
          }
          catch (error) {
            console.error(`\n\n\n\n[websocket.service] Error reconnecting user session starting new session:`, error);
          }

          // Start all the apps that the user has running.
          try {
            const user = await User.findOrCreateUser(userSession.userId);
            console.log(`\n\n[websocket.service] Trying to start ${user.runningApps.length} apps for user ${userSession.userId}\n`);
            for (const packageName of user.runningApps) {
              try {
                await this.startAppSession(userSession, packageName);
                userSession.activeAppSessions.push(packageName);
                console.log(`\n\n[websocket.service]\n[${userId}]\n🚀✅ Starting app ${packageName}\n`);
              }
              catch (error) {
                console.error(`\n\n[websocket.service] Error starting user apps:`, error, `\n\n`);
              }
            }

            // Start the dashboard app, but let's not add to the user's running apps since it's a system app.
            // honestly there should be no annyomous users so if it's an anonymous user we should just not start the dashboard
            if (userSession.userId !== 'anonymous') {
              await this.startAppSession(userSession, systemApps.dashboard.packageName);
              console.log(`\n\n[websocket.service]\n[${userId}]\n🗿🗿✅🗿🗿 Starting app org.augmentos.dashboard\n`);
            }

          }
          catch (error) {
            console.error(`\n\n[websocket.service] Error starting user apps:`, error, `\n\n`);
          }

          // Start transcription
          this.transcriptionService.startTranscription(
            userSession,
            (result) => {
              console.log(`[Session ${userSession.sessionId}] Recognizing:`, result.text);
              this.broadcastToTpa(userSession.sessionId, "transcription", result as any);
            },
            (result) => {
              console.log(`[Session ${userSession.sessionId}] Final result ${result?.speakerId}:`, result.text);
              this.broadcastToTpa(userSession.sessionId, "transcription", result as any);
            }
          );

          // this.sessionService.setAudioHandlers(userSession, pushStream, recognizer);
          const activeAppPackageNames = Array.from(new Set(userSession.activeAppSessions));

          // create a map of active apps and what steam types they are subscribed to.
          const appSubscriptions = new Map<string, StreamType[]>(); // packageName -> streamTypes
          const whatToStream: Set<StreamType> = new Set(); // packageName -> streamTypes

          for (const packageName of activeAppPackageNames) {
            const subscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, packageName);
            appSubscriptions.set(packageName, subscriptions);
            for (const subscription of subscriptions) {
              whatToStream.add(subscription);
            }
          }

          // Dashboard subscriptions
          const dashboardSubscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, systemApps.dashboard.packageName);
          for (const subscription of dashboardSubscriptions) {
            whatToStream.add(subscription);
          }

          const userSessionData = {
            sessionId: userSession.sessionId,
            userId: userSession.userId,
            startTime: userSession.startTime,
            installedApps: await this.appService.getAllApps(),
            appSubscriptions,
            activeAppPackageNames,
            whatToStream: Array.from(new Set(whatToStream)),
          };

          const ackMessage: CloudConnectionAckMessage = {
            type: 'connection_ack',
            sessionId: userSession.sessionId,
            userSession: userSessionData,
            timestamp: new Date()
          };
          ws.send(JSON.stringify(ackMessage));
          console.log(`\n\n[websocket.service]\nSENDING connection_ack to ${userId}\n\n`);
          break;
        }

        case 'start_app': {
          const startMessage = message as GlassesStartAppMessage;
          console.log(`Starting app ${startMessage.packageName}`);
          await this.startAppSession(userSession, startMessage.packageName);

          userSession.activeAppSessions.push(startMessage.packageName);

          // Get the list of active apps.
          const activeAppPackageNames = Array.from(new Set(userSession.activeAppSessions));

          // create a map of active apps and what steam types they are subscribed to.
          const appSubscriptions = new Map<string, StreamType[]>(); // packageName -> streamTypes
          const whatToStream: Set<StreamType> = new Set(); // packageName -> streamTypes

          for (const packageName of activeAppPackageNames) {
            const subscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, packageName);
            appSubscriptions.set(packageName, subscriptions);
            for (const subscription of subscriptions) {
              whatToStream.add(subscription);
            }
          }

          // Dashboard subscriptions
          const dashboardSubscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, systemApps.dashboard.packageName);
          for (const subscription of dashboardSubscriptions) {
            whatToStream.add(subscription);
          }

          const userSessionData = {
            sessionId: userSession.sessionId,
            userId: userSession.userId,
            startTime: userSession.startTime,
            installedApps: await this.appService.getAllApps(),
            appSubscriptions,
            activeAppPackageNames,
            whatToStream: Array.from(new Set(whatToStream)),
          };

          const clientResponse: CloudAppStateChangeMessage = {
            type: 'app_state_change',
            sessionId: userSession.sessionId, // TODO: Remove this field and check all references.
            userSession: userSessionData,
            timestamp: new Date()
          };
          ws.send(JSON.stringify(clientResponse));

          PosthogService.trackEvent(`start_app:${startMessage.packageName}`, userSession.userId, {
            sessionId: userSession.sessionId,
            eventType: message.type,
            timestamp: new Date().toISOString()
            // message: message, // May contain sensitive data so let's not log it. just the event name cause i'm ethical like that 😇
          });

          // Update users running apps in the database.
          try {
            const user = await User.findByEmail(userSession.userId);
            if (user) {
              await user.addRunningApp(startMessage.packageName);
            }
          }
          catch (error) {
            console.error(`\n\n[websocket.service] Error updating user running apps:`, error, `\n\n`);
          }
          break;
        }

        // In handleGlassesMessage method, update the 'stop_app' case:
        case 'stop_app': {
          const stopMessage = message as GlassesStopAppMessage;
          PosthogService.trackEvent(`stop_app:${stopMessage.packageName}`, userSession.userId, {
            sessionId: userSession.sessionId,
            eventType: message.type,
            timestamp: new Date().toISOString()
            // message: message, // May contain sensitive data so let's not log it. just the event name cause i'm ethical like that 😇
          });
          console.log(`Stopping app ${stopMessage.packageName}`);

          try {
            const app = await this.appService.getApp(stopMessage.packageName);
            if (!app) throw new Error(`App ${stopMessage.packageName} not found`);

            // Call stop webhook
            const tpaSessionId = `${userSession.sessionId}-${stopMessage.packageName}`;

            try {
              await this.appService.triggerStopWebhook(
                app.webhookURL,
                {
                  type: 'stop_request',
                  sessionId: tpaSessionId,
                  userId: userSession.userId,
                  reason: 'user_disabled',
                  timestamp: new Date().toISOString()
                }
              );
            }
            catch (error: AxiosError | unknown) {
              // console.error(`\n\n[stop_app]:\nError stopping app ${stopMessage.packageName}:\n${(error as any)?.message}\n\n`);
              // Update state even if webhook fails
              // TODO(isaiah): This is a temporary fix. We should handle this better. Also implement stop webhook in TPA typescript client lib.
              userSession.activeAppSessions = userSession.activeAppSessions.filter(
                (packageName) => packageName !== stopMessage.packageName
              );
            }

            // Remove subscriptions and update state
            this.subscriptionService.removeSubscriptions(
              userSession.sessionId,
              stopMessage.packageName
            );

            // Remove app from active list
            userSession.activeAppSessions = userSession.activeAppSessions.filter(
              (packageName) => packageName !== stopMessage.packageName
            );

            // Get the list of active apps.
            const activeAppPackageNames = Array.from(new Set(userSession.activeAppSessions));

            // create a map of active apps and what steam types they are subscribed to.
            const appSubscriptions = new Map<string, StreamType[]>(); // packageName -> streamTypes
            const whatToStream: Set<StreamType> = new Set(); // packageName -> streamTypes

            for (const packageName of activeAppPackageNames) {
              const subscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, packageName);
              appSubscriptions.set(packageName, subscriptions);
              for (const subscription of subscriptions) {
                whatToStream.add(subscription);
              }
            }

            // Dashboard subscriptions
            const dashboardSubscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, systemApps.dashboard.packageName);
            for (const subscription of dashboardSubscriptions) {
              whatToStream.add(subscription);
            }

            const userSessionData = {
              sessionId: userSession.sessionId,
              userId: userSession.userId,
              startTime: userSession.startTime,
              installedApps: await this.appService.getAllApps(),
              appSubscriptions,
              activeAppPackageNames,
              whatToStream: Array.from(new Set(whatToStream)),
            };

            const clientResponse: CloudAppStateChangeMessage = {
              type: 'app_state_change',
              sessionId: userSession.sessionId, // TODO: Remove this field and check all references.
              userSession: userSessionData,
              timestamp: new Date()
            };
            ws.send(JSON.stringify(clientResponse));

            // Update users running apps in the database.
            try {
              const user = await User.findByEmail(userSession.userId);
              if (user) {
                await user.addRunningApp(stopMessage.packageName);
              }
            }
            catch (error) {
              console.error(`\n\n[websocket.service] Error updating user running apps:`, error, `\n\n`);
            }

          } catch (error) {
            console.error(`Error stopping app ${stopMessage.packageName}:`, error);
            // Update state even if webhook fails
            userSession.activeAppSessions = userSession.activeAppSessions.filter(
              (packageName) => packageName !== stopMessage.packageName
            );
          }
          break;
        }

        case 'head_position': {
          const headMessage = message as HeadPositionEvent;
          this.broadcastToTpa(userSession.sessionId, 'head_position', headMessage);
          break;
        }

        // All other message types are broadcast to TPAs.
        default: {
          console.warn(`[Session ${userSession.sessionId}] Catching and Sending message type:`, message.type);
          // check if it's a type of Client to TPA message.
          this.broadcastToTpa(userSession.sessionId, message.type as any, message as any);
        }
      }
    } catch (error) {
      console.error(`[Session ${userSession.sessionId}] Error handling message:`, error);
      // Optionally send error to client
      const errorMessage: CloudConnectionErrorMessage = {
        type: 'connection_error',
        message: error instanceof Error ? error.message : 'Error processing message',
        timestamp: new Date()
      };

      PosthogService.trackEvent("error-handleGlassesMessage", userSession.userId, {
        sessionId: userSession.sessionId,
        eventType: message.type,
        timestamp: new Date().toISOString(),
        error: error,
        // message: message, // May contain sensitive data so let's not log it. just the event name cause i'm ethical like that 😇
      });

      ws.send(JSON.stringify(errorMessage));
    }
  }
  /**
   * 🥳 Handles new TPA connections.
   * @param ws - WebSocket connection
   * @private
   */
  private handleTpaConnection(ws: WebSocket): void {
    console.log('New TPA attempting to connect...');
    let currentAppSession: string | null = null;
    const setCurrentSessionId = (appSessionId: string) => {
      currentAppSession = appSessionId;
    }

    ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
      console.log('\n\n~~Received message from TPA~~\n', data.toString(), data);
      if (isBinary) {
        console.warn('Received unexpected binary message from TPA');
        return;
      }

      try {
        const message = JSON.parse(data.toString()) as TpaToCloudMessage;
        // await this.handleTpaMessage(ws, message, currentAppSession, setCurrentSessionId);
        // Handle TPA messages here.
        try {
          switch (message.type) {
            case 'tpa_connection_init': {
              const initMessage = message as TpaConnectionInitMessage;
              await this.handleTpaInit(ws, initMessage, setCurrentSessionId);
              break;
            }
    
            case 'subscription_update': {
              if (!currentAppSession) {
                ws.close(1008, 'No active session');
                return;
              }
    
              const subMessage = message as TpaSubscriptionUpdateMessage;
              const connection = this.tpaConnections.get(currentAppSession);
              if (!connection) return;
    
              const userSession = this.sessionService.getSession(connection.userSessionId);
              if (!userSession) {
                ws.close(1008, 'No active session');
                return;
              }
    
              this.subscriptionService.updateSubscriptions(
                connection.userSessionId,
                connection.packageName,
                userSession.userId,
                subMessage.subscriptions
              );
    
              // TODO tell the client the new app state change for updates to the app subscriptions.
              // Get the list of active apps.
              const activeAppPackageNames = Array.from(new Set(userSession.activeAppSessions));
    
              // create a map of active apps and what steam types they are subscribed to.
              const appSubscriptions = new Map<string, StreamType[]>(); // packageName -> streamTypes
              const whatToStream: Set<StreamType> = new Set(); // packageName -> streamTypes
    
              for (const packageName of activeAppPackageNames) {
                const subscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, packageName);
                appSubscriptions.set(packageName, subscriptions);
                for (const subscription of subscriptions) {
                  whatToStream.add(subscription);
                }
              }

              // Dashboard subscriptions
              const dashboardSubscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, systemApps.dashboard.packageName);
              for (const subscription of dashboardSubscriptions) {
                whatToStream.add(subscription);
              }

              const userSessionData = {
                sessionId: userSession.sessionId,
                userId: userSession.userId,
                startTime: userSession.startTime,
                installedApps: await this.appService.getAllApps(),
                appSubscriptions,
                activeAppPackageNames,
                whatToStream: Array.from(new Set(whatToStream)),
              };

              const clientResponse: CloudAppStateChangeMessage = {
                type: 'app_state_change',
                sessionId: userSession.sessionId, // TODO: Remove this field and check all references.
                userSession: userSessionData,
                timestamp: new Date()
              };
              userSession?.websocket.send(JSON.stringify(clientResponse));
              break;
            }
    
            case 'display_event': {
              if (!currentAppSession) {
                ws.close(1008, 'No active session');
                return;
              }
    
              const displayMessage = message as DisplayRequest;
              const connection = this.tpaConnections.get(currentAppSession);
              if (!connection) return;
    
              this.sessionService.updateDisplay(
                connection.userSessionId,
                displayMessage
              );
    
              break;
            }
          }
        }
        catch (error) {
          console.error('Error handling TPA message:', error);
          this.sendError(ws, {
            code: 'MESSAGE_HANDLING_ERROR',
            message: 'Error processing message'
          });
          PosthogService.trackEvent("error-handleTpaMessage", "anonymous", {
            eventType: message.type,
            timestamp: new Date().toISOString(),
            error: error,
          });
        }
        
      } catch (error) {
        console.error('Error handling TPA message:', error);
        this.sendError(ws, {
          code: 'MESSAGE_HANDLING_ERROR',
          message: 'Error processing message'
        });
      }
    });

    ws.on('close', () => {
      if (currentAppSession) {
        const connection = this.tpaConnections.get(currentAppSession);
        if (connection) {
          this.subscriptionService.removeSubscriptions(
            connection.userSessionId,
            connection.packageName
          );
        }
        this.tpaConnections.delete(currentAppSession);
        console.log(`TPA session ${currentAppSession} disconnected`);
      }
    });

    ws.on('error', (error) => {
      console.error('TPA WebSocket error:', error);
      if (currentAppSession) {
        this.tpaConnections.delete(currentAppSession);
      }
      ws.close();
    });

    ws.on('pong', () => {
      if (currentAppSession) {
        const connection = this.tpaConnections.get(currentAppSession);
        if (connection) {
          connection.lastPing = new Date();
        }
      }
    });
  }

  /**
   * 💬 Handles messages from TPAs.
   * @param ws - WebSocket connection
   * @param message - Parsed message from TPA
   * @param currentSession - Current TPA session ID
   * @private
   */
  // private async handleTpaMessage(
  //   ws: WebSocket,
  //   message: TpaToCloudMessage,
  //   currentSession: string | null,
  //   setCurrentSessionId: (sessionId: string) => void
  // ): Promise<void> {
  //   try {
  //     switch (message.type) {
  //       case 'tpa_connection_init': {
  //         const initMessage = message as TpaConnectionInitMessage;
  //         await this.handleTpaInit(ws, initMessage, setCurrentSessionId);
  //         break;
  //       }

  //       case 'subscription_update': {
  //         if (!currentSession) {
  //           ws.close(1008, 'No active session');
  //           return;
  //         }

  //         const subMessage = message as TpaSubscriptionUpdateMessage;
  //         const connection = this.tpaConnections.get(currentSession);
  //         if (!connection) return;

  //         const userSession = this.sessionService.getSession(connection.userSessionId);
  //         if (!userSession) {
  //           ws.close(1008, 'No active session');
  //           return;
  //         }

  //         this.subscriptionService.updateSubscriptions(
  //           connection.userSessionId,
  //           connection.packageName,
  //           userSession.userId,
  //           subMessage.subscriptions
  //         );

  //         // TODO tell the client the new app state change for updates to the app subscriptions.
  //         // Get the list of active apps.
  //         const activeAppPackageNames = Array.from(new Set(userSession.activeAppSessions));

  //         // create a map of active apps and what steam types they are subscribed to.
  //         const appSubscriptions = new Map<string, StreamType[]>(); // packageName -> streamTypes
  //         const whatToStream: Set<StreamType> = new Set(); // packageName -> streamTypes

  //         for (const packageName of activeAppPackageNames) {
  //           const subscriptions = this.subscriptionService.getAppSubscriptions(userSession.sessionId, packageName);
  //           appSubscriptions.set(packageName, subscriptions);
  //           for (const subscription of subscriptions) {
  //             whatToStream.add(subscription);
  //           }
  //         }

  //         const userSessionData = {
  //           sessionId: userSession.sessionId,
  //           userId: userSession.userId,
  //           startTime: userSession.startTime,
  //           installedApps: await this.appService.getAllApps(),
  //           appSubscriptions,
  //           activeAppPackageNames,
  //           whatToStream: Array.from(new Set(whatToStream)),
  //         };

  //         const clientResponse: CloudAppStateChangeMessage = {
  //           type: 'app_state_change',
  //           sessionId: userSession.sessionId, // TODO: Remove this field and check all references.
  //           userSession: userSessionData,
  //           timestamp: new Date()
  //         };
  //         userSession?.websocket.send(JSON.stringify(clientResponse));
  //         break;
  //       }

  //       case 'display_event': {
  //         if (!currentSession) {
  //           ws.close(1008, 'No active session');
  //           return;
  //         }

  //         const displayMessage = message as DisplayRequest;
  //         const connection = this.tpaConnections.get(currentSession);
  //         if (!connection) return;

  //         this.sessionService.updateDisplay(
  //           connection.userSessionId,
  //           displayMessage
  //         );

  //         break;
  //       }
  //     }
  //   }
  //   catch (error) {
  //     console.error('Error handling TPA message:', error);
  //     this.sendError(ws, {
  //       code: 'MESSAGE_HANDLING_ERROR',
  //       message: 'Error processing message'
  //     });
  //     PosthogService.trackEvent("error-handleTpaMessage", "anonymous", {
  //       eventType: message.type,
  //       timestamp: new Date().toISOString(),
  //       error: error,
  //     });
  //   }
  // }

  /**
   * 🤝 Handles TPA connection initialization.
   * @param ws - WebSocket connection
   * @param initMessage - Connection initialization message
   * @param setCurrentSessionId - Function to set the current TPA session ID
   * @private
   */
  private async handleTpaInit(
    ws: WebSocket,
    initMessage: TpaConnectionInitMessage,
    setCurrentSessionId: (sessionId: string) => void
  ): Promise<void> {
    // const pendingSession = this.pendingTpaSessions.get(initMessage.appSessionId);
    const userSessionId = initMessage.sessionId.split('-')[0];
    const userSession = this.sessionService.getSession(userSessionId);

    if (!userSession?.loadingApps.includes(initMessage.packageName)) {
      console.error('\n\n[websocket.service.ts]🙅‍♀️TPA session not found\nYou shall not pass! 🧙‍♂️\n:', initMessage.sessionId, 
        '\n\nLoading apps:', userSession?.loadingApps, '\n\n'
      );
      ws.close(1008, 'Invalid session ID');
      return;
    }

    // const { userSessionId, packageName } = pendingSession;
    // const connectionId = `${userSessionId}-${packageName}`;

    // TODO(isaiah): 🔐 Authenticate TPA with API key !important 😳.
    // We should insure that the TPA is who they say they are. the session id is legit and they own the package name.
    // For now because all the TPAs are internal we can just trust them.
    // This is a good place to add a check for the TPA's API key for when we have external TPAs.

    // this.pendingTpaSessions.delete(initMessage.appSessionId);
    userSession.loadingApps = userSession.loadingApps.filter(
      (packageName) => packageName !== initMessage.packageName
    );

    this.tpaConnections.set(initMessage.sessionId, { packageName: initMessage.packageName, userSessionId, websocket: ws });
    setCurrentSessionId(initMessage.sessionId);

    const ackMessage: CloudTpaConnectionAckMessage = {
      type: 'tpa_connection_ack',
      sessionId: initMessage.sessionId,
      timestamp: new Date()
    };
    ws.send(JSON.stringify(ackMessage));
    console.log(`TPA ${initMessage.packageName} connected for session ${initMessage.sessionId}`);
  }

  /**
   * 😬 Sends an error message to a WebSocket client.
   * @param ws - WebSocket connection
   * @param error - Error details
   * @private
   */
  private sendError(ws: WebSocket, error: WebSocketError): void {
    const errorMessage: CloudConnectionErrorMessage = {
      type: 'connection_error',
      message: error.message,
      timestamp: new Date()
    };
    ws.send(JSON.stringify(errorMessage));
  }
}

/**
 * ⚡️ Creates and returns a WebSocket service instance with the provided dependencies.
 * @param sessionService - Service for managing user sessions
 * @param subscriptionService - Service for managing TPA subscriptions
 * @param transcriptionService - Service for handling audio transcription
 * @param appService - Service for managing TPAs
 * @returns An initialized WebSocket service instance
 */
export function createWebSocketService(
  sessionService: ISessionService,
  subscriptionService: ISubscriptionService,
  transcriptionService: ITranscriptionService,
  appService: IAppService,
): IWebSocketService {
  return new WebSocketService(
    sessionService,
    subscriptionService,
    transcriptionService,
    appService,
  );
}

/**
 * ☝️ Singleton instance with actual service implementations.
 * Design decision: While we use DI for testing, in the actual application
 * we provide a convenient singleton instance with all dependencies configured.
 */
export const webSocketService = createWebSocketService(
  sessionService,
  subscriptionService,
  transcriptionService,
  appService,
);
console.log('✅ WebSocket Service');

export default webSocketService;