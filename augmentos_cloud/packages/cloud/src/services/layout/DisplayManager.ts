// augmentos_cloud/packages/cloud/src/services/layout/DisplayManager.ts

import { systemApps } from '@augmentos/config';
import { ActiveDisplay, Layout, DisplayRequest, DisplayManagerI, UserSession } from '@augmentos/types';
import { WebSocket } from 'ws';

interface DisplayLock {
  packageName: string;
  acquiredAt: Date;
  expiresAt: Date | null;  // null for duration-based expiry
  lastDisplayTime: number; // For tracking 10s timeout
}

interface ThrottledRequest {
  displayRequest: DisplayRequest;
  userSession: UserSession;
}

interface DisplayStack {
  [packageName: string]: ActiveDisplay;
}

type ViewName = "dashboard" | string;

class DisplayManager implements DisplayManagerI {
  // Existing properties
  private displayHistory: DisplayRequest[] = [];
  private activeDisplays = new Map<ViewName, DisplayStack>();
  private currentMainApp: string | null = null;
  private lastSentTimeMain: number = 0;
  private pendingDisplayRequestMain: ThrottledRequest | null = null;
  private readonly displayDebounceDelay = 200;
  private bootingTimeoutId: NodeJS.Timeout | null = null;
  private readonly BOOTING_SCREEN_DURATION = 2000;
  private isShowingBootScreen = false;
  private bootingApps: string[] = [];
  private userSession: UserSession | null = null;

  // New properties for main/background app management
  private mainApp: string | null = null;
  private displayLock: DisplayLock | null = null;
  private readonly LOCK_TIMEOUT = 10000; // 10 seconds
  private lockTimeoutId: NodeJS.Timeout | null = null;

  // Public methods for main app management
  public setMainApp(packageName: string | null): void {
    this.mainApp = packageName;
  }

  public getMainApp(): string | null {
    return this.mainApp;
  }


  // Enhanced handleDisplayEvent
  public async handleDisplayEvent(displayRequest: DisplayRequest, userSession: UserSession): Promise<boolean> {
    this.userSession = userSession;
    const { view, packageName, durationMs } = displayRequest;

    // Boot screen always has highest priority
    if (this.isShowingBootScreen && packageName !== 'system') {
      this.addToDisplayStack(view, displayRequest);
      return false;
    }

    // Dashboard and system messages bypass all locks/throttling
    if (view === "dashboard" || packageName === 'system' ||
      packageName === systemApps.dashboard.packageName) {
      return this.sendDisplay(displayRequest);
    }

    // Handle display lock logic
    if (this.displayLock) {
      if (this.displayLock.packageName !== packageName) {
        // Another app has the lock, queue the request
        this.addToDisplayStack(view, displayRequest);
        return false;
      }
      // Extend the lock for the current holder
      this.updateDisplayLock(packageName, durationMs);
    } else if (packageName !== this.mainApp) {
      // New background app display, acquire lock
      this.acquireDisplayLock(packageName, durationMs);
    }

    // Apply normal throttling
    if (this.shouldThrottleMain()) {
      this.addToDisplayStack(view, displayRequest);
      if (this.pendingDisplayRequestMain?.displayRequest.packageName === packageName) {
        this.pendingDisplayRequestMain = { displayRequest, userSession };
      }
      this.scheduleDisplayMain();
      return false;
    }

    // Add to display stack and show
    this.addToDisplayStack(view, displayRequest);
    return this.sendDisplay(displayRequest);
  }

  // Lock management
  private acquireDisplayLock(packageName: string, duration?: number): void {
    if (this.lockTimeoutId) {
      clearTimeout(this.lockTimeoutId);
    }

    this.displayLock = {
      packageName,
      acquiredAt: new Date(),
      expiresAt: duration ? new Date(Date.now() + duration) : null,
      lastDisplayTime: Date.now()
    };

    // Set timeout for lock expiration
    this.scheduleLockExpiration();
  }

  private updateDisplayLock(packageName: string, duration?: number): void {
    if (!this.displayLock || this.displayLock.packageName !== packageName) return;

    this.displayLock.lastDisplayTime = Date.now();
    if (duration) {
      this.displayLock.expiresAt = new Date(Date.now() + duration);
    }

    // Reset timeout
    this.scheduleLockExpiration();
  }

  private scheduleLockExpiration(): void {
    if (this.lockTimeoutId) {
      clearTimeout(this.lockTimeoutId);
    }

    this.lockTimeoutId = setTimeout(() => {
      if (!this.displayLock) return;

      const now = Date.now();
      const timeSinceLastDisplay = now - this.displayLock.lastDisplayTime;

      if (timeSinceLastDisplay >= this.LOCK_TIMEOUT ||
        (this.displayLock.expiresAt && this.displayLock.expiresAt.getTime() <= now)) {
        this.releaseDisplayLock();
      }
    }, Math.min(this.LOCK_TIMEOUT,
      this.displayLock?.expiresAt ?
        this.displayLock.expiresAt.getTime() - Date.now() :
        this.LOCK_TIMEOUT));
  }

