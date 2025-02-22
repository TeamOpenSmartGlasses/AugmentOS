// CoreTransport.ts

/**
 * Represents a generic transport interface for sending/receiving data to/from
 * the AugmentOS Core. Both BLE and local (on-device) transports will implement
 * these same methods.
 */
export interface CoreTransport {
    /**
     * Set up any needed listeners or resources (e.g. initialize BLE manager).
     */
    initialize(): Promise<void>;
  
    /**
     * Establish the transport connection (e.g. connect BLE or set up local).
     */
    connect(): Promise<void>;
  
    /**
     * Disconnect or tear down the transport.
     */
    disconnect(): Promise<void>;
  
    /**
     * Return true if currently connected/active.
     */
    isConnected(): boolean;
  
    /**
     * Register a callback to receive data from the transport
     * (usually parsed JSON objects).
     */
    onData(callback: (data: any) => void): void;
  
    /**
     * Send data (usually a JSON object) across the transport.
     */
    sendData(data: any): Promise<void>;
  }
  