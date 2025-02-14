// /**
//  * 🎮 AR Display Manager for Third Party Apps (TPAs)
//  * 
//  * Why this exists:
//  * - TPAs need to show content in AR but shouldn't conflict with each other
//  * - Some displays are more important than others (system alerts vs background info)
//  * - We need to know what each TPA has shown (for debugging/support)
//  */

// import { Layout } from '@augmentos/types';
// import { ISessionService } from '../core/session.service';
// import sessionService from '../core/session.service';

// /** What we track for each display (for history/debugging) */
// interface DisplayRecord {
//   layout: Layout;
//   timestamp: Date;
//   durationMs?: number;
//   packageName: string;
//   userSessionId: string;
// }

// /** Required interface - don't change or things will break */
// export interface IDisplayService {
//   handleDisplayEvent(
//     userSessionId: string,
//     packageName: string,
//     layout: Layout,
//     durationMs?: number
//   ): Promise<boolean>;
//   getDisplayHistory(sessionId: string, packageName: string): DisplayRecord[];
//   clearHistory(sessionId: string, packageName: string): void;
// }

// /** What's showing right now in a session */
// interface ActiveDisplay {
//   record: DisplayRecord;
//   endsAt?: Date;  // When to auto-clear this display
// }

// export class DisplayService implements IDisplayService {
//   // Track what's currently showing in each session
//   private activeDisplays = new Map<string, ActiveDisplay>();
//   // Keep history for debugging/support
//   private displayHistory = new Map<string, DisplayRecord[]>();

//   constructor(private readonly sessionService: ISessionService) {}

//   /**
//    * Main entry point for TPAs to show something in AR
//    * Returns true if shown, false if blocked by higher priority display
//    */
//   async handleDisplayEvent(
//     userSessionId: string,
//     packageName: string,
//     layout: Layout,
//     durationMs?: number
//   ): Promise<boolean> {
//     try {
//       const record: DisplayRecord = {
//         layout,
//         timestamp: new Date(),
//         durationMs,
//         packageName: packageName,
//         userSessionId: userSessionId,
//       };

//       await this.showDisplay(record, durationMs);

//       // Still track attempts that weren't shown
//       this.addToHistory(record);
//       return false;
//     } catch (error) {
//       console.error('🔥 Display error:', error);
//       return false;
//     }
//   }

//   /** Updates AR display and sets auto-cleanup if needed */
//   private async showDisplay(record: DisplayRecord, durationMs?: number): Promise<void> {
//     const activeDisplay: ActiveDisplay = {
//       record,
//       endsAt: durationMs ? new Date(Date.now() + durationMs) : undefined
//     };

//     this.activeDisplays.set(record.userSessionId, activeDisplay);
//     this.addToHistory(record);
    
//     await this.sessionService.updateDisplay(
//       record.userSessionId,
//       record.layout,
//       durationMs
//     );

//     // Auto-cleanup after duration
//     if (durationMs) {
//       setTimeout(() => {
//         this.activeDisplays.delete(record.userSessionId);
//       }, durationMs);
//     }
//   }

//   /** Keep track of all attempts (shown or not) for debugging */
//   private addToHistory(record: DisplayRecord): void {
//     const key = `${record.userSessionId}:${record.packageName}`;
//     const history = this.displayHistory.get(key) || [];
//     history.push(record);
//     this.displayHistory.set(key, history);
//   }

//   /** Get what a TPA has tried to show (for debugging) */
//   getDisplayHistory(userSessionId: string, packageName: string): DisplayRecord[] {
//     const key = `${userSessionId}:${packageName}`;
//     return this.displayHistory.get(key) || [];
//   }

//   clearHistory(userSessionId: string, packageName: string): void {
//     const key = `${userSessionId}:${packageName}`;
//     this.displayHistory.delete(key);
//   }
// }

// // Create the one instance everyone should use
// export const displayService = new DisplayService(sessionService);
// console.log('✅ Display Service Ready!');

// export default displayService;