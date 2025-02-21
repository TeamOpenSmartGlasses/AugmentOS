// packages/cloud/src/services/layout/DisplayManager.ts

import { ActiveDisplay, AppI, Layout, DisplayRequest, DisplayManagerI, UserSession } from '@augmentos/types';
import { WebSocket } from 'ws';

interface ThrottledRequest {
    displayRequest: DisplayRequest;
    ws: WebSocket;
}

export type ViewName = string;


class DisplayManager implements DisplayManagerI {
    displayHistory: DisplayRequest[] = [];
    currentMainApp: string | null = null;

    // Shared rate limiting for all non-dashboard TPAs
    private lastSentTimeMain: number = 0;
    private pendingDisplayRequestMain: ThrottledRequest | null = null;
    private readonly displayDebounceDelay = 200; // milliseconds

  /**
   * Sets the current app "owning" the main view. Null means no app is active.
   */
  setCurrentMainApp(packageName: string | null): void {
    this.currentMainApp = packageName;
  }

  /**
   * Gets the current app "owning" the main view.
   */
  getCurrentMainApp(): string | null {
    return this.currentMainApp;
  }

    /**
     * Main entry point for TPAs to show something in AR
     */
    public async handleDisplayEvent(displayRequest: DisplayRequest, userSession: UserSession): Promise<boolean> {
        const { view, packageName } = displayRequest;

        // Dashboard is exempt from throttling
        if (view === "dashboard" && packageName === 'org.augmentos.dashboard') {
            return this.sendDisplay(displayRequest, userSession.websocket);
        }

        // Apply shared throttling to all other views
        if (this.shouldThrottleMain()) {
            // Overwrite existing pending request
            this.pendingDisplayRequestMain = { displayRequest, ws: userSession.websocket };
            this.scheduleDisplayMain(userSession.websocket);
            return false; // Indicate throttled request
        }

        return this.sendDisplay(displayRequest, userSession.websocket);
    }

    /**
     * Checks if a display request to a non-dashboard view should be throttled.
     */
    private shouldThrottleMain(): boolean {
        const now = Date.now();
        return (now - this.lastSentTimeMain) < this.displayDebounceDelay;
    }

    /**
     * Schedules the sending of a display request for a non-dashboard view
     */
    private scheduleDisplayMain(ws: WebSocket): void {
        setTimeout(() => {
            if (this.pendingDisplayRequestMain) {
                this.sendDisplay(this.pendingDisplayRequestMain.displayRequest, this.pendingDisplayRequestMain.ws);
                this.pendingDisplayRequestMain = null;
            }
        }, this.displayDebounceDelay);
    }

    /** Updates AR display and sets auto-cleanup if needed */
    private async sendDisplay(displayRequest: DisplayRequest, ws: WebSocket): Promise<boolean> {
        const { view } = displayRequest;

        // Update last sent time for all non-dashboard views
        if (view !== "dashboard") {
            this.lastSentTimeMain = Date.now();
        }

        this.addToHistory(displayRequest);
        this.sendToWebSocket(displayRequest, ws);

        return true;
    }

    /** Sends the display request to the WebSocket client */
    private sendToWebSocket(displayRequest: DisplayRequest, ws: WebSocket): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(displayRequest));
        } else {
            console.error('WebSocket not connected, display request dropped.');
        }
    }

    /** Keep track of what was displayed  */
    private addToHistory(displayRequest: DisplayRequest): void {
        this.displayHistory.push(displayRequest);
    }
}

export default DisplayManager;