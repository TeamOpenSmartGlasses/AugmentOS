import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import BluetoothService from '../BluetoothService';
import { loadSetting, saveSetting } from '../augmentos_core_comms/SettingsHelper';
import { SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT } from '../consts';
import ManagerCoreCommsService from '../augmentos_core_comms/ManagerCoreCommsService';
import { isAugmentOsCoreInstalled, openCorePermissionsActivity, stopExternalService } from '../augmentos_core_comms/CoreServiceStarter';
import { ScrollView } from 'react-native-gesture-handler';
import { NavigationProps } from '../components/types';

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
  //const bluetoothService = BluetoothService.getInstance();
  const navigation = useNavigation<NavigationProps>();

  const handleInstallLink = () => {
    const url = 'https://augmentos.org/install-augmentos-core';
    Linking.openURL(url).catch(err =>
      console.error('Failed to open URL:', err),
    );
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

  // Initial check for core installation
  React.useEffect(() => {
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

  React.useEffect(() => {
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
    <ScrollView
      style={[
        styles.container,
        isDarkTheme ? styles.darkBackground : styles.lightBackground,
      ]}>
      <View style={{ marginTop: 20 }}>
        <Text
          style={[
            styles.title,
            isDarkTheme ? styles.lightText : styles.darkText,
          ]}>
          AugmentOS Setup
        </Text>
        <Text
          style={[
            styles.description,
            isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
          ]}>
          On some Android devices, you can use AugmentOS without a dedicated
          Puck.
        </Text>
        <Text
          style={[
            styles.notice,
            isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
          ]}>
          Please note that this feature is primarily intended for development
          purposes. Not all features will work, some things may break, and using
          this will increase battery usage.
        </Text>

      </View>
      {isSimulatedPuck && (
        <View style={{ marginTop: 20 }}>
          <Text
            style={[
              styles.subtitle,
              isDarkTheme ? styles.lightText : styles.darkText,
            ]}>
            AugmentOS Core Setup
          </Text>

          <View style={styles.step}>
            <Text
              style={[
                styles.stepNumber,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              1.
            </Text>
            <TouchableOpacity onPress={handleInstallLink}>
              <Text
                style={[
                  styles.link,
                  isDarkTheme ? styles.lightText : styles.darkText,
                ]}>
                Install AugmentOS_Core
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.step}>
            <Text
              style={[
                styles.stepNumber,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              2.
            </Text>
            <Text
              style={[
                styles.stepText,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
              ]}>
              Launch AugmentOS_Core, and make sure to accept all permissions,
              and disable all battery optimizations when prompted.
            </Text>
          </View>

          <View style={styles.step}>
            <Text
              style={[
                styles.stepNumber,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              3.
            </Text>
            <Text
              style={[
                styles.stepText,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
              ]}>
              Check below to see if the simulated puck has been connected...
            </Text>
          </View>

          <View style={styles.step}>
            <Text
              style={[
                styles.stepNumber,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              3.
            </Text>
            <Text
              style={[
                styles.stepText,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
              ]}>
              Check below to see if the simulated puck has been connected...
            </Text>
          </View>

          <Text
            style={[
              styles.subtitle,
              isDarkTheme ? styles.lightText : styles.darkText,
            ]}>
            Simulated puck connection status:{' '}
            {status.puck_connected ? '\nConnected' : '\nNot Connected'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  link: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  notice: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  stepText: {
    fontSize: 16,
    flex: 1,
  },
  darkBackground: {
    backgroundColor: '#1c1c1c',
  },
  lightBackground: {
    backgroundColor: '#f0f0f0',
  },
  darkText: {
    color: 'black',
  },
  lightText: {
    color: 'white',
  },
  darkSubtext: {
    color: '#666666',
  },
  lightSubtext: {
    color: '#999999',
  },
  darkIcon: {
    color: '#333333',
  },
  lightIcon: {
    color: '#666666',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 16,
    flexWrap: 'wrap',
  },
  value: {
    fontSize: 12,
    marginTop: 5,
    flexWrap: 'wrap',
  },
});

export default SimulatedPuckOnboard;
