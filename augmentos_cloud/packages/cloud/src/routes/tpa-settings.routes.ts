// backend/src/routes/tpa-settings.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AUGMENTOS_AUTH_JWT_SECRET } from '@augmentos/config';

const router = express.Router();

// GET /tpasettings/:tpaName
// Returns the configuration with each non-group setting having a "selected" property.
router.get('/:tpaName', async (req, res) => {
  console.log('Received request for TPA settings');

  // Extract TPA name from the URL parameter.
  const parts = req.params.tpaName.split('.');
  const tpaName = parts.length > 2 ? parts[2] : req.params.tpaName;
  if (!tpaName) {
    return res.status(400).json({ error: 'TPA name missing in request' });
  }

  // Validate the Authorization header.
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  const authParts = authHeader.split(' ');
  if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }
  const coreToken = authParts[1];

  try {
    // Validate the core token.
    const decoded = jwt.verify(coreToken, AUGMENTOS_AUTH_JWT_SECRET) as jwt.JwtPayload;
    const userId = decoded.email;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token' });
    }

    // Read and parse the TPA configuration file.
    const configFilePath = path.join(__dirname, '..', '..', '..', 'apps', tpaName, 'tpa_config.json');
    let tpaConfig;
    try {
      const rawData = fs.readFileSync(configFilePath, 'utf8');
      tpaConfig = JSON.parse(rawData);
    } catch (err) {
      console.error('Error reading TPA config file:', err);
      return res.status(500).json({ error: 'Error reading TPA config file' });
    }

    // For each setting, add a "selected" property with the defaultValue.
    const updatedSettings = tpaConfig.settings.map((setting: any) => {
      if (setting.type === 'group') {
        return setting;
      }
      return {
        ...setting,
        selected: setting.defaultValue,
      };
    });

    // Return the configuration with the updated settings.
    return res.json({
      success: true,
      userId,
      name: tpaConfig.name,
      description: tpaConfig.description,
      version: tpaConfig.version,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Error processing TPA settings request:', error);
    return res.status(401).json({ error: 'Invalid core token or error processing request' });
  }
});

// POST /tpasettings/:tpaName
// Receives an update for a setting and prints out the new value.
router.post('/:tpaName', async (req, res) => {
  console.log('Received update for TPA settings');

  // Extract TPA name from the URL parameter.
  const parts = req.params.tpaName.split('.');
  const tpaName = parts.length > 2 ? parts[2] : req.params.tpaName;
  if (!tpaName) {
    return res.status(400).json({ error: 'TPA name missing in request' });
  }

  // Validate the Authorization header.
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  const authParts = authHeader.split(' ');
  if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }
  const coreToken = authParts[1];

  try {
    // Validate the core token.
    const decoded = jwt.verify(coreToken, AUGMENTOS_AUTH_JWT_SECRET) as jwt.JwtPayload;
    const userId = decoded.email;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token' });
    }

    // Extract the update payload from the request body.
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing key in update payload' });
    }

    // For this example, simply print out the updated setting.
    console.log(`Updated setting for TPA "${tpaName}" by user ${userId}: ${key} = ${value}`);

    // You can add logic here to update persistent storage if needed.
    return res.json({ success: true, message: `Updated setting ${key} to ${value}` });
  } catch (error) {
    console.error('Error processing update for TPA settings:', error);
    return res.status(401).json({ error: 'Invalid core token or error processing update' });
  }
});

export default router;
