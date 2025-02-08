//backend/src/routes/apps.ts
import express from 'express';
import { AppService } from '../services/app.service';
// import { initiateTpaSession } from '../tpa-websocket';
// import userSessionService from '../services/session.service';
import webSocketService from '../services/communication/websocket.service';
import sessionService from '../services/core/session.service';

const router = express.Router();

// Get all available apps
router.get('/', async (req, res) => {
  try {
    const apps = await AppService.getAllApps();
    res.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Error fetching apps' });
  }
});

// Start an app for a session
router.post('/:appId/start', async (req, res) => {
  const { appId } = req.params;
  const { sessionId } = req.body;

  try {
    // const session = userSessionService.getSession(sessionId);
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const app = await AppService.getApp(appId);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Initiate TPA session
    const tpaSessionId = await webSocketService.initiateTpaSession(sessionId, session.userId, appId);
    res.json({ status: 'initiated', tpaSessionId });
  } catch (error) {
    console.error(`Error starting app ${appId}:`, error);
    res.status(500).json({ error: 'Error starting app' });
  }
});

export default router;