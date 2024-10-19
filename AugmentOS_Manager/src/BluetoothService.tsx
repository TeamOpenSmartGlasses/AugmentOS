import { NativeEventEmitter, NativeModules, PermissionsAndroid, Alert } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { EventEmitter } from 'events';

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

  SERVICE_UUID: string = "12345678-1234-5678-1234-56789abcdef0";
  CHARACTERISTIC_UUID: string = "abcdef12-3456-789a-bcde-f01234567890";

  constructor() {
    super();
    this.initializeBleManager();
  }

  // Initialize BLE Manager
  async initializeBleManager() {
    try {
      await BleManager.start({ showAlert: false });
      console.log('BLE Manager initialized');
      this.addListeners();
    } catch (error) {
      console.error('Failed to initialize BLE Manager:', error);
    }
  }

  // Add BLE event listeners
  addListeners() {
    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoveredPeripheral.bind(this));
    bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan.bind(this));
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral.bind(this));
    bleManagerEmitter.addListener('BleManagerBondedPeripheral', this.handleBondedPeripheral.bind(this));
  }

  // Remove BLE event listeners
  removeListeners() {
    bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerStopScan');
    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerBondedPeripheral');
  }

  // Handle discovered peripherals
  handleDiscoveredPeripheral(peripheral: any) {
    if (!peripheral.name) {
      peripheral.name = 'Unknown Device';
    }

    const deviceExists = this.devices.some((d) => d.id === peripheral.id);
    if (!deviceExists) {
      this.devices = [...this.devices, peripheral];
      this.emit('devicesUpdated', this.devices); // Notify UI about new devices
    }
  }

  // Handle stop scanning event
  handleStopScan() {
    this.isScanning = false;
    this.emit('scanStopped');
    console.log('Scanning stopped');
  }

  // Handle disconnected peripherals
  handleDisconnectedPeripheral(data: any) {
    console.log(`Disconnected from: ${data.peripheral}`);
    if (this.connectedDevice?.id === data.peripheral) {
      this.connectedDevice = null;
      this.emit('deviceDisconnected');
    }
  }

  // Handle bonded peripherals
  handleBondedPeripheral(data: any) {
    console.log('Bonding successful with:', data);
    Alert.alert('Bonded', `Successfully bonded with ${data.peripheral}`);
  }

  // Request Bluetooth permissions (Android only)
  async requestPermissions() {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      if (
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log('Bluetooth permissions granted');
      } else {
        Alert.alert('Permissions Denied', 'Please grant Bluetooth permissions to use this feature');
      }
    } catch (err) {
      console.warn('Permission error:', err);
    }
  }

  // Start scanning for peripherals
  async scanForDevices() {
    if (this.isScanning) return;

    this.isScanning = true;
    this.devices = [];
    this.emit('scanStarted'); // Notify UI that scanning started

    try {
      await BleManager.scan([this.SERVICE_UUID], 10, true);
      console.log('Scanning for BLE devices...');
    } catch (error) {
      console.error('Error during scanning:', error);
      this.isScanning = false;
      this.emit('scanStopped'); // Ensure UI updates on error
    }
  }

  // Stop scanning manually
  async stopScan() {
    try {
      await BleManager.stopScan();
      console.log('Manually stopped scanning');
      this.isScanning = false;
      this.emit('scanStopped');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }

  // Connect to a peripheral and bond
  async connectToDevice(device: Device) {
    try {
      await BleManager.connect(device.id);
      console.log(`Connected to ${device.name}`);
      this.connectedDevice = device;
      this.emit('deviceConnected', device);

      // Create a bond with the device
      await BleManager.createBond(device.id);

      // Retrieve services
      const services = await BleManager.retrieveServices(device.id);
      console.log('Retrieved services:', services);
    } catch (error) {
      console.error(`Error connecting to ${device.name}:`, error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
    }
  }

  // Disconnect from a peripheral
  async disconnectFromDevice() {
    if (!this.connectedDevice) return;

    try {
      await BleManager.disconnect(this.connectedDevice.id);
      console.log(`Disconnected from ${this.connectedDevice.name}`);
      this.connectedDevice = null;
      this.emit('deviceDisconnected');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  // Read data from a characteristic
  async readCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string) {
    try {
      const data = await BleManager.read(deviceId, serviceUUID, characteristicUUID);
      console.log('Read data:', data);
      return data;
    } catch (error) {
      console.error('Error reading characteristic:', error);
      throw error;
    }
  }

  // Write data to a characteristic
  async writeCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string, data: number[]) {
    try {
      await BleManager.write(deviceId, serviceUUID, characteristicUUID, data);
      console.log('Data written successfully');
    } catch (error) {
      console.error('Error writing characteristic:', error);
      throw error;
    }
  }
}
