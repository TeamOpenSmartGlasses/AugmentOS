import { CoreTransport } from './CoreTransport';
import { NativeEventEmitter } from 'react-native';
import ManagerCoreCommsService from '../bridge/ManagerCoreCommsService';
import { startExternalService } from '../bridge/CoreServiceStarter';

/**
 * A transport implementation that simulates a "local puck" by sending data
 * directly to the native ManagerCoreCommsService (running on the same device).
 * It uses an EventEmitter to listen for events coming from Core.
 */
export class LocalCoreTransport implements CoreTransport {
  private eventEmitter: NativeEventEmitter;
  private connected: boolean = false;

  constructor() {
    // Create a React Native Event Emitter to listen for "CoreMessageIntentEvent" from the native module
    this.eventEmitter = new NativeEventEmitter(ManagerCoreCommsService);
  }

  /**
   * Initialize local service resources if needed (e.g. start the manager service).
   */
  async initialize(): Promise<void> {
    // Ensure the Core service is running, if not, start it.
    if (!(await ManagerCoreCommsService.isServiceRunning())) {
      ManagerCoreCommsService.startService();
    }
    // You can also call startExternalService() if you want the external service running by default
    startExternalService();
  }

  /**
   * Connect to the local "puck" (effectively a no-op in this scenario).
   */
  async connect(): Promise<void> {
    // If you need extra logic, place it here (e.g. startExternalService).
    this.connected = true;
  }

  /**
   * Disconnect from the local "puck" (again, mostly a no-op).
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Whether this local transport is considered "connected."
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Register a callback to receive messages from the local Core.
   * The event "CoreMessageIntentEvent" arrives as JSON strings which we parse.
   */
  onData(callback: (data: any) => void): void {
    this.eventEmitter.addListener('CoreMessageIntentEvent', (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        callback(parsed);
      } catch (err) {
        console.error('Error parsing local core data:', err);
      }
    });
  }

  /**
   * Send data (a JSON object) to the local Core via ManagerCoreCommsService.
   */
  async sendData(data: any): Promise<void> {
    if (!this.connected) {
      console.warn('LocalCoreTransport: Not connected, but attempting to send data.');
    }

    try {
      const jsonString = JSON.stringify(data);
      ManagerCoreCommsService.sendCommandToCore(jsonString);
    } catch (error) {
      console.error('Failed to send data via LocalCoreTransport:', error);
      throw error;
    }
  }
}
