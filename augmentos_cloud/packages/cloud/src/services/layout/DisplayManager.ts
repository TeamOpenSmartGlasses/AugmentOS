/**
 * 🎮 AR Display Manager for Third Party Apps (TPAs)
 * 
 * Why this exists:
 * - TPAs need to show content in AR but shouldn't conflict with each other
 * - Some displays are more important than others (system alerts vs background info)
 * - We need to know what each TPA has shown (for debugging/support)
 */

import { ActiveDisplay, AppI, DisplayManagerI, Layout, Views } from '@augmentos/types';
import { DisplayRequest } from '@augmentos/types';

export class DisplayManager implements DisplayManagerI {
    // Keep history for debugging/support
    views: Views = new Map<AppI["packageName"], Map<DisplayRequest["view"], Layout>>();
    activeDisplays = new Map<string, ActiveDisplay>();
    displayHistory = new Map<AppI["packageName"], DisplayRequest[]>();

    /**
     * Main entry point for TPAs to show something in AR
     * Returns true if shown, false if blocked by higher priority display
     */
    public async handleDisplayEvent(displayRequest: DisplayRequest): Promise<boolean> {
        try {
            await this.showDisplay(displayRequest);
            // Still track attempts that weren't shown
            return false;
        } catch (error) {
            console.error('🔥 Display error:', error);
            return false;
        }
    }

    /** Updates AR display and sets auto-cleanup if needed */
    private async showDisplay(displayRequest: DisplayRequest): Promise<void> {
        const activeDisplay: ActiveDisplay = {
            displayRequest,
            endsAt: displayRequest.durationMs ? new Date(Date.now() + displayRequest.durationMs) : undefined
        };

        const appViewsMap = this.views.get(displayRequest.packageName);
        if (!appViewsMap) {
            this.views.set(displayRequest.packageName, new Map([[displayRequest.view, displayRequest.layout]]));
        }
        this.activeDisplays.set(activeDisplay.displayRequest.view, activeDisplay);
        this.addToHistory(displayRequest);

        // Auto-cleanup after duration
        if (displayRequest.durationMs && displayRequest.durationMs > 0) {
            setTimeout(() => {
                this.activeDisplays.delete(displayRequest.view);
            }, displayRequest.durationMs);
        }
    }

    /** Keep track of all attempts (shown or not) for debugging */
    private addToHistory(displayRequest: DisplayRequest): void {
        const key = `${displayRequest.packageName}:${displayRequest.view}`;
        const history = this.displayHistory.get(key) || [];
        history.push(displayRequest);
        this.displayHistory.set(key, history);
    }

    /** Get what a TPA has tried to show (for debugging) */
    getDisplayHistory(packageName: string): DisplayRequest[] {
        return this.displayHistory.get(packageName) || [];
    }

    clearHistory(packageName: string): void {
        this.displayHistory.delete(packageName);
    }
}

export default DisplayManager;