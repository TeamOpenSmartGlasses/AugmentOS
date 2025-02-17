// backend/src/routes/tpa-settings.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import { AUGMENTOS_AUTH_JWT_SECRET } from '@augmentos/types/config/cloud.env';

const router = express.Router();

// GET /tpa-settings
// Header:
//   Authorization: Bearer <core-token>
router.get('/tpasettings', (req, res) => {
  console.log('Received request for TPA settings');
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  // Expect header in the format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }
  
  const coreToken = parts[1];

  try {
    // Validate the core token
    const decoded = jwt.verify(coreToken, AUGMENTOS_AUTH_JWT_SECRET) as jwt.JwtPayload;
    
    // For example, extract the user id (email) from the token
    const userId = decoded.email;
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing in token' });
    }
    
    // Create a settings object. You can modify these settings as needed.
    const settings = {
      userId,
      theme: 'dark',
      notifications: true,
      // Add any additional settings here.
    };

    return res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ error: 'Invalid core token' });
  }
});

export default router;