  private releaseDisplayLock(): void {
    if (this.lockTimeoutId) {
      clearTimeout(this.lockTimeoutId);
      this.lockTimeoutId = null;
    }

    this.displayLock = null;

    // Show next priority display
    this.showNextPriorityDisplay('main');
  }


  // // Public API
  // public async handleDisplayEvent(displayRequest: DisplayRequest, userSession: UserSession): Promise<boolean> {
  //   this.userSession = userSession;
  //   const { view, packageName } = displayRequest;

  //   // If boot screen is active, queue non-system requests
  //   if (this.isShowingBootScreen && packageName !== 'system') {
  //     this.addToDisplayStack(view, displayRequest);
  //     return false;
  //   }

  //   // Dashboard is exempt from throttling
  //   console.log("\n\n\nHANDLING DISPLAY REQUEST", 'view:', view, 'packageName:', packageName, 'systemApps.dashboard.packageName:', systemApps.dashboard.packageName);
  //   if (view === "dashboard" && packageName === systemApps.dashboard.packageName || packageName === 'system') {
  //     console.log("SENDING DASHBOARD DISPLAY");
  //     return this.sendDisplay(displayRequest);
  //   }

  //   // Apply shared throttling to all other views
  //   if (this.shouldThrottleMain()) {
  //     this.addToDisplayStack(view, displayRequest);
  //     if (this.pendingDisplayRequestMain?.displayRequest.packageName === packageName) {
  //       this.pendingDisplayRequestMain = { displayRequest, userSession };
  //     }
  //     this.scheduleDisplayMain();
  //     return false;
  //   }

  //   // Add to display stack and show immediately
  //   this.addToDisplayStack(view, displayRequest);
  //   return this.sendDisplay(displayRequest);
  // }

  public handleAppStart(packageName: string, userSession: UserSession): void {
    this.userSession = userSession;
    // Add the app to our bootingApps list if not already present
    if (!this.bootingApps.includes(packageName)) {
      this.bootingApps.push(packageName);
      // Add a 3 second timeout to remove the app from bootingApps list. because it's started.
      setTimeout(() => {
        this.bootingApps = this.bootingApps.filter(app => app !== packageName);
      }, this.BOOTING_SCREEN_DURATION);

    }
    this.isShowingBootScreen = true;
    this.showBootingScreen();
    // this.resetBootingTimer();
  }


  // Enhanced handleAppStop to handle locks
  public handleAppStop(packageName: string, userSession: UserSession): void {
    this.userSession = userSession;

    // Release lock if held by stopping app
    if (this.displayLock?.packageName === packageName) {
      this.releaseDisplayLock();
    }

    // Clear main app if it's stopping
    if (this.mainApp === packageName) {
      this.mainApp = null;
    }

    // Existing cleanup
    this.removeAppDisplays(packageName);
    const index = this.bootingApps.indexOf(packageName);
    if (index > -1) {
      this.bootingApps.splice(index, 1);
    }

    if (this.bootingApps.length === 0 && this.isShowingBootScreen) {
      this.isShowingBootScreen = false;
      if (this.bootingTimeoutId) {
        clearTimeout(this.bootingTimeoutId);
        this.bootingTimeoutId = null;
      }
      this.clearBootScreen();
      this.showNextPriorityDisplay('main');
    } else if (this.bootingApps.length > 0) {
      this.showBootingScreen();
      this.resetBootingTimer();
    }
  }


  // Private Implementation
  private removeAppDisplays(packageName: string): void {
    for (const [view, viewStack] of this.activeDisplays.entries()) {
      if (viewStack[packageName]) {
        this.clearDisplay(view, packageName);
      }
    }
  }

  private addToDisplayStack(view: ViewName, displayRequest: DisplayRequest): void {
    if (!this.activeDisplays.has(view)) {
      this.activeDisplays.set(view, {});
    }

    const viewStack = this.activeDisplays.get(view)!;
    const { packageName, durationMs } = displayRequest;

    // Remove ALL previous requests from this TPA (across all views)
    this.activeDisplays.forEach((stack) => {
      delete stack[packageName];
    });

    // Add the new display request
    viewStack[packageName] = {
      displayRequest,
      endsAt: durationMs ? new Date(Date.now() + durationMs) : undefined
    };

    if (durationMs) {
      setTimeout(() => {
        this.clearDisplay(view, packageName, true);
      }, durationMs);
    }
  }

  private scheduleDisplayMain(): void {
    setTimeout(() => {
      if (this.pendingDisplayRequestMain && this.userSession) {
        const { displayRequest } = this.pendingDisplayRequestMain;
        this.sendDisplay(displayRequest);
        this.pendingDisplayRequestMain = null;
      }
    }, this.displayDebounceDelay);
  }

  private shouldThrottleMain(): boolean {
    const now = Date.now();
    return (now - this.lastSentTimeMain) < this.displayDebounceDelay;
  }

