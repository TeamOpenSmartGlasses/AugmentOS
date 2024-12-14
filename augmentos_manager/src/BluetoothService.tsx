// BluetoothService.tsx
import { NativeEventEmitter, NativeModules, Alert, Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { EventEmitter } from 'events';
import { TextDecoder } from 'text-encoding';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { AppState } from 'react-native';
import { RotateInDownLeft } from 'react-native-reanimated';
import { MOCK_CONNECTION } from './consts';
import { loadSetting, saveSetting } from './augmentos_core_comms/SettingsHelper';
import { startExternalService } from './augmentos_core_comms/CoreServiceStarter';
//const { ManagerCoreCommsService } = NativeModules;
//const eventEmitter = new NativeEventEmitter(ManagerCoreCommsService);
import ManagerCoreCommsService from './augmentos_core_comms/ManagerCoreCommsService';
const eventEmitter = new NativeEventEmitter(ManagerCoreCommsService);

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export interface Device {
  id: string;
  name: string | null;
  rssi: number;
}

export class BluetoothService extends EventEmitter {
  devices: Device[] = [];
  connectedDevice: Device | null = null;
  isScanning: boolean = false;
  isConnecting: boolean = false;
  mtuSize = 23;
  chunks: any = {};
  expectedChunks: any = {};

  // Match UUIDs with AugOS
  SERVICE_UUID: string = '12345678-1234-5678-1234-56789abcdef0';
  CHARACTERISTIC_UUID: string = 'abcdef12-3456-789a-bcde-f01234567890';

  isLocked: boolean = false;

  simulatedPuck: boolean = false;

  constructor() {
    super();
  }

  async initialize(){
    if (MOCK_CONNECTION) return;

    // saveSetting('simulatedPuck', false); // TODO: Temporarily disable this feature
    this.simulatedPuck = await loadSetting('simulatedPuck', false);

    if (this.simulatedPuck){
      startExternalService();
      this.initializeCoreMessageIntentReader();
    } else {
      this.initializeBleManager();
    }

    this.startReconnectionScan();

    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  async initializeBleManager() {
    try {
      await BleManager.start({ showAlert: false });
      console.log('BLE Manager initialized');
      this.addListeners();
    } catch (error) {
      console.error('Failed to initialize BLE Manager:', error);
    }
  }

  initializeCoreMessageIntentReader() {
    eventEmitter.addListener('CoreMessageIntentEvent', (jsonString) => {
      console.log('Received message from core:', jsonString);
      try {
        let data = JSON.parse(jsonString);
        if (!this.connectedDevice) {
          this.connectedDevice = {
            id: 'fake-device-id',
            name: 'Fake Device',
            rssi: -50,
          };
        }

        this.parseDataFromAugmentOsCore(data);
      } catch (e){
        console.error('Failed to parse JSON from core message:', e)
      }
    });
  }

  addListeners() {
    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoveredPeripheral.bind(this));
    bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan.bind(this));
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral.bind(this));
    bleManagerEmitter.addListener('BleManagerBondedPeripheral', this.handleBondedPeripheral.bind(this));
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleCharacteristicUpdate.bind(this)
    );
  }

  removeListeners() {
    bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerStopScan');
    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerBondedPeripheral');
  }

  handleAppStateChange(nextAppState: string) {
    if (nextAppState === 'active') {
      console.log('App became active. Checking connection...');
      if (!this.connectedDevice) {
        this.scanForDevices();
      }
    }
  }

  async isBluetoothEnabled(): Promise<boolean> {
    const state = await BleManager.checkState();
    return state === 'on';
  }

  async isLocationEnabled(): Promise<boolean> {
    const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    return result === RESULTS.GRANTED;
  }

  async scanForDevices() {
    if (this.simulatedPuck) {
      this.sendRequestStatus();
      return;
    }

    if (!(await this.isBluetoothEnabled())) {
      console.log('Bluetooth is not enabled');
      return;
    }

    if (!(await this.isLocationEnabled())) {
      console.log('Location is not enabled');
      return;
    }

    if (this.isScanning) {
      console.log('Already scanning for devices');
      return;
    }

    if (this.isConnecting) {
      console.log('Already in progress of connecting to a device');
      return;
    }

    this.isScanning = true;
    this.devices = [];
    this.emit('scanStarted');

    const MAX_SCAN_SECONDS = 10;
    // Set a timeout to stop the scan regardless
    const scanTimeout = setTimeout(() => {
      if (this.isScanning) {
        //console.log('(scanForDevices) Stoping the scan');
        //this.handleStopScan();
      }
    }, MAX_SCAN_SECONDS * 1000);

    try {
      console.log('Scanning for BLE devices...');
      await BleManager.scan([this.SERVICE_UUID], 0, true);
      console.log('BLE scan started');
    } catch (error) {
      console.error('Error during scanning:', error);
      this.isScanning = false;
      this.emit('scanStopped');
    } finally {
      console.log('Clear the scan timeout');
      clearTimeout(scanTimeout); // Clear the timeout if scan finishes normally
    }
  }

  startReconnectionScan() {
    const performScan = () => {
      if(this.simulatedPuck) {
        this.sendRequestStatus();
        setTimeout(performScan, this.connectedDevice ? 30000 : 500);
      }

      if(!this.simulatedPuck) {
        if(this.connectedDevice) {
          this.sendHeartbeat();
        } else {
          console.log('No device connected. Starting reconnection scan...');
          this.scanForDevices();
        }
        setTimeout(performScan, 30000);
      }
    };

    performScan();
  }

  handleStopScan() {
    if (this.isScanning) {
      this.isScanning = false;
      this.emit('scanStopped');
      console.log('Scanning stopped');
    } else {
      console.log('handleStopScan called but scanning was not active');
    }
  }

  handleDisconnectedPeripheral(data: any) {
    if (this.connectedDevice?.id === data.peripheral) {
      this.emit('SHOW_BANNER', { message: 'Puck disconnected', type: 'error' })
      this.isLocked = false;
      console.log('Puck disconnected:', data.peripheral);
      this.connectedDevice = null;
      this.emit('deviceDisconnected')
    }
  }

  // Handle bonded peripherals
  handleBondedPeripheral(data: any) {
    console.log('Bonding successful with:', data);
    // Alert.alert('Bonded', `Successfully bonded with ${data.peripheral}`);
    // this.emit('SHOW_BANNER', { message:  `Successfully bonded with ${data.peripheral}`, type: 'success' })
  }

  handleDiscoveredPeripheral(peripheral: any) {
    console.log('Discovered peripheral:', peripheral); // Log all discovered peripherals
    if (peripheral.name === 'AugOS') {
      if (this.connectedDevice) {
        console.log("HandleDiscoverPeripheral BUT WE ARE ALREADY CONNECTED UHHH??")
      }
      console.log('Found an AugOS device... Stop scan and connect');
      BleManager.stopScan();
      this.connectToDevice(peripheral);
    } else {
      this.devices.push(peripheral);
      this.emit('deviceFound', peripheral);
    }
  }

  async connectToDevice(device: Device) {
    this.isConnecting = true;
    this.emit('connectingStatusChanged', { isConnecting: true });

    try {
      console.log('Connecting to Puck:', device.id);
      await BleManager.connect(device.id);

      let isConnected = await BleManager.isPeripheralConnected(device.id, []);
      for (let i = 0; i < 5 && !isConnected; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        isConnected = await BleManager.isPeripheralConnected(device.id, []);
      }

      if (!isConnected) {
        throw new Error('Failed to connect after retries.');
      }

      console.log('Puck connected successfully:', device.id);

      if (Platform.OS === 'android') {
        const bondedDevices = await BleManager.getBondedPeripherals();
        const isBonded = bondedDevices.some(bonded => bonded.id === device.id);
        if (!isBonded) {
          const randomInt = Math.floor(Math.random() * 1000);

          console.log(`[${randomInt}] Bonding with device...`);
          await BleManager.createBond(device.id);
          console.log(`[${randomInt}] bonding ended`);
        }
      }

      const services = await BleManager.retrieveServices(device.id);
      // console.log('Retrieved services and characteristics:', JSON.stringify(services, null, 2));

      if (Platform.OS === 'android') {
        try {
          this.mtuSize = 23;
          const mtu = await BleManager.requestMTU(device.id, 251);
          this.mtuSize = mtu;
          console.log(`MTU set to ${mtu}`);
        } catch {
          console.warn('MTU negotiation failed. Using default 23.');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('\n\nENABLING NOTIFICATIONS\n\n');
      await this.enableNotifications(device.id);

      this.connectedDevice = device;
      this.emit('deviceConnected', device);

      await this.sendRequestStatus();
    } catch (error) {
      // console.error('Error connecting to puck:', error);
      this.emit('SHOW_BANNER', { message: 'Error connecting to Puck: ' + error, type: 'error' });
    }

    this.isConnecting = false;
    this.emit('connectingStatusChanged', { isConnecting: false });
  }


  async enableNotifications(deviceId: string) {
    try {
      await BleManager.startNotification(deviceId, this.SERVICE_UUID, this.CHARACTERISTIC_UUID);
      console.log('Notifications enabled');
    } catch (error) {
      // console.error('Failed to enable notifications:', error);
      this.emit('SHOW_BANNER', { message: 'Failed to enable notifications: ' + error, type: 'error' });
    }
  }

  async disconnectFromDevice() {
    if (!this.connectedDevice) {
      console.log('No device connected');
      return;
    }

    this.isLocked = false;
    try {
      await BleManager.disconnect(this.connectedDevice.id);
      this.connectedDevice = null;
      this.emit('deviceDisconnected')
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  async readCharacteristic() {
    if (!this.connectedDevice) {
      console.log('No connected device to read from');
      return;
    }

    try {
      const data = await BleManager.read(this.connectedDevice.id, this.SERVICE_UUID, this.CHARACTERISTIC_UUID);
      this.emit('dataReceived', data);
      console.log('\n\nRECEIVED DATA FROM AUGMENTOS_MAIN:\n' + data + '\n\n');
      return data;
    } catch (error) {
      // console.error('Error reading characteristic:', error);
      // Alert.alert('Read Error', 'Failed to read data from device');
      this.emit('SHOW_BANNER', { message: 'Read Error - Failed to read data from device', type: 'error' })
    }
  }

  handleCharacteristicUpdate(data: any) {
    // console.log('Characteristic update received:', data);

    if (data.peripheral === this.connectedDevice?.id && data.characteristic === this.CHARACTERISTIC_UUID) {
      const deviceId = data.peripheral;
      const value = data.value; // This is an array of bytes (number[])

      // Convert value array to Uint8Array
      const byteArray = Uint8Array.from(value);

      // Read sequence number and total chunks
      const sequenceNumber = byteArray[0];
      const totalChunks = byteArray[1];

      const chunkData = byteArray.slice(2);

      // Initialize storage for this device if necessary
      if (!this.chunks[deviceId]) {
        this.chunks[deviceId] = [];
        this.expectedChunks[deviceId] = totalChunks;
      }

      // Store the chunk at the correct position
      this.chunks[deviceId][sequenceNumber] = chunkData;

      // Check if all chunks have been received
      const receivedChunks = this.chunks[deviceId].filter((chunk: any) => chunk !== undefined).length;
      if (receivedChunks === this.expectedChunks[deviceId]) {
        // All chunks received, reconstruct the data
        const completeData = this.concatenateUint8Arrays(this.chunks[deviceId]);

        // Decode Uint8Array to string
        const textDecoder = new TextDecoder('utf-8');
        const jsonString = textDecoder.decode(completeData);

        // Process the JSON data
        try {
          console.log('Received raw data:', jsonString);
          const jsonData = JSON.parse(jsonString);
          this.emit('dataReceived', jsonData);
          this.parseDataFromAugmentOsCore(jsonData);
        } catch (error) {
          console.log("(ERROR) RAW DATA RECEIVED:", jsonString);
          console.error('Error parsing JSON data:', error);
        }

        // Clear stored data
        delete this.chunks[deviceId];
        delete this.expectedChunks[deviceId];
      }
    }
  }

  // Helper function to concatenate Uint8Array chunks
  concatenateUint8Arrays(chunks: Uint8Array[]): Uint8Array {
    let totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    let result = new Uint8Array(totalLength);
    let offset = 0;
    for (let chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  parseDataFromAugmentOsCore(jsonData: Object) {
    if (!jsonData) return;
    if ('status' in jsonData) {
      this.emit('statusUpdateReceived', jsonData);
    } else if ('glasses_display_data' in jsonData) {
      // Handle screen mirror status
    } else if ('ping' in jsonData) {
      // Do nothing?
    }
  }

  async writeCharacteristic(data: number[]) {
    if (!this.connectedDevice) {
      console.log('No connected device to write to');
      return;
    }

    try {
      await BleManager.write(this.connectedDevice.id, this.SERVICE_UUID, this.CHARACTERISTIC_UUID, data);
      console.log('Data written successfully');
    } catch (error) {
      // console.error('Error writing characteristic:', error);
      this.emit('SHOW_BANNER', { message: 'Failed to write data to device', type: 'error' })
    }
  }

  async writeWithoutResponse(data: number[]) {
    if (!this.connectedDevice) {
      console.log('No connected device to write to without response');
      return;
    }

    try {
      await BleManager.writeWithoutResponse(this.connectedDevice.id, this.SERVICE_UUID, this.CHARACTERISTIC_UUID, data);
      console.log('Data written without response');
    } catch (error) {
      //console.error('Error writing without response:', error);
      //Alert.alert('Write Error', 'Failed to write data without response to device');
      this.emit('SHOW_BANNER', { message: 'Failed to write data without response to device', type: 'error' })
    }
  }

  async sendDataToAugmentOs(dataObj: any) {
    if(this.simulatedPuck){
      console.log("Sending command to simulated puck/core...")
      ManagerCoreCommsService.sendCommandToCore(JSON.stringify(dataObj));
      return;
    }

    if (!this.connectedDevice) {
      console.log('SendDataToAugmentOs: No connected device to write to');
      this.emit('deviceDisconnected');
      return;
    }

    if (this.isLocked) {
      console.log('Action is locked. Ignoring button press.');
      return;
    }

    this.isLocked = true;

    try {
      // Convert data to byte array
      const data = JSON.stringify(dataObj);
      const byteData = Array.from(data).map((char) => char.charCodeAt(0));

      const mtuSize = this.mtuSize || 23; // Use negotiated MTU size, or default to 23
      const maxChunkSize = mtuSize - 3; // Subtract 3 bytes for ATT protocol overhead

      let responseReceived = false;

      // Split data into chunks
      for (let i = 0; i < byteData.length; i += maxChunkSize) {
        const chunk = byteData.slice(i, i + maxChunkSize);

        setTimeout(async () => {
          // Send each chunk
          await BleManager.write(
            //@ts-ignore
            this.connectedDevice.id,
            this.SERVICE_UUID,
            this.CHARACTERISTIC_UUID,
            chunk,
            maxChunkSize
          );
        }, 250 * i)
      }

      console.log('Data chunk written, waiting for response...');

      // Wait for response or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!responseReceived) {
            console.log('No response received within timeout. Triggering reconnection...');
            this.handleDisconnectedPeripheral({ peripheral: this.connectedDevice?.id });
            reject(new Error('Response timeout for data: ' + JSON.stringify(dataObj)));
          }
        }, 6000); // Timeout after 5 seconds

        this.once('dataReceived', (data) => {
          /*
          TODO: This does not validate that the response we got pertains to the command we sent
          But at the same time we're literally only accepting status objects right now
          so it doesn't really matter
          */
          responseReceived = true;
          this.isLocked = false;
          clearTimeout(timeout);
          // console.log('GOT A RESPONSE FROM THE THING SO ALL GOOD CUZ');
          resolve(null);
        });
      });
    } catch (error) {
      // console.error('Error writing data:', error);
      // Alert.alert('Write Error', 'Failed to write data to device: ' + error);
      this.emit('SHOW_BANNER', { message: 'Write Error - Failed to write data to device: ' + error, type: 'error' })
      this.disconnectFromDevice();
    }
  }

  /* AugmentOS Comms Methods (call these to do things) */

  async sendHeartbeat() {
    console.log('Send Connection Check');
    return await this.sendDataToAugmentOs(
      { 'command': 'ping' }
    );
  }

  async sendRequestStatus() {
    console.log('Send Request Status');
    return await this.sendDataToAugmentOs(
      { 'command': 'request_status' }
    );
  }

  async sendConnectWearable() {
    console.log('sendConnectWearable');
    return await this.sendDataToAugmentOs(
      { 'command': 'connect_wearable' }
    );
  }

  async sendDisconnectWearable() {
    console.log('sendDisconnectWearable');
    return await this.sendDataToAugmentOs(
      { 'command': 'disconnect_wearable' }
    );
  }

  async sendToggleVirtualWearable(enabled: boolean) {
    console.log('sendToggleVirtualWearable');
    return await this.sendDataToAugmentOs(
      {
        'command': 'enable_virtual_wearable',
        'params': {
          'enabled': enabled,
        },
      }
    );
  }

  async startAppByPackageName(packageName: string) {
    console.log('startAppByPackageName');
    return await this.sendDataToAugmentOs(
      {
        'command': 'start_app',
        'params': {
          'target': packageName,
        },
      }
    );
  }

  async stopAppByPackageName(packageName: string) {
    console.log('stopAppByPackageName');
    return await this.sendDataToAugmentOs(
      {
        'command': 'stop_app',
        'params': {
          'target': packageName,
        },
      }
    );
  }

  async setAuthenticationSecretKey(authSecretKey: string) {
    console.log('setAuthenticationSecretKey');
    return await this.sendDataToAugmentOs(
      {
        'command': 'set_auth_secret_key',
        'params': {
          'authSecretKey': authSecretKey,
        },
      }
    );
  }

  async verifyAuthenticationSecretKey() {
    console.log('verifyAuthenticationSecretKey');
    return await this.sendDataToAugmentOs(
      {
        'command': 'verify_auth_secret_key',
      }
    );
  }

  async deleteAuthenticationSecretKey() {
    console.log('deleteAuthenticationSecretKey');
    return await this.sendDataToAugmentOs(
      {
        'command': 'delete_auth_secret_key',
      }
    );
  }

  private static bluetoothService: BluetoothService | null = null;
  public static getInstance() : BluetoothService {
    if (!BluetoothService.bluetoothService) {
      BluetoothService.bluetoothService = new BluetoothService();
      BluetoothService.bluetoothService.initialize();
    }
    return BluetoothService.bluetoothService;
  }

  public static resetInstance = async () => {
    if (BluetoothService.bluetoothService) {
      await BluetoothService.bluetoothService.disconnectFromDevice();
      BluetoothService.bluetoothService = null;
    }
  }
}
export default BluetoothService;

const bluetoothService = BluetoothService.getInstance();