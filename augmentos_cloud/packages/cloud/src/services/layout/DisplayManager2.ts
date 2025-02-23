// augmentos_cloud/packages/cloud/src/services/layout/DisplayManager.ts

import { systemApps } from '@augmentos/config';
import { ActiveDisplay, Layout, DisplayRequest, DisplayManagerI, UserSession } from '@augmentos/types';
import { WebSocket } from 'ws';

interface DisplayState {
  currentDisplay: ActiveDisplay | null;
  coreAppDisplay: ActiveDisplay | null;
  backgroundLock: { packageName: string; expiresAt: Date } | null;
}

class DisplayManager implements DisplayManagerI {
  private displayState: DisplayState = {
    currentDisplay: null,
    coreAppDisplay: null,
    backgroundLock: null
  };
  private bootingApps: Set<string> = new Set();
  private readonly LOCK_TIMEOUT = 10000;
  private readonly THROTTLE_DELAY = 200;
  private readonly BOOT_DURATION = 3000;
  private lastDisplayTime = 0;
  private userSession: UserSession | null = null;
  private mainApp: string | null = systemApps.captions.packageName; // Hardcode captions as core app

  public handleAppStart(packageName: string, userSession: UserSession): void {
    this.userSession = userSession;
    
    // Don't show boot screen for dashboard
    if (packageName === systemApps.dashboard.packageName) {
      return;
    }

    // Add to booting apps and show boot screen
    this.bootingApps.add(packageName);
    this.updateBootScreen();

    // Set timeout to remove from boot screen
    setTimeout(() => {
      this.bootingApps.delete(packageName);
      if (this.bootingApps.size === 0) {
        this.showNextDisplay('app_stop');
      } else {
        this.updateBootScreen();
      }
    }, this.BOOT_DURATION);
  }

  public handleAppStop(packageName: string, userSession: UserSession): void {
    this.userSession = userSession;

    // Remove from booting apps if present
    this.bootingApps.delete(packageName);
    if (this.bootingApps.size > 0) {
      this.updateBootScreen();
    }

    // Clear any background lock held by this app
    if (this.displayState.backgroundLock?.packageName === packageName) {
      this.displayState.backgroundLock = null;
    }

    // If this was the core app, clear its saved display
    if (packageName === this.mainApp) {
      this.displayState.coreAppDisplay = null;
    }

    // If this app was currently displaying something, show next display
    if (this.displayState.currentDisplay?.displayRequest.packageName === packageName) {
      this.showNextDisplay('app_stop');
    }
  }

  public handleDisplayEvent(displayRequest: DisplayRequest, userSession: UserSession): boolean {
    this.userSession = userSession;

    // Always show dashboard immediately
    if (displayRequest.packageName === systemApps.dashboard.packageName) {
      return this.sendDisplay(displayRequest);
    }

    // Don't allow display requests while app is booting
    if (this.bootingApps.has(displayRequest.packageName)) {
      return false;
    }

    // Handle core app display
    if (displayRequest.packageName === this.mainApp) {
      const activeDisplay = this.createActiveDisplay(displayRequest);
      this.displayState.coreAppDisplay = activeDisplay;
      
      // Only show if no background app has lock
      if (!this.displayState.backgroundLock) {
        return this.showDisplay(activeDisplay);
      }
      return false;
    }

    // Handle background app display
    const canDisplay = this.canBackgroundAppDisplay(displayRequest.packageName);
    if (canDisplay) {
      const activeDisplay = this.createActiveDisplay(displayRequest);
      return this.showDisplay(activeDisplay);
    }

    return false;
  }

  // private methods
  private showDisplay(activeDisplay: ActiveDisplay): boolean {
    // Check throttle
    if (Date.now() - this.lastDisplayTime < this.THROTTLE_DELAY) {
      return false;
    }

    const success = this.sendToWebSocket(activeDisplay.displayRequest, this.userSession?.websocket);
    if (success) {
      this.displayState.currentDisplay = activeDisplay;
      this.lastDisplayTime = Date.now();

      // Set expiry timeout if duration specified
      if (activeDisplay.expiresAt) {
        const timeUntilExpiry = activeDisplay.expiresAt.getTime() - Date.now();
        setTimeout(() => {
          // Only clear if this display is still showing
          if (this.displayState.currentDisplay === activeDisplay) {
            this.showNextDisplay('duration_expired');
          }
        }, timeUntilExpiry);
      }
    }
    return success;
  }

