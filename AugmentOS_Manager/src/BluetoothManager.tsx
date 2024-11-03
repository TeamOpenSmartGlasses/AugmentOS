import React, { useState, useEffect, useCallback } from 'react';
import { Button, Text, View, FlatList, Alert, TextInput, StyleSheet } from 'react-native';
// import AugmentOSParser from './AugmentOSStatusParser';
import { BluetoothService, Device } from './BluetoothService';
import { useStatus } from './AugmentOSStatusProvider';

interface BluetoothManagerProps {
  isDarkTheme: boolean;
}

const BluetoothManager: React.FC<BluetoothManagerProps> = ({ isDarkTheme }) => {
  const [bluetoothService, setBluetoothService] = useState<BluetoothService | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [inputData, setInputData] = useState(''); // For sending data via write
  const [receivedData, setReceivedData] = useState<string | null>(null); // For showing received data

  const { refreshStatus } = useStatus(); // Get context functions

  // Memoize the handleReceivedData function to prevent recreation on every render
  const handleReceivedData = useCallback((data: any) => {
    const decodedData = String.fromCharCode(...data); // Convert byte array to string
    setReceivedData(decodedData);

    try {
      const parsedData = JSON.parse(decodedData); // Use decodedData instead of raw data
      refreshStatus(parsedData); // Refresh status in context
    } catch (e) {
      console.log('ERROR PARSING:', e);
    }
  }, [refreshStatus]);

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
    service.on('dataReceived', handleReceivedData); // Use memoized handleReceivedData

    return () => {
      service.removeAllListeners(); // Clean up listeners on unmount
    };
  }, [handleReceivedData]); // Add handleReceivedData to the dependency array

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

  // Choose styles based on theme
  const styles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Manager</Text>

      <Button title="Scan for Devices" onPress={handleScanForDevices} disabled={isScanning} />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.deviceItem}>
            <Text style={styles.deviceText}>{`${item.name} (RSSI: ${item.rssi})`}</Text>
            <Button
              title={`Connect to ${item.name || item.id}`}
              onPress={() => bluetoothService?.connectToDevice(item)}
              disabled={!!connectedDevice || isScanning}
            />
          </View>
        )}
      />

      {connectedDevice && (
        <View style={styles.connectedDeviceContainer}>
          <Text style={styles.connectedDeviceText}>
            Connected to: {connectedDevice.name}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter data to send"
              value={inputData}
              onChangeText={setInputData}
              placeholderTextColor={styles.placeholderText.color}
            />

            <Button title="Write Data" onPress={() => handleWriteData(inputData)} />
            <View style={styles.spacer} />
            <Button title="Write Without Response" onPress={handleWriteWithoutResponse} />
            <View style={styles.spacer} />
            <Button title="Read Data" onPress={handleReadData} />

            {receivedData && (
              <View style={styles.receivedDataContainer}>
                <Text style={styles.receivedDataText}>Received Data: {receivedData}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// Light and dark theme styles
const lightThemeStyles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  deviceItem: {
    marginVertical: 10,
  },
  deviceText: {
    color: '#000000',
  },
  connectedDeviceContainer: {
    marginTop: 20,
  },
  connectedDeviceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  inputContainer: {
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
    color: '#000000',
  },
  placeholderText: {
    color: '#999999',
  },
  spacer: {
    marginTop: 10,
  },
  receivedDataContainer: {
    marginTop: 20,
  },
  receivedDataText: {
    color: '#000000',
  },
});

const darkThemeStyles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#000000',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  deviceItem: {
    marginVertical: 10,
  },
  deviceText: {
    color: '#FFFFFF',
  },
  connectedDeviceContainer: {
    marginTop: 20,
  },
  connectedDeviceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inputContainer: {
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: '#666666',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
    color: '#FFFFFF',
  },
  placeholderText: {
    color: '#AAAAAA',
  },
  spacer: {
    marginTop: 10,
  },
  receivedDataContainer: {
    marginTop: 20,
  },
  receivedDataText: {
    color: '#FFFFFF',
  },
});

export default BluetoothManager;
