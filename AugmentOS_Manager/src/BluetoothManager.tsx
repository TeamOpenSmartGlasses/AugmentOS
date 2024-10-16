import React, { useState, useEffect } from 'react';
import { Button, Text, View, FlatList, Alert } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { PermissionsAndroid } from 'react-native';

const BluetoothManager = () => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);  // Store received messages

  // Request Bluetooth and Location Permissions
  useEffect(() => {
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

    requestPermissions();
  }, []);

  // Scan for Bluetooth devices
  const scanForDevices = async () => {
    try {
      const availableDevices = await RNBluetoothClassic.getBondedDevices();
      setDevices(availableDevices);
    } catch (error) {
      console.error('Error scanning for devices:', error);
    }
  };

  // Connect to a Bluetooth device
  const connectToDevice = async (device: BluetoothDevice) => {
    setIsConnecting(true);
    try {
      const connected = await device.connect();
      if (connected) {
        setConnectedDevice(device);
        Alert.alert('Connected', `Connected to ${device.name}`);

        // Start listening for incoming messages once connected
        device.onDataReceived((data) => {
          handleReceivedMessage(data);
        });
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle incoming message
  const handleReceivedMessage = (data: any) => {
    console.log('Received message:', data);
    setMessages((prevMessages) => [...prevMessages, data.data]);
  };

  // Send a message to the connected device
  const sendMessage = async (message: string) => {
    if (connectedDevice) {
      try {
        await connectedDevice.write(message);
        Alert.alert('Message Sent', `Message "${message}" sent to ${connectedDevice.name}`);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      Alert.alert('No Device Connected', 'Please connect to a device first.');
    }
  };



  return (
    <View style={{ padding: 20 }}>
      <Text>Bluetooth Classic Manager</Text>
      <Button title="Scan for Devices" onPress={scanForDevices} />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Button
              title={`Connect to ${item.name || item.id}`}
              onPress={() => connectToDevice(item)}
              disabled={isConnecting}
            />
          </View>
        )}
      />

      {connectedDevice && (
        <View>
          <Text>Connected to: {connectedDevice.name}</Text>
          <Button title="Send Message" onPress={() => sendMessage('Hello Puck!')} />
        </View>
      )}
    </View>
  );
};

export default BluetoothManager;
