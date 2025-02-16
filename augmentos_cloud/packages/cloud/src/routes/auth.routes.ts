//backend/src/routes/apps.ts
import express from 'express';

import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { AUGMENTOS_AUTH_JWT_SECRET, SUPABASE_JWT_SECRET } from '../env';

const router = express.Router();

//const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

router.post('/exchange-token', async (req: Request, res: Response) => {
  const { supabaseToken } = req.body;
  if (!supabaseToken) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    console.log("\n\n\n\n\nDECODING THE JSON SECRET THINGAMABOB \n\n\n\n");
    // Verify the token using your Supabase JWT secret
    const decoded = jwt.verify(supabaseToken, SUPABASE_JWT_SECRET);
    const subject = decoded.sub;
    // `decoded` will contain the user’s claims from Supabase
    // e.g. user ID, role, expiration, etc.

    const newData = {
        sub: subject,
        email: (decoded as jwt.JwtPayload).email,
    }

    // Generate your own custom token (JWT or otherwise)
    const coreToken = jwt.sign(newData, AUGMENTOS_AUTH_JWT_SECRET);

    return res.json({ coreToken });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;