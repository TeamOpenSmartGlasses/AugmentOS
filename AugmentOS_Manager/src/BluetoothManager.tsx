import React, { useState, useEffect } from 'react';
import { Button, Text, View, FlatList, Alert, PermissionsAndroid, NativeEventEmitter, NativeModules } from 'react-native';
import BleManager from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

interface Device {
  id: string;
  name: string | null;
  rssi: number;
}



const BluetoothManager = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const SERVICE_UUID:string = "12345678-1234-5678-1234-56789abcdef0";
  const CHARACTERISTIC_UUID:string = "abcdef12-3456-789a-bcde-f01234567890";

  useEffect(() => {
    // Initialize BLE Manager
    const initializeBleManager = async () => {
      try {
        await BleManager.start({ showAlert: false });
        console.log('BLE Manager initialized');
      } catch (error) {
        console.error('Failed to initialize BLE Manager:', error);
      }
    };

    initializeBleManager();

    // Register event listeners
    const discoverPeripheralListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoveredPeripheral
    );

    const disconnectListener = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral
    );

    const bondListener = bleManagerEmitter.addListener(
      'BleManagerBondedPeripheral',
      handleBondedPeripheral
    );

    return () => {
      discoverPeripheralListener.remove();
      disconnectListener.remove();
      bondListener.remove();
    };
  }, []);

  // Handle discovered peripherals
  const handleDiscoveredPeripheral = (peripheral: any) => {
    console.log('Discovered peripheral:', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'Unknown Device';
    }

    setDevices((prevDevices) => {
      const deviceExists = prevDevices.some((d) => d.id === peripheral.id);
      if (!deviceExists) {
        return [...prevDevices, peripheral];
      }
      return prevDevices;
    });
  };

  // Handle bonded peripherals
  const handleBondedPeripheral = (data: any) => {
    console.log('Bonding successful with:', data);
    Alert.alert('Bonded', `Successfully bonded with ${data.peripheral}`);
  };

  // Handle device disconnection
  const handleDisconnectedPeripheral = (data: any) => {
    console.log('Disconnected from:', data.peripheral);
    if (connectedDevice?.id === data.peripheral) {
      setConnectedDevice(null);
    }
  };

  // Request Bluetooth permissions (Android only)
  const requestPermissions = async () => {
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
  };

  // Start scanning for peripherals
  const scanForDevices = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setDevices([]);

    try {
      await BleManager.scan([SERVICE_UUID], 10, true);
      console.log('Scanning for BLE devices...');
    } catch (error) {
      console.error('Error during scanning:', error);
    }

    bleManagerEmitter.addListener('BleManagerStopScan', () => {
      setIsScanning(false);
      console.log('Scanning stopped');
    });
  };

  // Connect to a peripheral and bond
  const connectToDevice = async (device: Device) => {
    try {
      await BleManager.connect(device.id);
      console.log(`Connected to ${device.name}`);
      setConnectedDevice(device);

      // Attempt to bond with the device
      BleManager.createBond(device.id); // No need to await, use event listener to track success

      // Retrieve services after connecting
      const services = await BleManager.retrieveServices(device.id);
      console.log('Retrieved services:', services);

    } catch (error) {
      console.error(`Error connecting to ${device.name}:`, error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>BLE Manager</Text>
      <Button title="Scan for Devices" onPress={scanForDevices} />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Text>{`${item.name} (RSSI: ${item.rssi})`}</Text>
            <Button
              title={`Connect to ${item.name || item.id}`}
              onPress={() => connectToDevice(item)}
              disabled={!!connectedDevice}
            />
          </View>
        )}
      />

      {connectedDevice && (
        <View style={{ marginTop: 20 }}>
          <Text>Connected to: {connectedDevice.name}</Text>
        </View>
      )}
    </View>
  );
};

export default BluetoothManager;
