import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import { bluetoothService } from '../BluetoothService';

const SettingsPage: React.FC<{ isDarkTheme: boolean; toggleTheme: () => void }> = ({ isDarkTheme, toggleTheme }) => {
  const [isDoNotDisturbEnabled, setDoNotDisturbEnabled] = React.useState(false);
  const [isBrightnessAutoEnabled, setBrightnessAutoEnabled] = React.useState(false);
  const [isSimulatedPuck, setIsSimulatedPuck] = React.useState(false);
  const navigation = useNavigation();
  const { status } = useStatus();
  let isUsingAudioWearable = status.glasses_info?.model_name == "Audio Wearable";

  const switchColors = {
    trackColor: {
      false: isDarkTheme ? '#666666' : '#D1D1D6',
      true: '#2196F3',
    },
    thumbColor: Platform.OS === 'ios'
      ? undefined
      : (isDarkTheme ? '#FFFFFF' : '#FFFFFF'),
    ios_backgroundColor: isDarkTheme ? '#666666' : '#D1D1D6',
  };

  const toggleVirtualWearable = async (arg0: boolean) => {
    await bluetoothService.sendToggleVirtualWearable(arg0);
  }

  const sendDisconnectWearable = async () => {
    throw new Error('Function not implemented.');
  }

  const sendDisconnectPuck = async () => {
    throw new Error('Function not implemented.');
  }

  return (
    <View style={[styles.container, isDarkTheme ? styles.darkBackground : styles.lightBackground]}>


      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color={isDarkTheme ? styles.lightText.color : styles.darkText.color} />
        <Text style={[styles.backButtonText, isDarkTheme ? styles.lightText : styles.darkText]}>
          Settings for Glasses
        </Text>
      </TouchableOpacity>

      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>Dark Mode</Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            Toggle between light and dark mode
          </Text>
        </View>
        <Switch
          value={isDarkTheme}
          onValueChange={toggleTheme}
          trackColor={switchColors.trackColor}
          thumbColor={switchColors.thumbColor}
          ios_backgroundColor={switchColors.ios_backgroundColor}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>
            Use Virtual Wearable
          </Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            Puck will use a simulated smart glasses instead of real smart glasses.</Text>
        </View>
        <Switch
          disabled={!status.puck_connected}
          value={isUsingAudioWearable} onValueChange={() => toggleVirtualWearable(!isUsingAudioWearable)}
          trackColor={switchColors.trackColor}
          thumbColor={switchColors.thumbColor}
          ios_backgroundColor={switchColors.ios_backgroundColor}
        />
      </View>

      {/* Temporary until we make a proper page for thsi */}
      {Platform.OS == 'android' && (
        <TouchableOpacity style={styles.settingItem} onPress={()=>{
          //navigation.navigate('SimulatedPuckSettings')
        }}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>Simulated Puck</Text>
          </View>
          <Icon
            name="angle-right"
            size={20}
            color={isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>Name of Glasses</Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>MYVU B0OC</Text>
        </View>
        <Icon
          name="angle-right"
          size={20}
          color={isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color}
        />
      </TouchableOpacity>


      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>Standby Components</Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            Adjust the display position of standby components
          </Text>
        </View>
        <Icon
          name="angle-right"
          size={20}
          color={isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color}
        />
      </TouchableOpacity>

      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>Don't Disturb mode</Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            Glasses will not provide any notifications when enabled
          </Text>
        </View>
        <Switch
          value={isDoNotDisturbEnabled}
          onValueChange={setDoNotDisturbEnabled}
          trackColor={switchColors.trackColor}
          thumbColor={switchColors.thumbColor}
          ios_backgroundColor={switchColors.ios_backgroundColor}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>
            Automatically adjust brightness
          </Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            Automatically adjust brightness of Glasses with time of sunrise and sunset
          </Text>
        </View>
        <Switch
          value={isBrightnessAutoEnabled}
          onValueChange={setBrightnessAutoEnabled}
          trackColor={switchColors.trackColor}
          thumbColor={switchColors.thumbColor}
          ios_backgroundColor={switchColors.ios_backgroundColor}
        />
      </View>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>Auto-Lock</Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>30 seconds</Text>
        </View>
        <Icon
          name="angle-right"
          size={20}
          color={isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.label, isDarkTheme ? styles.lightText : styles.darkText]}>
            Control audio during screen rest
          </Text>
          <Text style={[styles.value, isDarkTheme ? styles.lightSubtext : styles.darkSubtext]}>
            When enabled, it supports control audio during screen rest by the glasses touchpad, the phone touchpad
          </Text>
        </View>
        <Icon
          name="angle-right"
          size={20}
          color={isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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

export default SettingsPage;
