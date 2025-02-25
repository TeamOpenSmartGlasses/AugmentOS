/**
 * @fileoverview Service for managing TPAs (Third Party Applications).
 * Handles app lifecycle, authentication, and webhook interactions.
 * 
 * Currently uses in-memory storage with hardcoded system TPAs.
 * Design decision: Separate system TPAs from user-created TPAs
 * to maintain core functionality regardless of database state.
 */

import { AppI, StopWebhookRequest, TpaType, WebhookResponse } from '@augmentos/types';
import { AppState } from '@augmentos/types';
import axios, { AxiosError } from 'axios';
import { systemApps } from '@augmentos/config';


/**
 * System TPAs that are always available.
 * These are core applications provided by the platform.
 * @Param developerId - leaving this undefined indicates a system app.
 */
export const APP_STORE: AppI[] = [
  {
    packageName: systemApps.captions.packageName,
    name: systemApps.captions.name,
    tpaType: TpaType.STANDARD,
    description: "Constant Live captions from your device microphone 🗣️🎙️",
    webhookURL: `http://localhost:${systemApps.captions.port}/webhook`,
    logoURL: `https://cloud.augmentos.org/${systemApps.captions.packageName}.png`,
  },
  {
    packageName: systemApps.notify.packageName,
    name: systemApps.notify.name,
    tpaType: TpaType.BACKGROUND,
    description: "Show notifications from your device 🔔",
    webhookURL: `http://localhost:${systemApps.notify.port}/webhook`,
    logoURL: `https://cloud.augmentos.org/${systemApps.notify.packageName}.png`,
  },
  {
    packageName: systemApps.mira.packageName,
    name: systemApps.mira.name,
    tpaType: TpaType.BACKGROUND,
    description: "Mira AI, your proactive agent making all of your conversations better one insight at a time. 🚀",
    webhookURL: `http://localhost:${systemApps.mira.port}/webhook`,
    logoURL: `https://cloud.augmentos.org/${systemApps.mira.packageName}.png`,
  },
  {
    packageName: systemApps.merge.packageName,
    name: systemApps.merge.name,
    tpaType: TpaType.BACKGROUND,
    description: "Merge AI, your proactive agent making all of your conversations better one insight at a time. 🚀",
    webhookURL: `http://localhost:${systemApps.merge.port}/webhook`,
    logoURL: `https://cloud.augmentos.org/${systemApps.merge.packageName}.png`,
  }
];

// if we are not in production, add the dashboard to the app 
if (process.env.NODE_ENV !== 'production') {
  APP_STORE.push(  {
    packageName: systemApps.flash.packageName,
    name: systemApps.flash.name,
    tpaType: TpaType.BACKGROUND,
    description: "⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️",
    webhookURL: `http://localhost:${systemApps.flash.port}/webhook`,
    logoURL: `https://cloud.augmentos.org/${systemApps.flash.packageName}.png`,
  });
}

/**
 * System TPAs that are always available.
 * These are core applications provided by the platform.
 * @Param developerId - leaving this undefined indicates a system app.
 */
export const SYSTEM_TPAS: AppI[] = [
  {
    packageName: systemApps.dashboard.packageName,
    name: systemApps.dashboard.name,
    tpaType: TpaType.BACKGROUND,
    description: "The time, The news, The weather, The notifications, The everything. 😎🌍🚀",
    webhookURL: `http://localhost:${systemApps.dashboard.port}/webhook`,
    logoURL: `https://cloud.augmentos.org/${systemApps.dashboard.packageName}.png`,
  },
];

// Map systemApps to SYSTEM_TPAS.
// export const SYSTEM_TPAS: AppI[] = Object.keys(systemApps).map((key) => {
//   const app = systemApps[key as keyof typeof systemApps];

//   return {
//     packageName: systemApps[key as keyof typeof systemApps].packageName,
//     name: key,
//     description: key, // TODO(isaiah): Add descriptions
//     webhookURL: `http://localhost:${app.port}/webhook`,
//     logoURL: `https://cloud.augmentos.org/${app.packageName}.png`,
//   }
// });

/**
 * Interface for webhook payloads sent to TPAs.
 */
interface WebhookPayload {
  type: 'session_request' | 'app_update' | 'system_event';
  sessionId?: string;
  userId?: string;
  timestamp: string;
  data?: any;
}

/**
 * Interface defining the public API of the app service.
 */
export interface IAppService {
  getAllApps(): Promise<AppI[]>;
  getApp(packageName: string): Promise<AppI | undefined>;
  createApp(app: AppI): Promise<AppI>;
  triggerWebhook(url: string, payload: WebhookPayload): Promise<void>;
  triggerStopWebhook(webhookUrl: string, payload: StopWebhookRequest): Promise<{
    status: number;
    data: WebhookResponse;
  }>;
  validateApiKey(packageName: string, apiKey: string): Promise<boolean>;
  getAppState(packageName: string, userId: string): Promise<AppState>;
}

/**
 * Implementation of the app management service.
 * Design decisions:
 * 1. Separate system and user TPAs
 * 2. Immutable system TPA list
 * 3. Webhook retry logic
 * 4. API key validation
 */
