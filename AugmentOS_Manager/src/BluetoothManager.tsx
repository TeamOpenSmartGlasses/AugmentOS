import React, { useState, useEffect } from 'react';
import { Button, Text, View, FlatList, Alert, TextInput } from 'react-native';
import { BluetoothService, Device } from './BluetoothService';
import AugmentOSParser from './AugmentOSStatusParser';
import { useStatus } from './AugmentOSStatusProvider';

const BluetoothManager = () => {
  const [bluetoothService, setBluetoothService] = useState<BluetoothService | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [inputData, setInputData] = useState(''); // For sending data via write
  const [receivedData, setReceivedData] = useState<string | null>(null); // For showing received data

  const { refreshStatus } = useStatus(); // Get context functions

  // Initialize the BluetoothService and set listeners
  useEffect(() => {
    const service = new BluetoothService();
    setBluetoothService(service);

    // Listen for updates from the BluetoothService
    service.on('devicesUpdated', (updatedDevices: Device[]) => setDevices(updatedDevices));
    service.on('scanStarted', () => setIsScanning(true));
    service.on('scanStopped', () => setIsScanning(false));
    service.on('deviceConnected', (device: Device) => setConnectedDevice(device));
    service.on('deviceDisconnected', () => setConnectedDevice(null));
    service.on('dataReceived', (data: any) => handleReceivedData(data));

    return () => {
      service.removeAllListeners(); // Clean up listeners on unmount
    };
  }, []);

  const handleScanForDevices = async () => {
    if (bluetoothService) {
      await bluetoothService.scanForDevices();
    }
  };

  const handleWriteData = async (data: string) => {
    if (bluetoothService && data) {
      const dataToSend = Array.from(data).map((char) => char.charCodeAt(0)); // Convert string to byte array
      await bluetoothService.writeCharacteristic(dataToSend);
      Alert.alert('Data Sent', `Sent: ${data}`);
    } else {
      Alert.alert('No Data', 'Please enter some data to send.');
    }
  };

  const handleWriteWithoutResponse = async () => {
    if (bluetoothService && inputData) {
      const dataToSend = Array.from(inputData).map((char) => char.charCodeAt(0));
      await bluetoothService.writeWithoutResponse(dataToSend);
      Alert.alert('Data Sent', `Sent without response: ${inputData}`);
    } else {
      Alert.alert('No Data', 'Please enter some data to send.');
    }
  };

  const handleReadData = async () => {
    if (bluetoothService) {
      const data = await bluetoothService.readCharacteristic();
      setReceivedData(data ? String.fromCharCode(...data) : 'No data');
    }
  };

  const handleReceivedData = (data: any) => {
    const decodedData = String.fromCharCode(...data); // Convert byte array to string
    setReceivedData(decodedData);

    try {
      // TODO: Uncomment this... use test data for now
      const parsedData = JSON.parse(data);
      refreshStatus(parsedData); // Refresh status in context
    }
    catch (e) {
      console.log("ERROR PARSING:", e)
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Bluetooth Manager</Text>

      <Button title="Scan for Devices" onPress={handleScanForDevices} disabled={isScanning} />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Text>{`${item.name} (RSSI: ${item.rssi})`}</Text>
            <Button
              title={`Connect to ${item.name || item.id}`}
              onPress={() => bluetoothService?.connectToDevice(item)}
              disabled={!!connectedDevice || isScanning}
            />
          </View>
        )}
      />

      {connectedDevice && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Connected to: {connectedDevice.name}
          </Text>

          <View style={{ marginTop: 10 }}>
            <TextInput
              style={{
                height: 40,
                borderColor: 'gray',
                borderWidth: 1,
                marginBottom: 10,
                paddingLeft: 8,
              }}
              placeholder="Enter data to send"
              value={inputData}
              onChangeText={setInputData}
            />

            <Button title="Write Data" onPress={() => handleWriteData(inputData)} />
            <View style={{ marginTop: 10 }} />
            <Button title="Write Without Response" onPress={handleWriteWithoutResponse} />
            <View style={{ marginTop: 10 }} />
            <Button title="Read Data" onPress={handleReadData} />

            {receivedData && (
              <View style={{ marginTop: 20 }}>
                <Text>Received Data: {receivedData}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default BluetoothManager;
