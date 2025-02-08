/**
 * @fileoverview Service for managing AR display state and history.
 * Handles display updates, queuing, history tracking, and analytics.
 * 
 * Primary responsibilities:
 * - Managing display state
 * - Priority-based display queue
 * - Display history tracking
 * - Display analytics
 * - TPA display coordination
 */

import { Layout } from '../../types';
import { ISessionService } from '../core/session.service';
import sessionService from '../core/session.service';

/**
 * Priority levels for display updates.
 * Higher priority displays can interrupt lower priority ones.
 */
export enum DisplayPriority {
  LOW = 0,      // Background info, non-critical updates
  MEDIUM = 1,   // Standard app displays
  HIGH = 2,     // Important notifications
  CRITICAL = 3  // System alerts, errors
}

/**
 * Record of a display event for history tracking.
 */
interface DisplayRecord {
  layout: Layout;
  timestamp: Date;
  durationMs?: number;
  appId: string;
  sessionId: string;
  priority: DisplayPriority;
  interrupted?: boolean;  // Whether this display was interrupted
}

/**
 * Queued display item waiting to be shown.
 */
interface QueuedDisplay {
  record: DisplayRecord;
  expiresAt?: Date;     // Optional expiration for time-sensitive displays
  callback?: (shown: boolean) => void;  // Optional callback when display is shown/expired
}

/**
 * Active display state for a session.
 */
interface ActiveDisplay {
  record: DisplayRecord;
  startedAt: Date;
  endsAt?: Date;
}

/**
 * Configuration for display history.
 */
interface DisplayConfig {
  maxHistoryPerSession: number;  // Maximum history entries per session
  maxQueueSize: number;         // Maximum queued displays per session
  defaultDurationMs: number;    // Default display duration if none specified
}

/**
 * Interface defining the public API of the display service.
 */
export interface IDisplayService {
  handleDisplayEvent(
    sessionId: string,
    appId: string,
    layout: Layout,
    priority?: DisplayPriority,
    durationMs?: number
  ): Promise<boolean>;
  getDisplayHistory(sessionId: string, appId: string): DisplayRecord[];
  getRecentDisplays(sessionId: string, limit?: number): DisplayRecord[];
  clearHistory(sessionId: string, appId: string): void;
  getDisplayStats(sessionId: string, appId: string): DisplayStats;
}

/**
 * Statistics for display analytics.
 */
interface DisplayStats {
  totalDisplays: number;
  averageDuration: number;
  lastDisplay?: Date;
  interruptionRate: number;  // Percentage of displays that were interrupted
  byPriority: {
    [key in DisplayPriority]: number;
  };
}

/**
 * Implementation of the display management service.
 * Design decisions:
 * 1. Priority-based display queue
 * 2. Support for display interruption by higher priority items
 * 3. Per-session display state tracking
 * 4. Comprehensive history and analytics
 */
export class DisplayService implements IDisplayService {
  private readonly config: DisplayConfig = {
    maxHistoryPerSession: 1000,
    maxQueueSize: 100,
    defaultDurationMs: 3000
  };

  private displayHistory = new Map<string, DisplayRecord[]>();
  private displayQueues = new Map<string, QueuedDisplay[]>();
  private activeDisplays = new Map<string, ActiveDisplay>();

  constructor(private readonly sessionService: ISessionService) {}

  /**
   * Handles a new display event from a TPA.
   * @param sessionId - Session identifier
   * @param appId - TPA identifier
   * @param layout - Display layout
   * @param priority - Display priority (defaults to MEDIUM)
   * @param durationMs - Display duration
   * @returns Promise resolving to success status
   */
  async handleDisplayEvent(
    sessionId: string,
    appId: string,
    layout: Layout,
    priority: DisplayPriority = DisplayPriority.MEDIUM,
    durationMs: number = this.config.defaultDurationMs
  ): Promise<boolean> {
    try {
      // Validate session and layout
      if (!this.sessionService.getSession(sessionId)) {
        throw new Error(`Invalid session: ${sessionId}`);
      }
      this.validateLayout(layout);

      // Create display record
      const record: DisplayRecord = {
        layout,
        timestamp: new Date(),
        durationMs,
        appId,
        sessionId,
        priority
      };

      // Add to history
      await this.addToHistory(record);

      // Handle display update based on priority
      await this.handleDisplayUpdate(record);

      return true;
    } catch (error) {
      console.error('Error handling display event:', error);
      return false;
    }
  }

