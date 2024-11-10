// BluetoothService.tsx
import { NativeEventEmitter, NativeModules, Alert } from 'react-native';
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

  // Match UUIDs with AugOS
  SERVICE_UUID: string = '12345678-1234-5678-1234-56789abcdef0';
  CHARACTERISTIC_UUID: string = 'abcdef12-3456-789a-bcde-f01234567890';

  constructor() {
    super();
    this.initializeBleManager();
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
  }

  removeListeners() {
    bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerStopScan');
    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
  }

  async scanForDevices() {
    if (this.isScanning) {
      console.log('Already scanning');
      return;
    }

    this.isScanning = true;
    this.devices = [];
    this.emit('scanStarted');

    try {
      await BleManager.scan([this.SERVICE_UUID], 5, true);
      console.log('Scanning for BLE devices...');
    } catch (error) {
      console.error('Error during scanning:', error);
      this.isScanning = false;
      this.emit('scanStopped');
    }
  }

  handleDiscoveredPeripheral(peripheral: any) {
    console.log('Discovered peripheral:', peripheral); // Log all discovered peripherals
    if (peripheral.name === 'AugOS') {
      BleManager.stopScan();
      this.connectToDevice(peripheral);
    } else {
      this.devices.push(peripheral);
      this.emit('deviceFound', peripheral);
    }
  }


  handleStopScan() {
    this.isScanning = false;
    this.emit('scanStopped');
    console.log('Scanning stopped');
  }

  handleDisconnectedPeripheral(data: any) {
    if (this.connectedDevice?.id === data.peripheral) {
      this.connectedDevice = null;
      this.emit('deviceDisconnected');
    }
  }

  async connectToDevice(device: Device) {
    try {
      await BleManager.connect(device.id);
      this.connectedDevice = device;
      this.emit('deviceConnected', device);

      const services = await BleManager.retrieveServices(device.id);
      console.log('Retrieved services:', services);

      await BleManager.startNotification(device.id, this.SERVICE_UUID, this.CHARACTERISTIC_UUID);
    } catch (error) {
      console.error(`Error connecting to ${device.name}:`, error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
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
      this.emit('deviceDisconnected');
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
      return data;
    } catch (error) {
      console.error('Error reading characteristic:', error);
      Alert.alert('Read Error', 'Failed to read data from device');
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
}
