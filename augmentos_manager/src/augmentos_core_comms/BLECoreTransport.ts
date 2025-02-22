// BLECoreTransport.ts

import {
    NativeModules,
    NativeEventEmitter,
    Platform,
  } from 'react-native';
  import BleManager from 'react-native-ble-manager';
  import { CoreTransport } from './CoreTransport';
  import { EventEmitter } from 'events';
  import { TextDecoder } from 'text-encoding';
  
  /**
   * You can define an interface like this if you want a strongly typed "Device"
   * or reuse your own from the old BluetoothService code.
   */
  interface Device {
    id: string;
    name: string | null;
    rssi: number;
  }
  
  /**
   * The BLECoreTransport implements all the BLE scanning, connecting, bonding,
   * chunked data handling, plus a heartbeat or reconnection loop if desired.
   */
  export class BLECoreTransport implements CoreTransport {
    // --- Internal state & references ---
    private bleManagerEmitter: NativeEventEmitter;
    private eventEmitter: EventEmitter;   // For internal usage if needed
  
    private connectedDevice: Device | null = null;
    private connected: boolean = false;
  
    private isScanning: boolean = false;
    private isConnecting: boolean = false;
  
    private chunks: Record<string, Uint8Array[]> = {};
    private expectedChunks: Record<string, number> = {};
  
    private mtuSize: number = 23; // Will request up to 251 on Android
  
    private onDataCallback: ((data: any) => void) | null = null;
  
    // For reconnection or heartbeat logic
    private reconnectionTimer: ReturnType<typeof setTimeout> | null = null;
  
    // --- Constants / UUIDs ---
    private SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
    private CHARACTERISTIC_UUID = 'abcdef12-3456-789a-bcde-f01234567890';
  
    constructor() {
      const BleManagerModule = NativeModules.BleManager;
      this.bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
      this.eventEmitter = new EventEmitter();
  
      // Optionally, you could attach loggers or interceptors here
    }
  
    // ------------------------------------------------------------
    // 1) initialize(): set up BleManager, listeners, etc.
    // ------------------------------------------------------------
    public async initialize(): Promise<void> {
      try {
        await BleManager.start({ showAlert: false });
        // Set up BLE manager event listeners
        this.addBleListeners();
        console.log('BLECoreTransport: BleManager started and listeners added.');
      } catch (error) {
        console.error('BLECoreTransport: Failed to initialize BLE:', error);
      }
    }
  
    // ------------------------------------------------------------
    // 2) connect(): in BLE, we often do a scan + auto-connect to "AugOS" device
    // ------------------------------------------------------------
    public async connect(): Promise<void> {
      if (this.isConnecting || this.connected) {
        console.log('BLECoreTransport: Already connecting or connected.');
        return;
      }
  
      this.isConnecting = true;
      console.log('BLECoreTransport: Starting scan to find "AugOS" device...');
  
      try {
        // Start scanning for the service UUID. 0 = indefinite scan time until we stop or find it
        this.isScanning = true;
        await BleManager.scan([this.SERVICE_UUID], 0, true);
  
        // We'll rely on the "BleManagerDiscoverPeripheral" event to find "AugOS"
        // And on discovering it, we'll stop scanning and call doConnect(peripheral).
      } catch (error) {
        this.isScanning = false;
        this.isConnecting = false;
        console.error('BLECoreTransport: Error during scanning:', error);
      }
    }
  
    // Internal method to handle the actual connection process
    private async doConnect(peripheral: any): Promise<void> {
      try {
        console.log('BLECoreTransport: Connecting to', peripheral.id);
        await BleManager.connect(peripheral.id);
  
        // The connect call resolves immediately, but sometimes you need to wait a bit
        let isConnected = await BleManager.isPeripheralConnected(peripheral.id, []);
        for (let i = 0; i < 5 && !isConnected; i++) {
          await this.delay(500);
          isConnected = await BleManager.isPeripheralConnected(peripheral.id, []);
        }
  
        if (!isConnected) {
          throw new Error('BLECoreTransport: Failed to connect after retries');
        }
  
        console.log('BLECoreTransport: Successfully connected to', peripheral.id);
        this.connectedDevice = {
          id: peripheral.id,
          name: peripheral.name ?? 'Unknown',
          rssi: peripheral.rssi ?? 0,
        };
  
        // Bonding on Android if not already bonded
        if (Platform.OS === 'android') {
          await this.ensureBonded(peripheral.id);
        }
  
        // Retrieve services, set MTU, enable notifications
        await BleManager.retrieveServices(peripheral.id);
  
        if (Platform.OS === 'android') {
          await this.requestMtu(peripheral.id);
        }
  
        await this.startNotifications(peripheral.id);
  
        this.connected = true;
        console.log('BLECoreTransport: Connection complete.');
      } catch (error) {
        console.error('BLECoreTransport: Error connecting to device:', error);
        this.connectedDevice = null;
        this.connected = false;
      } finally {
        // We only stop scanning after we either connect or fail to connect
        if (this.isScanning) {
          BleManager.stopScan().catch(() => {});
          this.isScanning = false;
        }
        this.isConnecting = false;
      }
    }
  
    // ------------------------------------------------------------
    // 3) disconnect(): tear down BLE connection
    // ------------------------------------------------------------
    public async disconnect(): Promise<void> {
      if (!this.connectedDevice) {
        console.log('BLECoreTransport: No connected device to disconnect.');
        this.connected = false;
        return;
      }
  
      try {
        const devId = this.connectedDevice.id;
        console.log(`BLECoreTransport: Disconnecting from ${devId}...`);
  
        const stillConnected = await BleManager.isPeripheralConnected(devId, []);
        if (stillConnected) {
          await BleManager.disconnect(devId);
        }
      } catch (error) {
        console.error('BLECoreTransport: Error during BLE disconnect:', error);
      } finally {
        this.connectedDevice = null;
        this.connected = false;
      }
    }
  
    // ------------------------------------------------------------
    // 4) isConnected(): simply report if we've established a device
    // ------------------------------------------------------------
    public isConnected(): boolean {
      return this.connected;
    }
  
    // ------------------------------------------------------------
    // 5) onData(callback): register a callback to receive JSON from device
    // ------------------------------------------------------------
    public onData(callback: (data: any) => void): void {
      this.onDataCallback = callback;
    }
  
    // ------------------------------------------------------------
    // 6) sendData(data): write (chunked) JSON to the device
    // ------------------------------------------------------------
    public async sendData(data: any): Promise<void> {
      if (!this.connectedDevice || !this.connected) {
        console.warn('BLECoreTransport: Not connected; cannot send data.');
        return;
      }
  
      try {
        const jsonString = JSON.stringify(data);
        const byteArray = Array.from(Buffer.from(jsonString, 'utf8'));
  
        // Each BLE packet has overhead (3 bytes for ATT header).
        // So the max payload = this.mtuSize - 3
        const maxChunkSize = this.mtuSize - 3;
        const totalChunks = Math.ceil(byteArray.length / maxChunkSize);
  
        for (let i = 0; i < totalChunks; i++) {
          const start = i * maxChunkSize;
          const end = Math.min(start + maxChunkSize, byteArray.length);
          const chunk = byteArray.slice(start, end);
  
          // Prepend [sequenceNumber, totalChunks]
          const chunkWithHeader = Uint8Array.from([
            i,              // sequence number
            totalChunks,    // total chunk count
            ...chunk,
          ]);
  
          // Write the chunk
          // If we want guaranteed response, use BleManager.write
          // If we don't, use writeWithoutResponse
          await BleManager.write(
            this.connectedDevice.id,
            this.SERVICE_UUID,
            this.CHARACTERISTIC_UUID,
            Array.from(chunkWithHeader),
          );
  
          // Throttle a bit if you want to avoid flooding
          // (Optional depending on device's BLE stack)
          await this.delay(50);
        }
  
        console.log('BLECoreTransport: Sent data successfully:', data);
      } catch (error) {
        console.error('BLECoreTransport: Error sending data:', error);
      }
    }
  
    // ------------------------------------------------------------
    // Extras: Bonding, scanning events, chunk assembly, etc.
    // ------------------------------------------------------------
  
    /**
     * Listen to the relevant BleManager events. We replicate the logic
     * that was in your original service. 
     */
    private addBleListeners() {
      this.bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        this.handleDiscoveredPeripheral.bind(this),
      );
      this.bleManagerEmitter.addListener(
        'BleManagerStopScan',
        this.handleStopScan.bind(this),
      );
      this.bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        this.handleDisconnectedPeripheral.bind(this),
      );
      this.bleManagerEmitter.addListener(
        'BleManagerBondedPeripheral',
        this.handleBondedPeripheral.bind(this),
      );
      this.bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        this.handleCharacteristicUpdate.bind(this),
      );
    }
  
    /**
     * Called when scanning stops (either timed out or explicitly).
     */
    private handleStopScan() {
      this.isScanning = false;
      console.log('BLECoreTransport: Scan stopped.');
    }
  
    /**
     * Called when a peripheral is discovered during scan.
     * We'll check if the peripheral has the name "AugOS", then connect.
     */
    private handleDiscoveredPeripheral(peripheral: any) {
      // If we already have a connecting device, ignore
      if (this.isConnecting || this.connected) return;
  
      console.log('BLECoreTransport: Discovered peripheral:', peripheral);
  
      if (peripheral.name === 'AugOS') {
        console.log('BLECoreTransport: Found "AugOS" device. Stopping scan...');
        BleManager.stopScan()
          .then(() => {
            this.isScanning = false;
            this.doConnect(peripheral);
          })
          .catch(err => console.error('StopScan error:', err));
      }
    }
  
    /**
     * Called when device is disconnected externally or by call.
     */
    private handleDisconnectedPeripheral(data: any) {
      const deviceId = data.peripheral;
      if (this.connectedDevice && this.connectedDevice.id === deviceId) {
        console.log('BLECoreTransport: Device disconnected:', deviceId);
        this.connected = false;
        this.connectedDevice = null;
        // If you want auto-reconnect logic, you could trigger it here
      }
    }
  
    /**
     * Called when bonding is complete (Android).
     */
    private handleBondedPeripheral(data: any) {
      console.log('BLECoreTransport: Bonding success with:', data);
      // You might show a toast or other UI
    }
  
    /**
     * Called when the characteristic notifies a value update (incoming data).
     * This is where we do chunk assembly, parse JSON, and forward it to onDataCallback.
     */
    private handleCharacteristicUpdate(data: any) {
      const { peripheral, characteristic, value } = data;
      if (!this.connectedDevice || peripheral !== this.connectedDevice.id) {
        return;
      }
      if (characteristic !== this.CHARACTERISTIC_UUID) {
        return;
      }
  
      // `value` is an array of bytes
      const byteArray = Uint8Array.from(value);
  
      const sequenceNumber = byteArray[0];
      const totalChunks = byteArray[1];
      const chunkData = byteArray.slice(2);
  
      // Initialize if needed
      if (!this.chunks[peripheral]) {
        this.chunks[peripheral] = [];
        this.expectedChunks[peripheral] = totalChunks;
      }
  
      this.chunks[peripheral][sequenceNumber] = chunkData;
  
      // Check if all chunks have arrived
      const receivedChunks = this.chunks[peripheral].filter(c => c !== undefined).length;
      if (receivedChunks === this.expectedChunks[peripheral]) {
        // Reconstruct
        const completeData = this.concatenateUint8Arrays(this.chunks[peripheral]);
        const textDecoder = new TextDecoder('utf-8');
        const jsonString = textDecoder.decode(completeData);
  
        try {
          const parsed = JSON.parse(jsonString);
          if (this.onDataCallback) {
            this.onDataCallback(parsed);
          }
        } catch (err) {
          console.error('BLECoreTransport: Error parsing JSON from chunks:', err);
          console.error('Raw data was:', jsonString);
        }
  
        // Reset
        delete this.chunks[peripheral];
        delete this.expectedChunks[peripheral];
      }
    }
  
    /**
     * Utility to bond if not already bonded (Android only).
     */
    private async ensureBonded(deviceId: string): Promise<void> {
      const bondedPeripherals = await BleManager.getBondedPeripherals();
      const isBonded = bondedPeripherals.some(d => d.id === deviceId);
      if (!isBonded) {
        console.log('BLECoreTransport: Device not bonded. Attempting to bond...');
        try {
          await BleManager.createBond(deviceId);
          console.log('BLECoreTransport: Bonding initiated.');
        } catch (err) {
          console.error('BLECoreTransport: Bonding failed or canceled:', err);
        }
      }
    }
  
    /**
     * Utility to request a larger MTU (Android only).
     */
    private async requestMtu(deviceId: string): Promise<void> {
      try {
        const mtu = await BleManager.requestMTU(deviceId, 251);
        this.mtuSize = mtu;
        console.log(`BLECoreTransport: MTU set to ${mtu}`);
      } catch (err) {
        console.warn('BLECoreTransport: MTU negotiation failed; fallback to 23.', err);
        this.mtuSize = 23;
      }
    }
  
    /**
     * Enable notification on the characteristic so we get incoming data.
     */
    private async startNotifications(deviceId: string): Promise<void> {
      try {
        await BleManager.startNotification(deviceId, this.SERVICE_UUID, this.CHARACTERISTIC_UUID);
        console.log('BLECoreTransport: Notifications enabled.');
      } catch (err) {
        console.error('BLECoreTransport: Failed to enable notifications:', err);
      }
    }
  
    /**
     * If you want to keep sending a heartbeat, or keep scanning for reconnection,
     * you can do it with a timer. Here’s an example pattern.
     */
    public startReconnectionLoop(intervalMs = 30000) {
      if (this.reconnectionTimer) return;
  
      const loop = async () => {
        if (this.isConnected()) {
          // Maybe send a heartbeat:
          this.sendData({ command: 'ping' }).catch(() =>
            console.warn('Failed heartbeat?'),
          );
        } else if (!this.isScanning && !this.isConnecting) {
          // Attempt re-scan + connect
          this.connect().catch(err => console.error('Error reconnecting:', err));
        }
  
        this.reconnectionTimer = setTimeout(loop, intervalMs);
      };
      loop();
    }
  
    public stopReconnectionLoop() {
      if (this.reconnectionTimer) {
        clearTimeout(this.reconnectionTimer);
        this.reconnectionTimer = null;
      }
    }
  
    // ------------------------------------------------------------
    // Helper methods
    // ------------------------------------------------------------
    private concatenateUint8Arrays(chunks: Uint8Array[]): Uint8Array {
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    }
  
    private delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  