  private showNextDisplay(reason: 'app_stop' | 'duration_expired' | 'new_request'): void {
    // Boot screen takes precedence
    if (this.bootingApps.size > 0) {
      this.updateBootScreen();
      return;
    }

    // Check for background app with lock
    if (this.displayState.backgroundLock) {
      const { packageName, expiresAt } = this.displayState.backgroundLock;
      if (expiresAt.getTime() > Date.now()) {
        // Lock still valid, nothing to show
        return;
      }
      // Lock expired, clear it
      this.displayState.backgroundLock = null;
    }

    // Show core app display if it exists and has remaining duration
    if (this.displayState.coreAppDisplay && this.hasRemainingDuration(this.displayState.coreAppDisplay)) {
      this.showDisplay(this.displayState.coreAppDisplay);
      return;
    }

    // Nothing to show, clear display
    this.clearDisplay('main');
  }

  private canBackgroundAppDisplay(packageName: string): boolean {
    // Already has lock
    if (this.displayState.backgroundLock?.packageName === packageName) {
      return true;
    }

    // No existing lock, can acquire new one
    if (!this.displayState.backgroundLock) {
      this.displayState.backgroundLock = {
        packageName,
        expiresAt: new Date(Date.now() + this.LOCK_TIMEOUT)
      };
      return true;
    }

    return false;
  }

  private updateBootScreen(): void {
    if (!this.userSession || this.bootingApps.size === 0) return;

    const bootRequest: DisplayRequest = {
      type: 'display_event',
      view: 'main',
      packageName: systemApps.dashboard.packageName,
      layout: {
        layoutType: "reference_card",
        title: `// AugmentOS - Starting App${this.bootingApps.size > 1 ? 's' : ''}`,
        text: Array.from(this.bootingApps).join(", ")
      },
      timestamp: new Date()
    };

    this.sendDisplay(bootRequest);
  }

  private clearDisplay(viewName: string): void {
    if (!this.userSession) return;

    const clearRequest: DisplayRequest = {
      type: 'display_event',
      view: viewName,
      packageName: systemApps.dashboard.packageName,
      layout: { layoutType: 'text_wall', text: '' },
      timestamp: new Date()
    };
    this.sendDisplay(clearRequest);
  }

  private hasRemainingDuration(activeDisplay: ActiveDisplay): boolean {
    if (!activeDisplay.expiresAt) return true; // No duration = show indefinitely
    return activeDisplay.expiresAt.getTime() > Date.now();
  }

  private createActiveDisplay(displayRequest: DisplayRequest): ActiveDisplay {
    const now = new Date();
    return {
      displayRequest: displayRequest,
      startedAt: now,
      expiresAt: displayRequest.durationMs ? new Date(now.getTime() + displayRequest.durationMs) : undefined
    };
  }

  private sendDisplay(displayRequest: DisplayRequest): boolean {
    if (!this.userSession) return false;
  
    // Check throttle for non-dashboard displays
    if (displayRequest.view !== 'dashboard' && 
        Date.now() - this.lastDisplayTime < this.THROTTLE_DELAY) {
      return false;
    }
  
    const success = this.sendToWebSocket(displayRequest, this.userSession.websocket);
    if (success && displayRequest.view !== 'dashboard') {
      this.lastDisplayTime = Date.now();
    }
  
    return success;
  }

  private sendToWebSocket(displayRequest: DisplayRequest, webSocket?: WebSocket): boolean {
    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      webSocket.send(JSON.stringify(displayRequest));
      return true;
    } catch (error) {
      console.error('Error sending to WebSocket:', error);
      return false;
    }
  }


}

export default DisplayManager;
