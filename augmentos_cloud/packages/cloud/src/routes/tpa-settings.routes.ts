// backend/src/routes/tpa-settings.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AUGMENTOS_AUTH_JWT_SECRET } from '@augmentos/config';

const router = express.Router();

// GET /tpasettings/:tpaName
// Header:
//   Authorization: Bearer <core-token>
router.get('/:tpaName', (req, res) => {
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

    // Construct the path to your TPA config file (adjust if needed)
    const configFilePath = path.join(__dirname, '..', '..', '..', 'apps', tpaName, 'tpa_config.json');

    // Read and parse the config file.
    let tpaConfig;
    try {
      const rawData = fs.readFileSync(configFilePath, 'utf8');
      tpaConfig = JSON.parse(rawData);
    } catch (err) {
      console.error('Error reading TPA config file:', err);
      return res.status(500).json({ error: 'Error reading TPA config file' });
    }

    console.log('tpaConfig', tpaConfig);

    // Return the config by flattening the response:
    // The response will have userId, name, description, version, and settings (the array) at the root.
    return res.json({
      success: true,
      userId,
      ...tpaConfig,
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ error: 'Invalid core token' });
  }
});

export default router;
