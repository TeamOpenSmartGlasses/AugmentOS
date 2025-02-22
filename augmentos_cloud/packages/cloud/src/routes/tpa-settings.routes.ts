// backend/src/routes/tpa-settings.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AUGMENTOS_AUTH_JWT_SECRET } from '@augmentos/config';
import { User } from '@augmentos/cloud/src/models/user.model';

const router = express.Router();

// GET /tpasettings/:tpaName
// Header:
//   Authorization: Bearer <core-token>
router.get('/:tpaName', async (req, res) => {
  console.log('Received request for TPA settings');

  // Extract TPA name from the URL parameter.
  // If the parameter contains dot-separated values, use the third segment.
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

    // 1. Read and parse the TPA configuration file
    const configFilePath = path.join(__dirname, '..', '..', '..', 'apps', tpaName, 'tpa_config.json');
    let tpaConfig;
    try {
      const rawData = fs.readFileSync(configFilePath, 'utf8');
      tpaConfig = JSON.parse(rawData);
    } catch (err) {
      console.error('Error reading TPA config file:', err);
      return res.status(500).json({ error: 'Error reading TPA config file' });
    }

    // 2. Find or create the user based on their email
    const user = await User.findOrCreateUser(userId);
    console.log(`User found or created: ${user.email}`);
    console.log(`Current running apps: ${JSON.stringify(user.runningApps)}`);
    console.log(`Existing settings for apps: ${JSON.stringify(Object.fromEntries(user.appSettings))}`);

    // 3. Check if the user has saved settings for this TPA.
    let userSettings = user.getAppSettings(tpaName);
    if (!userSettings) {
      console.log(`No settings found for app "${tpaName}" for user ${user.email}. Saving default settings.`);
      // Build default settings from the TPA config.
      // Filter out group settings since they're only for display.
      const defaultSettings = tpaConfig.settings
        .filter((setting: any) => setting.type !== 'group')
        .map((setting: any) => ({
          ...setting,
          currentValue: setting.defaultValue  // use defaultValue from JSON (e.g. "English")
        }));
      // Save these default settings for the user.
      await user.updateAppSettings(tpaName, defaultSettings);
      userSettings = user.getAppSettings(tpaName);
      console.log(`Default settings saved for app "${tpaName}": ${JSON.stringify(userSettings)}`);
    } else {
      console.log(`Found existing settings for app "${tpaName}": ${JSON.stringify(userSettings)}`);
    }

    // 4. Return the config along with the user-specific settings.
    return res.json({
      success: true,
      userId,
      ...tpaConfig,
    });
  } catch (error) {
    console.error('Error processing TPA settings request:', error);
    return res.status(401).json({ error: 'Invalid core token or error processing request' });
  }
});

export default router;
