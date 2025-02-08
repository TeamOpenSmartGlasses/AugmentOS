import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import dotenv from 'dotenv';
import { TranscriptionService } from './services/transcript.service';
import userSessionService from './services/session.service';


import { 
  InterimTranscriptionResult, 
  FinalTranscriptionResult 
} from './services/transcript.service';
import appRoutes from './routes/apps.routes';
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { setupTpaWebSocket } from './tpa-websocket';
import { GlassesToCloudMessage, GlassesConnectionInitMessage, CloudConnectionAckMessage } from './types';

dotenv.config();

// Initialize Express and HTTP server
const app = express();
const server = new Server(app);

// Middleware setup
app.use(helmet());
app.use(cors({
  credentials: true, 
  origin: [
    '*',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'https://cloud.augmentos.org',
    'https://dev.augmentos.org',
    'https://www.augmentos.org',
    'https://augmentos.org',
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Routes
app.use('/apps', appRoutes);

// Initialize services
const transcriptionService = new TranscriptionService();

// Create WebSocketServer instances with noServer: true
const glassesWss = new WebSocketServer({ 
  noServer: true,
  perMessageDeflate: false, // Disable compression for audio streaming
});

const tpaWss = new WebSocketServer({
  noServer: true,
});

// Setup Glasses WebSocket handlers
glassesWss.on('connection', (ws: WebSocket, request) => {
  // Create a new session
  const session = userSessionService.createSession(ws);
  const sessionId = session.sessionId;
  
  console.log(`\n🚀😎New Glasses Session:\n${sessionId}\n\n`);

  // Handle interim transcription results
  const handleInterimResult = (result: InterimTranscriptionResult) => {
    // userSessionService.updateDisplay(sessionId, {
    //   layoutType: 'text_line',
    //   text: result.text
    // });
  };

  // Handle final transcription results
  const handleFinalResult = (result: FinalTranscriptionResult) => {
    console.log(`\n\n[Session ${sessionId}]\nFinal result SpeakerId ${result.speakerId}: ${result.text}\n\n`);
    // userSessionService.updateDisplay(
    //   sessionId,
    //   {
    //     layoutType: 'text_line',
    //     text: result.text
    //   },
    //   3000
    // );
  };

  ws.on('message', (message: ArrayBuffer | string, isBinary: boolean) => {
    try {
      if (!isBinary) {
        const parsedMessage = JSON.parse(message as string) as GlassesToCloudMessage;
        if (parsedMessage.type === 'connection_init') {
          const initMessage = parsedMessage as GlassesConnectionInitMessage;
          console.log(`Received connection_init for session ${sessionId}. User: ${initMessage.userId}`);
          
          userSessionService.updateUserId(sessionId, initMessage.userId || 'anonymous');

          const { recognizer, pushStream } = transcriptionService.startTranscription(
            sessionId,
            handleInterimResult,
            handleFinalResult
          );

          userSessionService.setAudioHandlers(sessionId, pushStream, recognizer);
          console.log(`\n[Session ${sessionId}]\n🗣️ Transcription service started for session.\n`);

          // Acknowledge the connection to the glasses.
          const ackMessage: CloudConnectionAckMessage = {
            type: 'connection_ack',
            sessionId,
            timestamp: new Date(),
          };
          ws.send(JSON.stringify(ackMessage));
          console.log(`\n[Session ${sessionId}]\n✅ Session acknowledged to glasses.\n`);
        }
      } else {
        userSessionService.handleAudioData(sessionId, message as ArrayBuffer);
      }
    } catch (error) {
      console.error(`[Session ${sessionId}]\nError handling message:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`💔 WebSocket disconnected. Session ID: ${sessionId}`);
    userSessionService.endSession(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`⛔️ WebSocket error (Session ${sessionId}):`, error);
    userSessionService.endSession(sessionId);
    ws.close();
  });
});

// Setup TPA WebSocket handlers using the tpaWss instance
setupTpaWebSocket(tpaWss);

// Single upgrade handler for both WS endpoints
server.on('upgrade', (request, socket, head) => {
  const { url } = request;
  if (url === '/glasses-ws') {
    glassesWss.handleUpgrade(request, socket, head, (ws) => {
      glassesWss.emit('connection', ws, request);
    });
  } else if (url === '/tpa-ws') {
    tpaWss.handleUpgrade(request, socket, head, (ws) => {
      tpaWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start the server
const PORT = 7002;
server.listen(PORT, () => {
  console.log(`\n\n🚀🚀🚀\nServer running at http://localhost:${PORT}`);
  console.log('WebSocket endpoints:');
  console.log('  - Glasses WS: ws://localhost:7002/glasses-ws');
  console.log('  - TPA WS: ws://localhost:7002/tpa-ws\n🚀🚀🚀\n\n');
});
