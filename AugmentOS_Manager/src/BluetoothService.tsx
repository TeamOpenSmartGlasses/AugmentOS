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

  // Handle discovered peripherals (auto-connect logic here)
  async handleDiscoveredPeripheral(peripheral: any) {
    if (!peripheral.name) {
      peripheral.name = 'Unknown Device';
    }

    const deviceExists = this.devices.some((d) => d.id === peripheral.id);
    if (!deviceExists) {
      this.devices = [...this.devices, peripheral];
      this.emit('devicesUpdated', this.devices); // Notify UI about new devices

      // Attempt automatic connection to the device
      console.log(`Attempting to connect to ${peripheral.name || peripheral.id}...`);
      await this.connectToDevice(peripheral);
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

  // Connect to a peripheral and bond
  async connectToDevice(device: Device) {
    try {
      await BleManager.connect(device.id);
      console.log(`Connected to ${device.name}`);
      this.connectedDevice = device;
      this.emit('deviceConnected', device);

      // Retrieve services and characteristics
      const services = await BleManager.retrieveServices(device.id);
      console.log('Retrieved services:', services);

      // Create a bond with the device
      await BleManager.createBond(device.id);

      // Enable notifications for the device
      await this.enableNotifications(device.id);
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
  async readCharacteristic() {
    if (!this.connectedDevice) {
      console.warn('No device connected');
      return;
    }

    try {
      const data = await BleManager.read(
        this.connectedDevice.id,
        this.SERVICE_UUID,
        this.CHARACTERISTIC_UUID
      );
      console.log('Read data:', data);
      this.emit('dataReceived', data); // Notify UI about received data
      return data;
    } catch (error) {
      console.error('Error reading characteristic:', error);
    }
  }

  // Write data to a characteristic
  async writeCharacteristic(data: number[]) {
    if (!this.connectedDevice) {
      console.warn('No device connected');
      return;
    }

    try {
      await BleManager.write(
        this.connectedDevice.id,
        this.SERVICE_UUID,
        this.CHARACTERISTIC_UUID,
        data
      );
      console.log('Data written successfully');
    } catch (error) {
      console.error('Error writing characteristic:', error);
    }
  }

  // Write without response (for fast data writes)
  async writeWithoutResponse(data: number[]) {
    if (!this.connectedDevice) {
      console.warn('No device connected');
      return;
    }

    try {
      await BleManager.writeWithoutResponse(
        this.connectedDevice.id,
        this.SERVICE_UUID,
        this.CHARACTERISTIC_UUID,
        data
      );
      console.log('Data written without response');
    } catch (error) {
      console.error('Error writing without response:', error);
    }
  }

  async enableNotifications (deviceId: string) {
    try {
      await BleManager.startNotification(deviceId, this.SERVICE_UUID, this.CHARACTERISTIC_UUID);
      console.log('Notifications enabled');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };
}