  private clearDisplay(view: ViewName, packageName: string, isAutoClear: boolean = false): void {
    const viewStack = this.activeDisplays.get(view);
    if (!viewStack || !this.userSession) return;

    // Remove the display request for this package
    delete viewStack[packageName];

    // If the cleared display was active, show the next highest priority display
    if (this.currentMainApp === packageName) {
      this.showNextPriorityDisplay(view);
    }
  }

  private showNextPriorityDisplay(view: ViewName): void {
    if (!this.userSession) return;

    const viewStack = this.activeDisplays.get(view);
    // If no active (non-system) displays exist, leave the last message on screen.
    if (!viewStack || Object.keys(viewStack).filter(pkg => pkg !== 'system').length === 0) {
      return;
    }

    // Determine the highest priority display based on activeAppSessions order
    let highestPriorityDisplay: ActiveDisplay | null = null;
    let highestPriorityPackage: string | null = null;

    Object.entries(viewStack).forEach(([packageName, display]) => {
      // Skip expired displays
      if (display.endsAt && display.endsAt.getTime() <= Date.now()) {
        delete viewStack[packageName];
        return;
      }

      // Skip the boot screen (system) display
      if (packageName === 'system') return;

      const currentPriority = this.getPackagePriority(packageName);
      const highestPriority = highestPriorityPackage ? this.getPackagePriority(highestPriorityPackage) : -1;

      // Lower index means higher priority
      if (!highestPriorityDisplay || currentPriority < highestPriority) {
        highestPriorityDisplay = display;
        highestPriorityPackage = packageName;
      }
    });

    if (highestPriorityDisplay) {
      // We must cast this to an active display so we don't get a typescript
      this.sendDisplay((highestPriorityDisplay as ActiveDisplay).displayRequest);
    }
  }

  private getPackagePriority(packageName: string): number {
    if (!this.userSession) return -1;
    // Lower index = higher priority (activeAppSessions order)
    const priority = this.userSession.activeAppSessions.indexOf(packageName);
    return priority === -1 ? Number.MAX_VALUE : priority; // Unregistered apps get lowest priority
  }

  private showBootingScreen(): void {
    if (!this.userSession) return;
    this.isShowingBootScreen = true;

    // Transform bootingApps using systemApps mapping
    const bootingNames = this.bootingApps.map(pkg => {
      const app = Object.values(systemApps).find(a => a.packageName === pkg);
      return app ? app.name : pkg;
    });

    let text = "";
    if (bootingNames.length > 0) {
      text += this.formatAppList(bootingNames);
    }

    const bootLayout: Layout = {
      layoutType: "reference_card",
      title: `// AugmentOS - Starting App${bootingNames.length > 1 ? 's' : ''}`,
      text
    };

    const bootRequest: DisplayRequest = {
      type: 'display_event',
      view: 'main',
      packageName: 'system',
      layout: bootLayout,
      timestamp: new Date()
    };

    // Send the boot screen display event
    this.handleDisplayEvent(bootRequest, this.userSession);
  }

  private resetBootingTimer(): void {
    if (this.bootingTimeoutId) {
      clearTimeout(this.bootingTimeoutId);
    }
    this.bootingTimeoutId = setTimeout(() => {
      this.isShowingBootScreen = false;
      this.clearBootScreen();
      this.showNextPriorityDisplay('main');
    }, this.BOOTING_SCREEN_DURATION);
  }

  // Remove any boot screen request (i.e. system display) from the active displays
  private clearBootScreen(): void {
    const viewStack = this.activeDisplays.get('main');
    if (viewStack && viewStack['system']) {
      delete viewStack['system'];
    }

    // Clear the boot screen from the display
    this.sendClearDisplay('main');
  }

  private sendDisplay(displayRequest: DisplayRequest): boolean {
    if (!this.userSession) return false;

    const { view } = displayRequest;

    // Update last sent time for non-dashboard views
    if (view !== "dashboard") {
      this.lastSentTimeMain = Date.now();
      this.currentMainApp = displayRequest.packageName;
    }

    this.addToHistory(displayRequest);
    return this.sendToWebSocket(displayRequest, this.userSession.websocket);
  }

  private sendToWebSocket(displayRequest: DisplayRequest, ws: WebSocket): boolean {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(displayRequest));
        return true;
      } catch (error) {
        console.error('Error sending to WebSocket:', error);
        return false;
      }
    }
    console.error('WebSocket not connected, display request dropped.');
    return false;
  }

  private sendClearDisplay(view: ViewName): void {
    if (!this.userSession) return;

    const clearRequest: DisplayRequest = {
      type: 'display_event',
      view,
      packageName: 'system',
      layout: { layoutType: 'text_wall', text: '' },
      timestamp: new Date()
    };
    this.sendDisplay(clearRequest);
  }

  private addToHistory(displayRequest: DisplayRequest): void {
    this.displayHistory.push(displayRequest);
    // Optionally limit history size
    if (this.displayHistory.length > 1000) {
      this.displayHistory = this.displayHistory.slice(-1000);
    }
  }

  private formatAppList(apps: string[]): string {
    if (apps.length === 0) return "";
    return apps.join(", ");
  }
}

export default DisplayManager;
