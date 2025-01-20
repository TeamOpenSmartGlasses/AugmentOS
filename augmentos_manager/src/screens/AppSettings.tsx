import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../components/types';
import NavigationBar from '../components/NavigationBar';
import BluetoothService from '../BluetoothService';
import GlobalEventEmitter from '../logic/GlobalEventEmitter';
import { MOCK_CONNECTION } from '../consts';

type AppSettingsProps = NativeStackScreenProps<
  RootStackParamList,
  'AppSettings'
> & {
  isDarkTheme: boolean;
  toggleTheme: () => void;
};

const AppSettings: React.FC<AppSettingsProps> = ({
  route,
  isDarkTheme,
  toggleTheme,
}) => {
  const { packageName, appName } = route.params;
  const bluetoothService = BluetoothService.getInstance();
  const [appInfo, setAppInfo] = useState({});

  useEffect(() => {
    console.log("OPENED APP SETTINGS!!!");

    // Define the event handler
    const handleInfoResult = ({ appInfo }: { appInfo: any }) => {
      console.log("GOT SOME APP INFO YO");
      console.log(JSON.stringify(appInfo));
      setAppInfo(appInfo);
    };

    // Register the listener and send the request if not mocking
    if (!MOCK_CONNECTION) {
      GlobalEventEmitter.on('APP_INFO_RESULT', handleInfoResult);
      bluetoothService.sendRequestAppDetails(packageName);
    }

    // Cleanup function to remove the listener
    return () => {
      if (!MOCK_CONNECTION) {
        GlobalEventEmitter.removeListener('APP_INFO_RESULT', handleInfoResult);
        console.log("Removed APP_INFO_RESULT listener");
      }
    };
  }, [packageName]);


  // Theme colors
  const theme = {
    backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}
    >
      <View style={styles.mainContainer}>
        <Text style={[styles.text, { color: theme.textColor }]}>
          App Settings for package: {packageName}
        </Text>
        <Text style={[styles.text, { color: theme.textColor }]}>
          {appInfo ? JSON.stringify(appInfo):"loading???"}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default AppSettings;
