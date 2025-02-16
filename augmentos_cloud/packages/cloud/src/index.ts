/**
 * @fileoverview AugmentOS Cloud Server entry point.
 * Initializes core services and sets up HTTP/WebSocket servers.
 */

import express from 'express';
import { Server } from 'http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

// Import services
import { webSocketService } from './services/core/websocket.service';

// Import routes
import appRoutes from './routes/apps.routes';
import authRoutes from './routes/auth.routes';
import path from 'path';
import generateCoreToken from './utils/generateCoreToken';
import { AUGMENTOS_AUTH_JWT_SECRET } from './env';
import jwt from 'jsonwebtoken';

// Load environment variables
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
    'http://localhost:5174',
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
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

// Initialize WebSocket service
webSocketService.setupWebSocketServers(server);

// Start the server
const PORT = process.env.PORT || 7002;
server.listen(PORT, () => {
  console.log('\n😎 AugmentOS Cloud Server🚀\n');
  console.log(`HTTP server: http://localhost:${PORT}`);
  console.log('WebSocket endpoints:');
  console.log(`  - Glasses: ws://localhost:${PORT}/glasses-ws`);
  console.log(`  - TPA:     ws://localhost:${PORT}/tpa-ws\n`);
  console.log('\n🚀 Server ready\n');
});

// const coreToken = generateCoreToken();
// console.log(`\n\n\n\n\nCore token: ${coreToken}\n\n\n\n\n\n`);
// const userData = jwt.verify("efwewfwefwfwef", AUGMENTOS_AUTH_JWT_SECRET);
// console.log(`\n\n\n\n\nUser data: ${JSON.stringify(userData)}\n\n\n\n\n\n`);

export default server;