// backend/src/services/subscription.service.ts
import { Subscription } from '../types/augment-os.types';

interface SubscriptionRecord {
  appId: string;
  userId: string;
  sessionId: string;
  subscriptions: Set<Subscription>;
  startTime: Date;
  lastUpdated: Date;
}

interface SubscriptionHistory {
  timestamp: Date;
  action: 'subscribe' | 'unsubscribe';
  subscription: Subscription;
}

export class SubscriptionService {
  private subscriptions = new Map<string, SubscriptionRecord>();
  private history = new Map<string, SubscriptionHistory[]>();

  // Get unique key for a subscription record
  private getKey(sessionId: string, appId: string): string {
    return `${sessionId}:${appId}`;
  }

  updateSubscriptions(
    sessionId: string,
    appId: string,
    userId: string,
    subscriptions: Subscription[]
  ) {
    const key = this.getKey(sessionId, appId);
    const existingRecord = this.subscriptions.get(key);
    const now = new Date();

    // Create history entries for changes
    if (existingRecord) {
      const newSubs = new Set(subscriptions);
      // Find subscriptions that were added
      for (const sub of newSubs) {
        if (!existingRecord.subscriptions.has(sub)) {
          this.addToHistory(key, {
            timestamp: now,
            action: 'subscribe',
            subscription: sub
          });
        }
      }
      // Find subscriptions that were removed
      for (const sub of existingRecord.subscriptions) {
        if (!newSubs.has(sub)) {
          this.addToHistory(key, {
            timestamp: now,
            action: 'unsubscribe',
            subscription: sub
          });
        }
      }
    }

    // Update or create subscription record
    this.subscriptions.set(key, {
      appId,
      userId,
      sessionId,
      subscriptions: new Set(subscriptions),
      startTime: existingRecord?.startTime || now,
      lastUpdated: now
    });

    console.log(`Updated subscriptions for ${appId} in session ${sessionId}:`, subscriptions);
  }

  private addToHistory(key: string, entry: SubscriptionHistory) {
    const appHistory = this.history.get(key) || [];
    appHistory.push(entry);
    this.history.set(key, appHistory);
  }

  getSubscribedApps(sessionId: string, subscription: Subscription): string[] {
    const subscribedApps: string[] = [];
    
    for (const [key, record] of this.subscriptions.entries()) {
      if (record.sessionId === sessionId && 
          record.subscriptions.has(subscription)) {
        subscribedApps.push(record.appId);
      }
    }

    return subscribedApps;
  }

  getAppSubscriptions(sessionId: string, appId: string): Subscription[] {
    const key = this.getKey(sessionId, appId);
    const record = this.subscriptions.get(key);
    return record ? Array.from(record.subscriptions) : [];
  }

  getSubscriptionHistory(sessionId: string, appId: string): SubscriptionHistory[] {
    const key = this.getKey(sessionId, appId);
    return this.history.get(key) || [];
  }

  removeSubscriptions(sessionId: string, appId: string) {
    const key = this.getKey(sessionId, appId);
    this.subscriptions.delete(key);
    console.log(`Removed all subscriptions for ${appId} in session ${sessionId}`);
  }

  hasSubscription(sessionId: string, appId: string, subscription: Subscription): boolean {
    const key = this.getKey(sessionId, appId);
    const record = this.subscriptions.get(key);
    return record?.subscriptions.has(subscription) || false;
  }
}

// Create singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;