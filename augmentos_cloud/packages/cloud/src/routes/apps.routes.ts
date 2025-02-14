//backend/src/routes/apps.ts
import express from 'express';
import webSocketService from '../services/communication/websocket.service';
import sessionService from '../services/core/session.service';
import appService from '../services/core/app.service';
import { get } from 'http';

const router = express.Router();

// Get all available apps
router.get('/', async (req, res) => {
  try {
    const apps = await appService.getAllApps();
    res.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Error fetching apps' });
  }
});

// Start an app for a session
router.post('/:packageName/start', async (req, res) => {
  const { packageName } = req.params;
  const { sessionId } = req.body;

  try {
    // const session = userSessionService.getSession(sessionId);
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const app = await appService.getApp(packageName);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Initiate TPA session
    const tpaSessionId = await webSocketService.initiateTpaSession(sessionId, session.userId, packageName);
    session.activeAppSessions.push(tpaSessionId);

    res.json({ status: 'initiated', tpaSessionId });
  } catch (error) {
    console.error(`Error starting app ${packageName}:`, error);
    res.status(500).json({ error: 'Error starting app' });
  }
});

// Start an app for a session
router.post('/:packageName/stop', async (req, res) => {
  const { packageName } = req.params;
  const { sessionId } = req.body;

  try {
    // const session = userSessionService.getSession(sessionId);
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const app = await appService.getApp(packageName);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Initiate TPA session
    // const tpaSessionId = await webSocketService.initiateTpaSession(sessionId, session.userId, packageName);
    // TODO: Implement stop app
    session.activeAppSessions = session.activeAppSessions.filter((appSession) => appSession !== packageName);

    res.json({ status: 'stopped', packageName });
  } catch (error) {
    console.error(`Error starting app ${packageName}:`, error);
    res.status(500).json({ error: 'Error starting app' });
  }
});

export default router;