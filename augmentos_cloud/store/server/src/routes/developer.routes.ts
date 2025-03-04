// routes/developer.routes.ts
import { Router, Express, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import * as appService from '../services/app.service';
import * as userService from '../services/user.service';

// Define request with user info
interface DevPortalRequest extends Request {
  developerEmail: string;
}

export function setupDevPortalRoutes(app: Express) {
  const router = Router();

  // ------------- MIDDLEWARE -------------

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
      
      if (error || !data.user || !data.user.email) {
        return res.status(401).json({ error: 'Invalid Supabase token' });
      }

      // Add developer email to request object
      (req as DevPortalRequest).developerEmail = data.user.email.toLowerCase();

      next();
    } catch (error) {
      console.error('Supabase authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // ------------- HANDLER FUNCTIONS -------------

  /**
   * Get authenticated developer user
   */
  const getAuthenticatedUser = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const user = await userService.findOrCreateUser(email);
      
      res.json({
        id: user._id,
        email: user.email,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  };

  /**
   * Get developer's Third Party Apps (TPAs)
   */
  const getDeveloperApps = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const apps = await appService.getAppsByDeveloperId(email);
      
      res.json(apps);
    } catch (error) {
      console.error('Error fetching developer TPAs:', error);
      res.status(500).json({ error: 'Failed to fetch TPAs' });
    }
  };

  /**
   * Get a specific TPA by package name
   */
  const getAppByPackageName = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const { packageName } = req.params;
      
      const tpa = await appService.getAppByPackageName(packageName, email);
      
      if (!tpa) {
        return res.status(404).json({ error: 'TPA not found' });
      }
      
      res.json(tpa);
    } catch (error) {
      console.error('Error fetching TPA:', error);
      res.status(500).json({ error: 'Failed to fetch TPA' });
    }
  };

  /**
   * Create a new TPA
   */
  const createApp = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const tpaData = req.body;
      
      // Check if TPA with this package name already exists
      const existingTpa = await appService.getAppByPackageName(tpaData.packageName);
      if (existingTpa) {
        return res.status(409).json({ 
          error: `TPA with package name '${tpaData.packageName}' already exists`
        });
      }
      
      const result = await appService.createApp(tpaData, email);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error creating TPA:', error);
      
      // Handle duplicate key error specifically
      if (error.code === 11000 && error.keyPattern?.packageName) {
        return res.status(409).json({ 
          error: `TPA with package name '${error.keyValue.packageName}' already exists`
        });
      }
      
      res.status(500).json({ error: error.message || 'Failed to create TPA' });
    }
  };

  /**
   * Update an existing TPA
   */
  const updateApp = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const { packageName } = req.params;
      const tpaData = req.body;
      
      const updatedTpa = await appService.updateApp(packageName, tpaData, email);
      
      res.json(updatedTpa);
    } catch (error: any) {
      console.error('Error updating TPA:', error);
      
      // Check for specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('permission')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update TPA' });
    }
  };

  /**
   * Delete a TPA
   */
  const deleteApp = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const { packageName } = req.params;
      
      await appService.deleteApp(packageName, email);
      
      res.status(200).json({ message: `TPA ${packageName} deleted successfully` });
    } catch (error: any) {
      console.error('Error deleting TPA:', error);
      
      // Check for specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('permission')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to delete TPA' });
    }
  };

  /**
   * Regenerate API Key for a TPA
   */
  const regenerateApiKey = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const { packageName } = req.params;
      
      const apiKey = await appService.regenerateApiKey(packageName, email);
      
      res.json({ 
        apiKey, 
        createdAt: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error('Error regenerating API key:', error);
      
      // Check for specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('permission')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to regenerate API key' });
    }
  };

  /**
   * Get shareable installation link
   */
  const getShareableLink = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const { packageName } = req.params;
      
      // Verify that developer owns this app
      const app = await appService.getAppByPackageName(packageName, email);
      if (!app) {
        return res.status(404).json({ error: 'App not found' });
      }
      
      // Generate a shareable URL (this is a simplified approach)
      const installUrl = `${process.env.APP_STORE_URL || 'https://appstore.augmentos.org'}/install/${packageName}`;
      
      res.json({ installUrl });
    } catch (error) {
      console.error('Error generating shareable link:', error);
      res.status(500).json({ error: 'Failed to generate shareable link' });
    }
  };

  /**
   * Track app sharing
   */
  const trackSharing = async (req: Request, res: Response) => {
    try {
      const email = (req as DevPortalRequest).developerEmail;
      const { packageName } = req.params;
      const { emails } = req.body;
      
      if (!Array.isArray(emails)) {
        return res.status(400).json({ error: 'Emails must be an array' });
      }
      
      // Verify that developer owns this app
      const app = await appService.getAppByPackageName(packageName, email);
      if (!app) {
        return res.status(404).json({ error: 'App not found' });
      }
      
      // In a real implementation, you would track who the app was shared with
      // For MVP, just acknowledge the request
      
      res.json({ success: true, sharedWith: emails.length });
    } catch (error) {
      console.error('Error tracking app sharing:', error);
      res.status(500).json({ error: 'Failed to track app sharing' });
    }
  };

  // ------------- ROUTES REGISTRATION -------------

  // Auth routes
  app.get('/api/dev/auth/me', validateSupabaseToken, getAuthenticatedUser);

  // Developer Portal routes
  router.get('/', validateSupabaseToken, getDeveloperApps);
  router.get('/:packageName', validateSupabaseToken, getAppByPackageName);
  router.post('/register', validateSupabaseToken, createApp);
  router.put('/:packageName', validateSupabaseToken, updateApp);
  router.delete('/:packageName', validateSupabaseToken, deleteApp);
  router.post('/:packageName/api-key', validateSupabaseToken, regenerateApiKey);
  router.get('/:packageName/share', validateSupabaseToken, getShareableLink);
  router.post('/:packageName/share', validateSupabaseToken, trackSharing);

  // Register routes
  app.use('/api/dev/apps', router);
}