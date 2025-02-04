import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  BackHandler,
  AppState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStatus } from '../AugmentOSStatusProvider';
import BluetoothService from '../BluetoothService';
import { loadSetting, saveSetting } from '../augmentos_core_comms/SettingsHelper';
import { SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT } from '../consts';
import ManagerCoreCommsService from '../augmentos_core_comms/ManagerCoreCommsService';
import { isAugmentOsCoreInstalled, openCorePermissionsActivity, stopExternalService } from '../augmentos_core_comms/CoreServiceStarter';
import { ScrollView } from 'react-native-gesture-handler';
import { NavigationProps } from '../components/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../components/Button';
import InstallApkModule from '../logic/InstallApkModule';

interface SimulatedPuckOnboardProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
}

const SimulatedPuckOnboard: React.FC<SimulatedPuckOnboardProps> = ({
  isDarkTheme,
  toggleTheme
}) => {
  const [isSimulatedPuck, setIsSimulatedPuck] = React.useState(false);
  const [isCoreInstalled, setIsCoreInstalled] = React.useState(false);
  const { status } = useStatus();
  const [isDownloadingCore, setIsDownloadingCore] = React.useState(false);
  //const bluetoothService = BluetoothService.getInstance();
  const navigation = useNavigation<NavigationProps>();

  const handleInstallLink = () => {
    //const url = 'https://augmentos.org/install-augmentos-core';
    //Linking.openURL(url).catch(err =>
    //  console.error('Failed to open URL:', err),
    //);
    setIsDownloadingCore(true);
    InstallApkModule.downloadCoreApk().then(()=>{

    }).finally(() => {
      setIsDownloadingCore(false);
    });

  };

  React.useEffect(() => {
    const loadSimulatedPuckSetting = async () => {
      const simulatedPuck = await loadSetting(
        SETTINGS_KEYS.SIMULATED_PUCK,
        SIMULATED_PUCK_DEFAULT,
      );
      setIsSimulatedPuck(simulatedPuck);
    };

    loadSimulatedPuckSetting();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const installed = await isAugmentOsCoreInstalled();
        if (installed) {
          openCorePermissionsActivity();
        }
      }
    });

    return () => {
      // Clean up the subscription when the component unmounts
      subscription.remove();
    };
  }, []);

  // Initial check for core installation
  useEffect(() => {
    const checkCoreInstallation = async () => {
      const installed = await isAugmentOsCoreInstalled();
      setIsCoreInstalled(installed);
      openCorePermissionsActivity();

      // If not installed, start polling
      if (!installed) {
        const intervalId = setInterval(async () => {
          const currentStatus = await isAugmentOsCoreInstalled();
          if (currentStatus) {
            setIsCoreInstalled(true);
            clearInterval(intervalId);
            openCorePermissionsActivity();
          }
        }, 1000);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
      }
    };

    checkCoreInstallation();
  }, []);

  useEffect(() => {
    const doCoreConnectionCheck = async () => {
      if (status.puck_connected) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    };

    doCoreConnectionCheck();
  }, [status]);

  return (
    <View
      style={[
        styles.container,
        isDarkTheme ? styles.darkBackground : styles.lightBackground,
      ]}>
      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Icon name="cellphone-link" size={80} color={isDarkTheme ? '#FFFFFF' : '#2196F3'} />
          </View>

          <Text style={[styles.title, isDarkTheme ? styles.lightText : styles.darkText]}>
            AugmentOS Setup
          </Text>
          
          <Text style={[styles.description, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            To use AugmentOS, you'll need to install AugmentOS Core
          </Text>

          {isSimulatedPuck && (
            <View style={styles.setupContainer}>
                <Button
              onPress={handleInstallLink}
              isDarkTheme={isDarkTheme}
              disabled={isDownloadingCore}
              iconName="download">
              Install AugmentOS Core
            </Button>

              {/* <Text style={[styles.statusText, isDarkTheme ? styles.lightText : styles.darkText]}>
                Connection Status: {status.puck_connected ? 'Connected' : 'Not Connected'}
              </Text> */}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  notice: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  setupContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 300,
    height: 44,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonDark: {
    backgroundColor: '#1976D2',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  darkBackground: {
    backgroundColor: '#1c1c1c',
  },
  lightBackground: {
    backgroundColor: '#f8f9fa',
  },
  darkText: {
    color: '#1a1a1a',
  },
  lightText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#4a4a4a',
  },
  lightSubtext: {
    color: '#e0e0e0',
  },
});

export default SimulatedPuckOnboard;
