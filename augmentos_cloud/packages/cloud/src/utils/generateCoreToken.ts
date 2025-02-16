import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { AUGMENTOS_AUTH_JWT_SECRET, SUPABASE_JWT_SECRET } from '../env';

export function generateCoreToken(email: string = "joe@mamas.house", sub: string ="1234567890"): string {
    const newData = { sub, email };

    // Generate your own custom token (JWT or otherwise)
    const coreToken = jwt.sign(newData, AUGMENTOS_AUTH_JWT_SECRET);

    return coreToken;
}

export default generateCoreToken;