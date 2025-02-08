// backend/src/services/display.service.ts
import { Layout } from '../types';
import userSessionService from './session.service';

interface DisplayRecord {
  layout: Layout;
  timestamp: Date;
  durationMs?: number;
  appId: string;
  sessionId: string;
}

export class DisplayService {
  private displayHistory = new Map<string, DisplayRecord[]>();

  // Get unique key for history tracking
  private getKey(sessionId: string, appId: string): string {
    return `${sessionId}:${appId}`;
  }

  async handleDisplayEvent(
    sessionId: string,
    appId: string,
    layout: Layout,
    durationMs?: number
  ): Promise<boolean> {
    try {
      // Record the display event
      const record: DisplayRecord = {
        layout,
        timestamp: new Date(),
        durationMs,
        appId,
        sessionId
      };

      // Add to history
      const key = this.getKey(sessionId, appId);
      const history = this.displayHistory.get(key) || [];
      history.push(record);
      this.displayHistory.set(key, history);

      // Send to user session
      await userSessionService.updateDisplay(sessionId, layout, durationMs);

      console.log(`Display event handled for ${appId} in session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error handling display event:', error);
      return false;
    }
  }

  getDisplayHistory(sessionId: string, appId: string): DisplayRecord[] {
    const key = this.getKey(sessionId, appId);
    return this.displayHistory.get(key) || [];
  }

  getRecentDisplays(sessionId: string, limit = 10): DisplayRecord[] {
    const allRecords: DisplayRecord[] = [];
    
    // Collect all records for this session
    for (const records of this.displayHistory.values()) {
      allRecords.push(...records.filter(r => r.sessionId === sessionId));
    }

    // Sort by timestamp and return most recent
    return allRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clearHistory(sessionId: string, appId: string) {
    const key = this.getKey(sessionId, appId);
    this.displayHistory.delete(key);
    console.log(`Cleared display history for ${appId} in session ${sessionId}`);
  }

  // Optional: Add methods for analytics
  getDisplayStats(sessionId: string, appId: string) {
    const history = this.getDisplayHistory(sessionId, appId);
    return {
      totalDisplays: history.length,
      averageDuration: history.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) / history.length,
      lastDisplay: history[history.length - 1]?.timestamp
    };
  }
}

// Create singleton instance
export const displayService = new DisplayService();
export default displayService;