export class AppService implements IAppService {
  // In-memory storage for user-created TPAs
  private userTpas: AppI[] = [];

  // In-memory cache for app states
  // Map of userId to Map of packageName to AppState
  private appStates = new Map<string, Map<string, AppState>>();

  /**
   * Gets all available TPAs, both system and user-created.
   * @returns Promise resolving to array of all apps
   */
  async getAllApps(): Promise<AppI[]> {
    return [...APP_STORE, ...this.userTpas];
  }

  /**
   * Gets available system TPAs.
   * @returns array of system apps.
   */
  getSystemApps(): AppI[] {
    return SYSTEM_TPAS;
  }

  /**
   * Gets a specific TPA by ID.
   * @param packageName - TPA identifier
   * @returns Promise resolving to app if found
   */
  async getApp(packageName: string): Promise<AppI | undefined> {
    return [...SYSTEM_TPAS, ...APP_STORE].find(app => app.packageName === packageName);
  }

  /**
   * Creates a new TPA.
   * @param app - TPA to create
   * @returns Promise resolving to created app
   * @throws If packageName already exists
   */
  async createApp(app: AppI): Promise<AppI> {
    const existingApp = await this.getApp(app.packageName);
    if (existingApp) {
      throw new Error(`App with ID ${app.packageName} already exists`);
    }

    // Validate required fields
    this.validateAppFields(app);

    this.userTpas.push(app);
    return app;
  }

  /**
   * Triggers a webhook for a TPA.
   * @param url - Webhook URL
   * @param payload - Data to send
   * @throws If webhook fails after retries
   */
  async triggerWebhook(url: string, payload: WebhookPayload): Promise<void> {
    const maxRetries = 2;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // Increase timeout to 10 seconds
        });
        return;
      } catch (error: unknown) {
        if (attempt === maxRetries - 1) {
          if (axios.isAxiosError(error)) {
            console.error(`Webhook failed: ${error}`);
            console.error(`URL: ${url}`);
            console.error(`Response: ${error.response?.data}`);
            console.error(`Status: ${error.response?.status}`);
          }
          throw new Error(`Webhook failed after ${maxRetries} attempts: ${(error as AxiosError).message || 'Unknown error'}`);
        }
        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, baseDelay * Math.pow(2, attempt))
        );
      }
    }
  }

  /**
 * Triggers the stop webhook for a TPA app session.
 * @param url - Stop Webhook URL
 * @param payload - Data to send
 * @throws If stop webhook fails
 */
  async triggerStopWebhook(webhookUrl: string, payload: StopWebhookRequest): Promise<{
    status: number;
    data: WebhookResponse;
  }> {
    try {
      const response = await axios.post(`${webhookUrl}/stop`, payload);
      return {
        status: response.status,
        data: response.data
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validates a TPA's API key.
   * @param packageName - TPA identifier
   * @param apiKey - API key to validate
   * @returns Promise resolving to validation result
   */
  async validateApiKey(packageName: string, apiKey: string): Promise<boolean> {
    const app = await this.getApp(packageName);
    if (!app) return false;

    // TODO: Implement proper API key validation
    // For now, accept all keys for development
    return true;
  }

  /**
   * Gets the current state of a TPA for a user.
   * @param packageName - TPA identifier
   * @param userId - User identifier
   * @returns Promise resolving to app state
   */
  async getAppState(packageName: string, userId: string): Promise<AppState> {
    const userStates = this.appStates.get(userId) || new Map<string, AppState>();

    // Return existing state or default to not_installed
    return userStates.get(packageName) || AppState.NOT_INSTALLED;
  }

  /**
   * Updates the state of a TPA for a user.
   * @param packageName - TPA identifier
   * @param userId - User identifier
   * @param state - New state
   * @private
   */
  private async updateAppState(packageName: string, userId: string, state: AppState): Promise<void> {
    const userStates = this.appStates.get(userId) || new Map<string, AppState>();
    userStates.set(packageName, state);
    this.appStates.set(userId, userStates);

    // Log state change
    console.log(`App ${packageName} state changed to ${state} for user ${userId}`);
  }

  /**
   * Validates required fields for a new TPA.
   * @param app - TPA to validate
   * @throws If validation fails
   * @private
   */
  private validateAppFields(app: AppI): void {
    const requiredFields: (keyof AppI)[] = [
      'packageName',
      'name',
      'webhookURL',
      'logoURL'
    ];

    for (const field of requiredFields) {
      if (!app[field]) {
        throw new Error(`Missing required field: ${String(field)}`);
      }
    }

    // Validate packageName format
    if (!app.packageName.match(/^[a-z0-9.-]+$/)) {
      throw new Error('Invalid packageName format. Use lowercase letters, numbers, dots, and hyphens only.');
    }

    // Validate URLs
    try {
      new URL(app.webhookURL);
      new URL(app.logoURL);
    } catch {
      throw new Error('Invalid webhook or logo URL');
    }
  }
}

// Create singleton instance
export const appService = new AppService();
console.log('✅ App Service');

export default appService;