  /**
   * Gets display history for a specific TPA.
   * @param sessionId - Session identifier
   * @param appId - TPA identifier
   * @returns Array of display records
   */
  getDisplayHistory(sessionId: string, appId: string): DisplayRecord[] {
    const key = this.getKey(sessionId, appId);
    return this.displayHistory.get(key) || [];
  }

  /**
   * Gets recent displays for a session.
   * @param sessionId - Session identifier
   * @param limit - Maximum number of records to return
   * @returns Array of recent display records
   */
  getRecentDisplays(sessionId: string, limit = 10): DisplayRecord[] {
    const allRecords: DisplayRecord[] = [];
    
    for (const records of this.displayHistory.values()) {
      allRecords.push(...records.filter(r => r.sessionId === sessionId));
    }

    return allRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clears display history for a TPA.
   * @param sessionId - Session identifier
   * @param appId - TPA identifier
   */
  clearHistory(sessionId: string, appId: string): void {
    const key = this.getKey(sessionId, appId);
    this.displayHistory.delete(key);
    console.log(`Cleared display history for ${appId} in session ${sessionId}`);
  }

  /**
   * Gets display statistics for a TPA.
   * @param sessionId - Session identifier
   * @param appId - TPA identifier
   * @returns Display statistics
   */
  getDisplayStats(sessionId: string, appId: string): DisplayStats {
    const history = this.getDisplayHistory(sessionId, appId);
    if (history.length === 0) {
      return {
        totalDisplays: 0,
        averageDuration: 0,
        interruptionRate: 0,
        byPriority: {
          [DisplayPriority.LOW]: 0,
          [DisplayPriority.MEDIUM]: 0,
          [DisplayPriority.HIGH]: 0,
          [DisplayPriority.CRITICAL]: 0
        }
      };
    }

    const byPriority = history.reduce((acc, curr) => {
      acc[curr.priority] = (acc[curr.priority] || 0) + 1;
      return acc;
    }, {} as { [key in DisplayPriority]: number });

    return {
      totalDisplays: history.length,
      averageDuration: history.reduce((acc, curr) => 
        acc + (curr.durationMs || 0), 0) / history.length,
      lastDisplay: history[history.length - 1].timestamp,
      interruptionRate: history.filter(r => r.interrupted).length / history.length,
      byPriority: {
        [DisplayPriority.LOW]: byPriority[DisplayPriority.LOW] || 0,
        [DisplayPriority.MEDIUM]: byPriority[DisplayPriority.MEDIUM] || 0,
        [DisplayPriority.HIGH]: byPriority[DisplayPriority.HIGH] || 0,
        [DisplayPriority.CRITICAL]: byPriority[DisplayPriority.CRITICAL] || 0
      }
    };
  }

  /**
   * Gets key for storage lookups.
   * @param sessionId - Session identifier
   * @param appId - TPA identifier
   * @returns Storage key
   * @private
   */
  private getKey(sessionId: string, appId: string): string {
    return `${sessionId}:${appId}`;
  }

  /**
   * Adds a display record to history.
   * @param record - Display record to add
   * @private
   */
  private async addToHistory(record: DisplayRecord): Promise<void> {
    const key = this.getKey(record.sessionId, record.appId);
    const history = this.displayHistory.get(key) || [];
    
    history.push(record);

    // Trim history if needed
    if (history.length > this.config.maxHistoryPerSession) {
      history.splice(0, history.length - this.config.maxHistoryPerSession);
    }

    this.displayHistory.set(key, history);
  }

  /**
   * Handles a new display update.
   * @param record - Display record to handle
   * @private
   */
  private async handleDisplayUpdate(record: DisplayRecord): Promise<void> {
    const activeDisplay = this.activeDisplays.get(record.sessionId);

    // If no active display or new display has higher priority
    if (!activeDisplay || record.priority > activeDisplay.record.priority) {
      if (activeDisplay) {
        activeDisplay.record.interrupted = true;
        await this.addToHistory(activeDisplay.record);
      }
      
      await this.showDisplay(record);
    } else {
      // Queue the display
      await this.queueDisplay(record);
    }
  }

  /**
   * Shows a display immediately.
   * @param record - Display record to show
   * @private
   */
  private async showDisplay(record: DisplayRecord): Promise<void> {
    const activeDisplay: ActiveDisplay = {
      record,
      startedAt: new Date(),
      endsAt: record.durationMs ? 
        new Date(Date.now() + record.durationMs) : 
        undefined
    };

    this.activeDisplays.set(record.sessionId, activeDisplay);
    await this.sessionService.updateDisplay(
      record.sessionId,
      record.layout,
      record.durationMs
    );

    // Schedule next display if duration is set
    if (record.durationMs) {
      setTimeout(() => {
        this.processNextDisplay(record.sessionId);
      }, record.durationMs);
    }
  }

  /**
   * Queues a display for later showing.
   * @param record - Display record to queue
   * @private
   */
  private async queueDisplay(record: DisplayRecord): Promise<void> {
    const queue = this.displayQueues.get(record.sessionId) || [];
    
    if (queue.length >= this.config.maxQueueSize) {
      // Remove lowest priority items if queue is full
      const lowestPriority = Math.min(
        ...queue.map(item => item.record.priority)
      );
      
      if (record.priority > lowestPriority) {
        const index = queue.findIndex(
          item => item.record.priority === lowestPriority
        );
        if (index !== -1) {
          queue.splice(index, 1);
        }
      } else {
        return; // Drop new display if lower priority
      }
    }

    queue.push({
      record,
      expiresAt: record.durationMs ? 
        new Date(Date.now() + record.durationMs * 2) : // Double duration for expiry
        undefined
    });

    // Sort queue by priority
    queue.sort((a, b) => b.record.priority - a.record.priority);
    this.displayQueues.set(record.sessionId, queue);
  }

  /**
   * Processes the next display in queue.
   * @param sessionId - Session identifier
   * @private
   */
  private async processNextDisplay(sessionId: string): Promise<void> {
    const queue = this.displayQueues.get(sessionId) || [];
    if (queue.length === 0) return;

    // Remove expired items
    const now = new Date();
    while (queue.length > 0 && 
           queue[0].expiresAt && 
           queue[0].expiresAt < now) {
      const expired = queue.shift();
      if (expired?.callback) {
        expired.callback(false);
      }
    }

    if (queue.length === 0) return;

    const next = queue.shift();
    if (next) {
      await this.showDisplay(next.record);
      if (next.callback) {
        next.callback(true);
      }
    }

    this.displayQueues.set(sessionId, queue);
  }

  /**
   * 🧐 Validates a layout before display.
   * @param layout - Layout to validate
   * @throws If layout is invalid
   * @private
   */
  private validateLayout(layout: Layout): void {
    // Add layout validation logic here
    if (!layout || !layout.layoutType) {
      throw new Error('Invalid layout: missing required fields');
    }
    
    // Add specific validation per layout type
    switch (layout.layoutType) {
      case 'text_wall':
        if (!layout.text) throw new Error('Text wall requires text content');
        break;
      case 'text_rows':
        if (!Array.isArray(layout.text)) throw new Error('Text rows requires array of text');
        break;
      case 'text_line':
        if (!layout.text) throw new Error('Text line requires text content');
        break;
      case 'reference_card':
        if (!layout.title || !layout.text) throw new Error('Reference card requires title and text');
        break;
      default:
        throw new Error(`Unknown layout type: ${(layout as any).layoutType}`);
    }
  }
}

// Create DisplayService singleton instance.
export const displayService = new DisplayService(sessionService);
console.log('✅ Display Service');

export default displayService;