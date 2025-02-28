// routes/apps.ts
import { Router, Express, Request, Response, NextFunction } from 'express';
import { validateToken } from '@augmentos/sdk';
import { AppService } from '../services/app.service';
import { UserService } from '../services/user.service';
import { supabaseAdmin } from '../utils/supabase';

// Define new request for express app with user info
interface AugmentOSRequest extends Request {
  user: {
    userId: string;
    sessionId: string;
    email?: string;
  };
}

/**
 * Set up App Store API routes
 */
export function setupAppRoutes(app: Express, secretKey: string) {
  const router = Router();


  // ------------- MIDDLEWARE -------------

  /**
   * Middleware to validate TPA token
   */
  const validateTpaToken = (req: Request, res: Response, next: NextFunction) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const result = validateToken(token, secretKey);

    if (!result.valid || !result.payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Add user info to request object
    (req as AugmentOSRequest).user = {
      userId: result.payload.userId,
      sessionId: result.payload.sessionId
    };

    next();
  };

  /**
   * Middleware to validate Supabase token
   */
  const validateSupabaseToken = async (req: Request, res: Response, next: NextFunction) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token with Supabase
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !data?.user.email) {
        return res.status(401).json({ error: 'Invalid Supabase token' });
      }

      // Find or create user in our database
      const user = await UserService.findOrCreateUser(data.user.email);

      // Add user info to request object
      const augmentOSReq = req as AugmentOSRequest;
      (req as AugmentOSRequest).user = {
        userId: user.id,
        sessionId: '', // Express session ID if available
        email: user.email
      };

      next();
    } catch (error) {
      console.error('Supabase authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // ------------- HANDLER FUNCTIONS -------------

  /**
   * Get public apps (no auth required)
   */
  const getPublicApps = async (req: Request, res: Response) => {
    try {
      const publicApps = await AppService.getPublicApps();
      res.json({ apps: publicApps });
    } catch (error) {
      console.error('Error fetching public apps:', error);
      res.status(500).json({ error: 'Failed to fetch public apps' });
    }
  };

  /**
   * Get available apps for authenticated users
   */
  const getAvailableApps = async (req: Request, res: Response) => {
    try {
      const availableApps = await AppService.getAvailableApps();
      res.json({ apps: availableApps });
    } catch (error) {
      console.error('Error fetching available apps:', error);
      res.status(500).json({ error: 'Failed to fetch available apps' });
    }
  };

  /**
   * Get user's installed apps
   */
  const getInstalledApps = async (req: Request, res: Response) => {
    try {
      const user = (req as AugmentOSRequest).user;
      const installedApps = await AppService.getInstalledApps(user.userId);
      res.json({ apps: installedApps });
    } catch (error) {
      console.error('Error fetching installed apps:', error);
      res.status(500).json({ error: 'Failed to fetch installed apps' });
    }
  };

  /**
   * Install an app for a user
   */
  const installApp = async (req: Request, res: Response) => {
    try {
      const { packageName } = req.body;
      const user = (req as AugmentOSRequest).user;

      if (!packageName) {
        return res.status(400).json({ error: 'Package name is required' });
      }

      await AppService.installApp(user.userId, packageName);

      res.json({
        success: true,
        message: `App ${packageName} installed successfully`
      });
    } catch (error) {
      console.error('Error installing app:', error);
      res.status(500).json({ error: 'Failed to install app' });
    }
  };

  /**
   * Uninstall an app for a user
   */
  const uninstallApp = async (req: Request, res: Response) => {
    try {
      const { packageName } = req.body;
      const user = (req as AugmentOSRequest).user;

      if (!packageName) {
        return res.status(400).json({ error: 'Package name is required' });
      }

      await AppService.uninstallApp(user.userId, packageName);

      res.json({
        success: true,
        message: `App ${packageName} uninstalled successfully`
      });
    } catch (error) {
      console.error('Error uninstalling app:', error);
      res.status(500).json({ error: 'Failed to uninstall app' });
    }
  };

  /**
   * Supabase authentication for Developer Portal
   */
  const authMe = async (req: Request, res: Response) => {
    // User info already added by middleware
    const user = (req as AugmentOSRequest).user;
    if (!user.email) {
      return res.status(401).json({ error: 'User email not found' });
    }
    const userData = await UserService.getUserByEmail(user.email);
    
    res.json(userData);
  };

  // ------------- ROUTES REGISTRATION -------------

  // Public routes (no auth required)
  router.get('/public', getPublicApps);
  
  // Developer Portal routes (Supabase auth)
  router.get('/developer', validateSupabaseToken, authMe);
  
  // App Store routes (TPA token auth)
  router.get('/available', validateTpaToken, getAvailableApps);
  router.get('/installed', validateTpaToken, getInstalledApps);
  router.post('/install', validateTpaToken, installApp);
  router.post('/uninstall', validateTpaToken, uninstallApp);

  // Register routes
  app.use('/api/apps', router);
  
  // Add authentication endpoint
  app.get('/api/auth/me', validateSupabaseToken, authMe);
}