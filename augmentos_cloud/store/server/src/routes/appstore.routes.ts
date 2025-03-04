// routes/appstore.routes.ts
import { Router, Express, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import * as appService from '../services/app.service';
import * as userService from '../services/user.service';

// Define request with user info
interface AppStoreRequest extends Request {
  userEmail: string;
}

export function setupAppRoutes(app: Express, secretKey: string) {
  const router = Router();

  // ------------- MIDDLEWARE -------------

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
      (req as AppStoreRequest).userEmail = data.user.email.toLowerCase();

      next();
    } catch (error) {
      console.error('Supabase authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  // ------------- HANDLER FUNCTIONS -------------

  /**
   * Get all public apps
   * Public endpoint - no authentication required
   */
  const getPublicApps = async (req: Request, res: Response) => {
    try {
      const apps = await appService.getPublicApps();

      // Return the apps with success flag
      res.json({
        success: true,
        data: apps
      });
    } catch (error) {
      console.error('Error fetching public apps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch public apps'
      });
    }
  };

  /**
   * Get all available apps (for authenticated users)
   */
  const getAvailableApps = async (req: Request, res: Response) => {
    try {
      const apps = await appService.getAvailableApps();

      // Return the apps with success flag
      res.json({
        success: true,
        data: apps
      });
    } catch (error) {
      console.error('Error fetching available apps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available apps'
      });
    }
  };

  /**
   * Get user's installed apps
   */
  const getInstalledApps = async (req: Request, res: Response) => {
    try {
      const email = (req as AppStoreRequest).userEmail;

      // Find or create user by email
      const user = await userService.findOrCreateUser(email);

      // Get installed apps
      const installedApps = await appService.getInstalledApps(user.email);

      res.json({
        success: true,
        data: installedApps
      });
    } catch (error) {
      console.error('Error fetching installed apps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch installed apps'
      });
    }
  };

  /**
   * Get app details by package name
   * Public endpoint - no authentication required
   */
  const getAppDetails = async (req: Request, res: Response) => {
    try {
      const { packageName } = req.params;

      // Get app details
      const app = await appService.getAppByPackageName(packageName);

      if (!app) {
        return res.status(404).json({
          success: false,
          message: `App with package name ${packageName} not found`
        });
      }

      res.json({
        success: true,
        data: app
      });
    } catch (error) {
      console.error('Error fetching app details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch app details'
      });
    }
  };

  /**
   * Install an app for the current user
   */
  const installApp = async (req: Request, res: Response) => {
    try {
      const email = (req as AppStoreRequest).userEmail;
      const { packageName } = req.body;

      if (!packageName) {
        return res.status(400).json({
          success: false,
          message: 'Package name is required'
        });
      }

      // Find or create user by email
      const user = await userService.findOrCreateUser(email);

      // Install the app
      await appService.installApp(user.email, packageName);

      res.json({
        success: true,
        message: `App ${packageName} installed successfully`
      });
    } catch (error: any) {
      console.error('Error installing app:', error);

      // Handle specific errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to install app'
      });
    }
  };

  /**
   * Uninstall an app for the current user
   */
  const uninstallApp = async (req: Request, res: Response) => {
    try {
      const email = (req as AppStoreRequest).userEmail;
      const { packageName } = req.body;

      if (!packageName) {
        return res.status(400).json({
          success: false,
          message: 'Package name is required'
        });
      }

      // Find or create user by email
      const user = await userService.findOrCreateUser(email);

      // Uninstall the app
      await appService.uninstallApp(user.email, packageName);

      res.json({
        success: true,
        message: `App ${packageName} uninstalled successfully`
      });
    } catch (error: any) {
      console.error('Error uninstalling app:', error);

      // Handle specific errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to uninstall app'
      });
    }
  };

  /**
   * Search for apps
   * Public endpoint - no authentication required
   */
  const searchApps = async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      // For now, just return public apps (you can implement actual search later)
      const apps = await appService.getPublicApps();

      // Simple filtering - you might want to implement more sophisticated search
      const searchResults = apps.filter(app =>
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        (app.description && app.description.toLowerCase().includes(query.toLowerCase()))
      );

      res.json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      console.error('Error searching apps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search apps'
      });
    }
  };

  /**
   * Get authenticated user info
   */
  const getCurrentUser = async (req: Request, res: Response) => {
    try {
      const email = (req as AppStoreRequest).userEmail;

      // Find or create user by email
      const user = await userService.findOrCreateUser(email);

      res.json({
        success: true,
        data: {
          id: user._id,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data'
      });
    }
  };

  // ------------- ROUTES REGISTRATION -------------



  // Authenticated routes (require Supabase auth)
  router.get('/available', getAvailableApps);
  router.get('/installed', validateSupabaseToken, getInstalledApps);
  router.post('/install', validateSupabaseToken, installApp);
  router.post('/uninstall', validateSupabaseToken, uninstallApp);

  // Public routes (no auth required)
  router.get('/public', getPublicApps);
  router.get('/search', searchApps);
  router.get('/:packageName', getAppDetails);

  // User routes
  app.get('/api/user/me', validateSupabaseToken, getCurrentUser);

  // Register routes
  app.use('/api/apps', router);
}