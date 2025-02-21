import { ActiveDisplay, Layout, DisplayRequest, DisplayManagerI, UserSession } from '@augmentos/types';
import { WebSocket } from 'ws';

interface ThrottledRequest {
  displayRequest: DisplayRequest;
  userSession: UserSession;
}

interface DisplayStack {
  [packageName: string]: ActiveDisplay;
}

type ViewName = "dashboard" | string;

class DisplayManager implements DisplayManagerI {
  private displayHistory: DisplayRequest[] = [];
  private activeDisplays = new Map<ViewName, DisplayStack>();
  private currentMainApp: string | null = null;

  // Shared rate limiting for all non-dashboard TPAs
  private lastSentTimeMain: number = 0;
  private pendingDisplayRequestMain: ThrottledRequest | null = null;
  private readonly displayDebounceDelay = 200; // milliseconds

  // Boot screen management
  private bootingTimeoutId: NodeJS.Timeout | null = null;
  private readonly BOOTING_SCREEN_DURATION = 3000; // 3 seconds
  private isShowingBootScreen = false;
  // Maintain our own list of booting apps (instead of using userSession.loadingApps)
  private bootingApps: string[] = [];

  // Keep track of user session
  private userSession: UserSession | null = null;

  // Public API
  public async handleDisplayEvent(displayRequest: DisplayRequest, userSession: UserSession): Promise<boolean> {
    this.userSession = userSession;
    const { view, packageName } = displayRequest;

    // If boot screen is active, queue non-system requests
    if (this.isShowingBootScreen && packageName !== 'system') {
      this.addToDisplayStack(view, displayRequest);
      return false;
    }

    // Dashboard is exempt from throttling
    if (view === "dashboard" && packageName === 'org.augmentos.dashboard') {
      return this.sendDisplay(displayRequest);
    }

    // Apply shared throttling to all other views
    if (this.shouldThrottleMain()) {
      this.addToDisplayStack(view, displayRequest);
      if (this.pendingDisplayRequestMain?.displayRequest.packageName === packageName) {
        this.pendingDisplayRequestMain = { displayRequest, userSession };
      }
      this.scheduleDisplayMain();
      return false;
    }

    // Add to display stack and show immediately
    this.addToDisplayStack(view, displayRequest);
    return this.sendDisplay(displayRequest);
  }

  public handleAppStart(packageName: string, userSession: UserSession): void {
    this.userSession = userSession;
    // Add the app to our bootingApps list if not already present
    if (!this.bootingApps.includes(packageName)) {
      this.bootingApps.push(packageName);
    }
    this.isShowingBootScreen = true;
    this.showBootingScreen();
    this.resetBootingTimer();
  }

  public handleAppStop(packageName: string, userSession: UserSession): void {
    this.userSession = userSession;
    // Remove any displays for the stopping app
    this.removeAppDisplays(packageName);
    
    // Remove the app from bootingApps (if it exists)
    const index = this.bootingApps.indexOf(packageName);
    if (index > -1) {
      this.bootingApps.splice(index, 1);
    }
    
    // If there are no more booting apps, clear the boot screen immediately.
    if (this.bootingApps.length === 0 && this.isShowingBootScreen) {
      this.isShowingBootScreen = false;
      if (this.bootingTimeoutId) {
        clearTimeout(this.bootingTimeoutId);
        this.bootingTimeoutId = null;
      }
      this.clearBootScreen();
      this.showNextPriorityDisplay('main');
    } else if (this.bootingApps.length > 0) {
      // Otherwise, update the boot screen display with the new list of booting apps.
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

  private showNextPriorityDisplay(view: ViewName, forceClear: boolean = false): void {
    if (!this.userSession) return;
    
    const viewStack = this.activeDisplays.get(view);
    if (!viewStack || Object.keys(viewStack).length === 0) {
      // this.sendClearDisplay(view); // honestly no need to rush and clear screen if there's nothing to show.
      if (forceClear) {
        this.sendClearDisplay(view);
      }
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

      const currentPriority = this.getPackagePriority(packageName);
      const highestPriority = highestPriorityPackage ? this.getPackagePriority(highestPriorityPackage) : -1;

      // Lower index means higher priority
      if (!highestPriorityDisplay || currentPriority < highestPriority) {
        highestPriorityDisplay = display;
        highestPriorityPackage = packageName;
      }
    });

    if (highestPriorityDisplay) {
      this.sendDisplay((highestPriorityDisplay as ActiveDisplay).displayRequest );
    } else {
      // this.sendClearDisplay(view);
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

    // Build boot screen content using our bootingApps list and activeAppSessions (for running apps)
    const bootingApps = this.bootingApps;
    const runningApps = this.userSession.activeAppSessions.filter(app => !bootingApps.includes(app));

    let bootText = "Booting...";
    let runningText = "";

    if (bootingApps.length > 0) {
      const bootingLine = this.formatAppList(bootingApps);
      bootText += `\n${bootingLine}`;
    }

    if (runningApps.length > 0) {
      runningText += "\nRunning...\n";
      runningText += this.formatAppList(runningApps);
    }

    const text = bootText + "\n" + runningText;
    const bootLayout: Layout = {
      layoutType: "text_wall",
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
  
    // After BOOTING_SCREEN_DURATION, clear the boot screen state and remove its display
    this.bootingTimeoutId = setTimeout(() => {
      this.isShowingBootScreen = false;
      this.clearBootScreen();
      this.showNextPriorityDisplay('main', true);
    }, this.BOOTING_SCREEN_DURATION);
  }
  
  // Remove any boot screen request (i.e. system display) from the active displays
  private clearBootScreen(): void {
    const viewStack = this.activeDisplays.get('main');
    if (viewStack && viewStack['system']) {
      delete viewStack['system'];
    }
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
    const simplifiedApps = apps.map(app => app.split(".").pop() || app);
    if (simplifiedApps.length === 0) return "";
    if (simplifiedApps.length <= 2) return simplifiedApps.join(", ");
    return `${simplifiedApps[0]}, ${simplifiedApps[1]} +${simplifiedApps.length - 2} more`;
  }
}

export default DisplayManager;
