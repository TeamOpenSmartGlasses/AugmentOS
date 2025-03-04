// services/app.service.ts
import crypto from 'crypto';
import App, { AppI } from '../models/app.model';
import User from '../models/user.model';

/**
 * Get public apps
 */
// export async function getPublicApps(developerEmail?: string): Promise<AppI[]> {
export async function getPublicApps(): Promise<AppI[]> {
  // console.log('Getting public apps - developerEmail', developerEmail);
  // if (developerEmail) {
  //   const developer
  //     = await User.findOne({ email: developerEmail }).lean();
  //   if (!developer) {
  //     return App.find({ isPublic: true }).lean();
  //   }
  //   else {
  //     // Find all public apps, or apps by the developer.
  //     return App.find({ $or: [{ isPublic: true }, { developerId: developer.email}] }).lean();
  //   }
  // }
  return App.find({ isPublic: true }).lean();
  // return App.find();
}

/**
 * Get all available apps
 */
export async function getAvailableApps(): Promise<AppI[]> {
  return App.find();
}

/**
 * Get apps installed by a user
 */
export async function getInstalledApps(email: string): Promise<any[]> {
  const user = await User.findOne({ email }).lean();

  if (!user || !user.installedApps || user.installedApps.length === 0) {
    return [];
  }

  // Get full details of installed apps
  const installedApps = await Promise.all(
    user.installedApps.map(async (app: any) => {
      const appDetails = await App.findOne({ packageName: app.packageName }).lean();
      if (!appDetails) return null;

      return {
        ...appDetails,
        installedDate: app.installedDate
      };
    })
  );

  // Filter out null entries (in case an app was deleted)
  return installedApps.filter(app => app !== null);
}

/**
 * Install an app for a user
 */
export async function installApp(email: string, packageName: string): Promise<void> {
  // Check if App exists
  const app = await App.findOne({ packageName });
  if (!app) {
    throw new Error(`App with package name ${packageName} not found`);
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`User with ID ${email} not found`);
  }

  // Check if installedApps exists, if not create it
  if (!user.installedApps) {
    user.installedApps = [];
  }

  // Check if already installed
  const alreadyInstalled = user.installedApps.some(
    app => app.packageName === packageName
  );

  if (!alreadyInstalled) {
    // Add to user's installed apps
    user.installedApps.push({
      packageName,
      installedDate: new Date()
    });
    await user.save();
  }
}

/**
 * Uninstall an app for a user
 */
export async function uninstallApp(email: string, packageName: string): Promise<void> {
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`User with ID ${email} not found`);
  }

  // If installedApps doesn't exist, nothing to do
  if (!user.installedApps) {
    return;
  }

  // Remove from user's installed apps
  user.installedApps = user.installedApps.filter(
    app => app.packageName !== packageName
  );
  await user.save();
}

/**
 * Get apps by developer ID
 */
export async function getAppsByDeveloperId(developerId: string): Promise<AppI[]> {
  return App.find({ developerId }).lean();
}

/**
 * Get app by package name
 */
export async function getAppByPackageName(packageName: string, developerId?: string): Promise<AppI | null> {
  const query: any = { packageName };

  // If developerId is provided, ensure the app belongs to this developer
  if (developerId) {
    query.developerId = developerId;
  }

  return App.findOne(query).lean();
}

/**
 * Create a new app
 */
export async function createApp(appData: any, developerId: string): Promise<{ app: AppI, apiKey: string }> {
  // Generate API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  const hashedApiKey = hashApiKey(apiKey);

  // Create app
  const app = await App.create({
    ...appData,
    developerId,
    hashedApiKey
  });

  return { app, apiKey };
}

/**
 * Update an app
 */
export async function updateApp(packageName: string, appData: any, developerId: string): Promise<AppI> {
  // Ensure developer owns the app
  const app = await App.findOne({ packageName });

  if (!app) {
    throw new Error(`App with package name ${packageName} not found`);
  }

  if (!developerId) {
    throw new Error('Developer ID is required');
  }

  if (!app.developerId) {
    throw new Error('Developer ID not found for this app');
  }

  if (app.developerId.toString() !== developerId) {
    throw new Error('You do not have permission to update this app');
  }

  // Update app
  const updatedApp = await App.findOneAndUpdate(
    { packageName },
    { $set: appData },
    { new: true }
  );

  return updatedApp!;
}

/**
 * Delete an app
 */
export async function deleteApp(packageName: string, developerId: string): Promise<void> {
  // Ensure developer owns the app
  const app = await App.findOne({ packageName });

  if (!app) {
    throw new Error(`App with package name ${packageName} not found`);
  }

  if (!developerId) {
    throw new Error('Developer ID is required');
  }

  if (!app.developerId) {
    throw new Error('Developer ID not found for this app');
  }


  if (app.developerId.toString() !== developerId) {
    throw new Error('You do not have permission to delete this app');
  }

  await App.findOneAndDelete({ packageName });
}

/**
 * Regenerate API key for an app
 */
export async function regenerateApiKey(packageName: string, developerId: string): Promise<string> {
  // Ensure developer owns the app
  const app = await App.findOne({ packageName });

  if (!app) {
    throw new Error(`App with package name ${packageName} not found`);
  }

  if (!developerId) {
    throw new Error('Developer ID is required');
  }

  if (!app.developerId) {
    throw new Error('Developer ID not found for this app');
  }

  if (app.developerId.toString() !== developerId) {
    throw new Error('You do not have permission to update this app');
  }

  // Generate new API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  const hashedApiKey = hashApiKey(apiKey);

  // Update app with new hashed API key
  await App.findOneAndUpdate(
    { packageName },
    { $set: { hashedApiKey } }
  );

  return apiKey;
}

/**
 * Hash API key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// You can also export everything as a single object if preferred
export const AppService = {
  getPublicApps,
  getAvailableApps,
  getInstalledApps,
  installApp,
  uninstallApp,
  getAppsByDeveloperId,
  getAppByPackageName,
  createApp,
  updateApp,
  deleteApp,
  regenerateApiKey,
  hashApiKey
};