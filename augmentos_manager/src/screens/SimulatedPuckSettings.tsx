import React, {useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {useStatus} from '../providers/AugmentOSStatusProvider';
import BluetoothService from '../BluetoothService';
import {loadSetting, saveSetting} from '../logic/SettingsHelper';
import {SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT} from '../consts';
import ManagerCoreCommsService from '../bridge/ManagerCoreCommsService';
import { openCorePermissionsActivity, stopExternalService } from '../bridge/CoreServiceStarter';
import { ScrollView } from 'react-native-gesture-handler';

interface SimulatedPuckSettingsProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  navigation: any;
}

const SimulatedPuckSettings: React.FC<SimulatedPuckSettingsProps> = ({
  isDarkTheme,
  toggleTheme,
  navigation,
}) => {
  const [isSimulatedPuck, setIsSimulatedPuck] = React.useState(false);
  const {status} = useStatus();
  let n = navigation;
  const bluetoothService = BluetoothService.getInstance();

  const switchColors = {
    trackColor: {
      false: isDarkTheme ? '#666666' : '#D1D1D6',
      true: '#2196F3',
    },
    thumbColor:
      Platform.OS === 'ios' ? undefined : isDarkTheme ? '#FFFFFF' : '#FFFFFF',
    ios_backgroundColor: isDarkTheme ? '#666666' : '#D1D1D6',
  };

  const handleInstallLink = () => {
    const url = 'https://augmentos.org/install-augmentos-core';
    Linking.openURL(url).catch(err =>
      console.error('Failed to open URL:', err),
    );
  };

  const toggleSimulatePuck = async () => {
    let newSimulatedPuck = !isSimulatedPuck;
    if(newSimulatedPuck) {
    //  openCorePermissionsActivity();
    }
    ManagerCoreCommsService.stopService();
    stopExternalService();
    await saveSetting(SETTINGS_KEYS.SIMULATED_PUCK, newSimulatedPuck);
    setIsSimulatedPuck(newSimulatedPuck)
    await BluetoothService.resetInstance();
    BluetoothService.getInstance();

    let textToShow = newSimulatedPuck ? "Please restart the app" : "Please restart the app and return to this screen for instructions.";
    Alert.alert(
      'App Restart Required',
      textToShow,
      [
        {
          text: 'OK',
          onPress: () => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp(); // Exit app on Android
            }
          },
        },
      ],
      {cancelable: false},
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

  return (
    <ScrollView
      style={[
        styles.container,
        isDarkTheme ? styles.darkBackground : styles.lightBackground,
      ]}>
      <View style={{marginTop: 20}}>
        <Text
          style={[
            styles.title,
            isDarkTheme ? styles.lightText : styles.darkText,
          ]}>
          Simulated Puck
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

        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              Use Simulated Puck
            </Text>
          </View>
          <Switch
            disabled={false}
            value={isSimulatedPuck}
            onValueChange={() => toggleSimulatePuck()}
            trackColor={switchColors.trackColor}
            thumbColor={switchColors.thumbColor}
            ios_backgroundColor={switchColors.ios_backgroundColor}
          />
        </View>
      </View>
      {isSimulatedPuck && (
        <View style={{marginTop: 20}}>
          <Text
            style={[
              styles.subtitle,
              isDarkTheme ? styles.lightText : styles.darkText,
            ]}>
            Simulated Puck Setup
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
            {status.core_info.puck_connected ? '\nConnected' : '\nNot Connected'}
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

export default SimulatedPuckSettings;
