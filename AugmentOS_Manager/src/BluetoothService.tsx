// BluetoothService.tsx
import { NativeEventEmitter, NativeModules, Alert } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { EventEmitter } from 'events';
import { TextDecoder } from 'text-encoding';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { AppState } from 'react-native';

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
  mtuSize = 23;
  chunks: any = {};
  expectedChunks: any = {};

  // Match UUIDs with AugOS
  SERVICE_UUID: string = '12345678-1234-5678-1234-56789abcdef0';
  CHARACTERISTIC_UUID: string = 'abcdef12-3456-789a-bcde-f01234567890';

  isLocked: boolean = false;

  constructor() {
    super();
    this.initializeBleManager();
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

    this.isScanning = true;
    this.devices = [];
    this.emit('scanStarted');

    const MAX_SCAN_SECONDS = 10
    // Set a timeout to stop the scan regardless
    const scanTimeout = setTimeout(() => {
      if (this.isScanning) {
        console.log("(scanForDevices) Stoping the scan")
        this.handleStopScan();
      }
    }, MAX_SCAN_SECONDS * 1000);

    try {
      console.log('Scanning for BLE devices...');
      await BleManager.scan([this.SERVICE_UUID], MAX_SCAN_SECONDS, true);
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
    setInterval(() => {
      if (!this.connectedDevice) {
        console.log('No device connected. Starting reconnection scan...');
        this.scanForDevices();
      }
    }, 30000); // Scan every 30 seconds
  }


  handleDiscoveredPeripheral(peripheral: any) {
    console.log('Discovered peripheral:', peripheral); // Log all discovered peripherals
    if (peripheral.name === 'AugOS') {
      console.log('Found an AugOS device... Stop scan and connect');
      BleManager.stopScan();
      this.connectToDevice(peripheral);
    } else {
      this.devices.push(peripheral);
      this.emit('deviceFound', peripheral);
    }
  }


  handleStopScan() {
    if (this.isScanning) {
      this.isScanning = false;
      this.emit('scanStopped');
      console.log('Scanning stopped');
    } else {
      console.log("handleStopScan called but scanning was not active");
    }
  }

  handleDisconnectedPeripheral(data: any) {
    if (this.connectedDevice?.id === data.peripheral) {
      console.log(`Disconnected from ${data.peripheral}, attempting to reconnect...`);
      this.connectedDevice = null;
      // Attempt to reconnect
      // setTimeout(async () => {
      //   try {
      //     const peripheral = this.devices.find((device) => device.id === data.peripheral);
      //     if (peripheral) {
      //       console.log(`Reconnecting to ${peripheral.name}`);
      //       await this.connectToDevice(peripheral);
      //     } else {
      //       console.log('Peripheral not found in cached devices');
      //     }
      //   } catch (error) {
      //     console.error('Reconnection attempt failed:', error);
      //   }
      // }, 5000); // Retry after 5 seconds
    }
  }
  // Handle bonded peripherals
  handleBondedPeripheral(data: any) {
    console.log('Bonding successful with:', data);
    Alert.alert('Bonded', `Successfully bonded with ${data.peripheral}`);
  }


  async connectToDevice(device: Device) {
    try {
      console.log('\n\nCONNECTING TO PUCK\n\n');
      await BleManager.connect(device.id);

      // Poll to confirm the device is actually connected
      let isConnected = await BleManager.isPeripheralConnected(device.id, []);
      if (!isConnected) {
        // Retry a few times with a slight delay
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          isConnected = await BleManager.isPeripheralConnected(device.id, []);
          if (isConnected) {
            break;
          }
        }
      }

      if (!isConnected) {
        throw new Error(`Failed to connect to ${device.name} after multiple attempts`);
      }

      console.log('\n\nCHECKING BONDING STATUS\n\n');
      const bondedDevices = await BleManager.getBondedPeripherals();
      const isAlreadyBonded = bondedDevices.some(bondedDevice => bondedDevice.id === device.id);

      if (!isAlreadyBonded) {
        console.log(`Device ${device.id} is not bonded. Initiating bond process...`);
        await BleManager.createBond(device.id);
        console.log('Bonding process complete.');
      } else {
        console.log(`Device ${device.id} is already bonded.`);
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('\n\nGETTING PUCK SERVICES\n\n');
        const services = await BleManager.retrieveServices(device.id);
        console.log('Retrieved services:', services);
      } catch (error) {
        console.error('Error retrieving services:', error);
      }

      try {
        this.mtuSize = 23; //default mtu size
        const mtu = await BleManager.requestMTU(device.id, 512);//512 supposed to be max mtu
        console.log(`MTU size changed to ${mtu}`);
        this.mtuSize = mtu;
      } catch (error) {
        console.error('MTU exchange error:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('\n\nENABLING NOTIFICATIONS\n\n');
      await this.enableNotifications(device.id);

      this.connectedDevice = device;
      this.emit('deviceConnected', device);

      await this.sendRequestStatus();
    } catch (error) {
      console.error(`Error connecting to ${device.name}:`, error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
    }
  }

  async enableNotifications(deviceId: string) {
    try {
      await BleManager.startNotification(deviceId, this.SERVICE_UUID, this.CHARACTERISTIC_UUID);
      console.log('Notifications enabled');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  }

  async disconnectFromDevice() {
    if (!this.connectedDevice) {
      console.log('No device connected');
      return;
    }

    try {
      await BleManager.disconnect(this.connectedDevice.id);
      this.connectedDevice = null;
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
      console.error('Error reading characteristic:', error);
      Alert.alert('Read Error', 'Failed to read data from device');
    }
  }

  handleCharacteristicUpdate(data: any) {
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
          const jsonData = JSON.parse(jsonString);
          console.log('Received JSON data:', jsonData);
          this.emit('dataReceived', jsonData);
        } catch (error) {
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

  async writeCharacteristic(data: number[]) {
    if (!this.connectedDevice) {
      console.log('No connected device to write to');
      return;
    }

    try {
      await BleManager.write(this.connectedDevice.id, this.SERVICE_UUID, this.CHARACTERISTIC_UUID, data);
      console.log('Data written successfully');
    } catch (error) {
      console.error('Error writing characteristic:', error);
      Alert.alert('Write Error', 'Failed to write data to device');
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
      console.error('Error writing without response:', error);
      Alert.alert('Write Error', 'Failed to write data without response to device');
    }
  }

  async sendDataToAugmentOs(dataObj: any) {
    if (!this.connectedDevice) {
      console.log('SendDataToAugmentOs: No connected device to write to');
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

        // Send each chunk
        await BleManager.write(
          this.connectedDevice.id,
          this.SERVICE_UUID,
          this.CHARACTERISTIC_UUID,
          chunk,
          maxChunkSize
        );
      }

      console.log('Data chunk written, waiting for response...');

      // Wait for response or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!responseReceived) {
            console.log('No response received within timeout. Triggering reconnection...');
            this.handleDisconnectedPeripheral({ peripheral: this.connectedDevice?.id });
            reject(new Error('Response timeout'));
          }
        }, 6000); // Timeout after 5 seconds

        this.once('dataReceived', (data) => {
          /* 
          TODO: This does not validate that the response we got pertains to the command we sent
          But at the same time we're literally only accepting status objects right now
          so it doesn't really matter 
          */
            responseReceived = true;
            this.isLocked=false;
            clearTimeout(timeout);
            console.log('GOT A RESPONSE FROM THE THING SO ALL GOOD CUZ');
            resolve(null);
        });
      });
    } catch (error) {
      // console.error('Error writing data:', error);
      Alert.alert('Write Error', 'Failed to write data to device');
    }
  }

  /* AugmentOS Comms Methods (call these to do things) */

  async sendRequestStatus() {
    console.log('Send Request Status');
    return await this.sendDataToAugmentOs(
      { 'command': 'request_status' }
    );
  }

  async sendConnectWearable() {
    console.log('sendConnectWearable')
    return await this.sendDataToAugmentOs(
      { 'command': 'connect_wearable' }
    );
  }

  async sendDisconnectWearable() {
    console.log('sendDisconnectWearable')
    return await this.sendDataToAugmentOs(
      { 'command': 'disconnect_wearable' }
    );
  }

  async sendToggleVirtualWearable(enabled: boolean) {
    console.log('sendToggleVirtualWearable')
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
    console.log('startAppByPackageName')
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
    console.log('stopAppByPackageName')
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
    console.log('setAuthenticationSecretKey')
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
    console.log('verifyAuthenticationSecretKey')
    return await this.sendDataToAugmentOs(
      {
        'command': 'verify_auth_secret_key',
      }
    );
  }

  async deleteAuthenticationSecretKey() {
    console.log('deleteAuthenticationSecretKey')
    return await this.sendDataToAugmentOs(
      {
        'command': 'delete_auth_secret_key',
      }
    );
  }

}

export const bluetoothService = new BluetoothService();
