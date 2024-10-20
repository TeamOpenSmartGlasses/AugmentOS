// ManagerApp/src/App.tsx

import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import sendProtocolIntent from './IntentSender';
import BluetoothManager from './BluetoothManager';
import { StatusProvider } from './AugmentOSStatusProvider';
import HomeScreenComponent from './HomeScreenComponent';

const App: React.FC = () => {
  const handleSendStatus = () => {
    const protocolData = {
      version: "1.0",
      action: "status",
      request_id: "req_001",
      // parameters can be omitted if not needed
    };

    sendProtocolIntent(protocolData);
  };

  const handleStartApp = () => {
    const protocolData = {
      version: "1.0",
      action: "start_app",
      request_id: "req_002",
      parameters: {
        app_id: "com.teamopensmartglasses.llsg"
      }
    };

    sendProtocolIntent(protocolData);
  };


  return (
    <StatusProvider>
      <View style={styles.container}>
        <Text style={styles.title}>AugmentOS Manager</Text>
        <HomeScreenComponent />
        <BluetoothManager />
      </View>
    </StatusProvider>
  )
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: 'center',
    flex: 1
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center'
  }
});

export default App;
