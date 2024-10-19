import React, { useState, useEffect } from 'react';
import { Button, Text, View, FlatList, Alert } from 'react-native';
import { BluetoothService, Device } from './BluetoothService';

const BluetoothManager = () => {
  const [bluetoothService, setBluetoothService] = useState<BluetoothService | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const service = new BluetoothService();
    setBluetoothService(service);

    // Listen for updates from BluetoothService
    service.on('devicesUpdated', (updatedDevices: Device[]) => setDevices(updatedDevices));
    service.on('scanStarted', () => setIsScanning(true));
    service.on('scanStopped', () => setIsScanning(false));

    return () => {
      service.removeAllListeners(); // Clean up listeners on unmount
    };
  }, []);

  const scanForDevices = async () => {
    if (bluetoothService) {
      await bluetoothService.scanForDevices();
    }
  };

  const connectToDevice = async (device: Device) => {
    if (bluetoothService) {
      try {
        await bluetoothService.connectToDevice(device);
        setConnectedDevice(bluetoothService.connectedDevice);
      } catch (error) {
        Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
      }
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>BLE Manager</Text>
      <Button title="Scan for Devices" onPress={scanForDevices} disabled={isScanning} />

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
