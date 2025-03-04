import { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../utils/supabase';

// Define request with user info
export interface UserRequest extends Request {
  email: string;
}

/**
 * Middleware to validate Supabase token
 */
const validateSupabaseToken = async (req: Request, res: Response, next: NextFunction) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user || !data.user.email) {

      return res.status(401).json({
        success: false,
        message: 'Invalid Supabase token'
      });
    }

    // Add user email to request object
    (req as UserRequest).email = data.user.email.toLowerCase();

    next();
  } catch (error) {
    console.error('Supabase authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
