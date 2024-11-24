import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import NavigationBar from '../components/NavigationBar';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '../components/types';
import { useStatus } from '../AugmentOSStatusProvider';

const SettingsPage: React.FC<{ isDarkTheme: boolean; toggleTheme: () => void }> = ({ isDarkTheme, toggleTheme }) => {
  const [isDoNotDisturbEnabled, setDoNotDisturbEnabled] = useState(false);
  const [isBrightnessAutoEnabled, setBrightnessAutoEnabled] = useState(false);
  const navigation = useNavigation<NavigationProps>();
  const { status } = useStatus();
  const [isUsingAudioWearable, setIsUsingAudioWearable] = useState (status.glasses_info?.model_name == "Audio Wearable")

  const backgroundStyle = isDarkTheme ? styles.darkBackground : styles.lightBackground;
  const titleColorStyle = isDarkTheme ? styles.darkTitle : styles.lightTitle;
  const labelColorStyle = isDarkTheme ? styles.darkLabel : styles.lightLabel;
  const valueColorStyle = isDarkTheme ? styles.darkValue : styles.lightValue;
  const iconColor = isDarkTheme ? '#666666' : '#333333';

  function sendToggleVirtualWearable(arg0: boolean): void | Promise<void> {
    throw new Error('Function not implemented.');
  }

  function sendDisconnectWearable() {
    throw new Error('Function not implemented.');
  }

  return (
    <View style={[styles.container, backgroundStyle]}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, titleColorStyle]}>Settings for Glasses</Text>

        {/* Dark Mode Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Dark Mode</Text>
            <Text style={[styles.value, valueColorStyle]}>Toggle between light and dark mode</Text>
          </View>
          <Switch value={isDarkTheme} onValueChange={toggleTheme} />
        </View>

        {/* Name of Glasses */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Name of Glasses</Text>
            <Text style={[styles.value, valueColorStyle]}>MYVU B0OC</Text>
          </View>
          <Icon name="angle-right" size={20} color={iconColor} />
        </TouchableOpacity>

        {/* Toggle Virtual Wearable */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Use Virtual Wearable</Text>
            <Text style={[styles.value, valueColorStyle]}>Puck will use a simulated smart glasses instead of real smart glasses.</Text>
          </View>
          <Switch value={isUsingAudioWearable} onValueChange={() => sendToggleVirtualWearable(!isUsingAudioWearable)} />
        </View>

        {/* Link to Profile Settings */}
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('ProfileSettings')}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Profile Settings</Text>
            <Text style={[styles.value, valueColorStyle]}>Edit your profile settings</Text>
          </View>
          <Icon name="angle-right" size={20} color={iconColor} />
        </TouchableOpacity>

        {/* App List */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>App List</Text>
            <Text style={[styles.value, valueColorStyle]}>Adjust the order of the Glasses app list</Text>
          </View>
          <Icon name="angle-right" size={20} color={iconColor} />
        </TouchableOpacity>

        {/* Standby Components */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Standby Components</Text>
            <Text style={[styles.value, valueColorStyle]}>Adjust the display position of standby components</Text>
          </View>
          <Icon name="angle-right" size={20} color={iconColor} />
        </TouchableOpacity>

        {/* Do Not Disturb Mode */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Do Not Disturb Mode</Text>
            <Text style={[styles.value, valueColorStyle]}>Glasses will not provide any notifications when enabled</Text>
          </View>
          <Switch value={isDoNotDisturbEnabled} onValueChange={() => setDoNotDisturbEnabled(!isDoNotDisturbEnabled)} />
        </View>

        {/* Automatically Adjust Brightness */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Automatically Adjust Brightness</Text>
            <Text style={[styles.value, valueColorStyle]}>
              Automatically adjust brightness of Glasses with time of sunrise and sunset
            </Text>
          </View>
          <Switch
            value={isBrightnessAutoEnabled}
            onValueChange={() => setBrightnessAutoEnabled(!isBrightnessAutoEnabled)}
          />
        </View>

        {/* Auto-Lock */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Auto-Lock</Text>
            <Text style={[styles.value, valueColorStyle]}>30 seconds</Text>
          </View>
          <Icon name="angle-right" size={20} color={iconColor} />
        </TouchableOpacity>

        {/* Disconnect Wearable */}
        {status.glasses_info?.model_name && (
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Disconnect Wearable</Text>
          </View>
            <TouchableOpacity onPress={() => { sendDisconnectWearable(); }}>
          <Icon name="angle-right" size={20} color={iconColor} />
          </TouchableOpacity>
        </TouchableOpacity>
        )}

        {/* Control Audio During Screen Rest */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.label, labelColorStyle]}>Control Audio During Screen Rest</Text>
            <Text style={[styles.value, valueColorStyle]}>
              Supports control of audio during screen rest by the glasses touchpad or phone touchpad
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={iconColor} />
        </TouchableOpacity>
      </ScrollView>

      {/* Navigation Bar */}
      <NavigationBar isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 40, // Padding at the bottom to avoid cutting off last items
  },
  darkBackground: {
    backgroundColor: '#1c1c1c',
  },
  lightBackground: {
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 26, // Increased font size for readability
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
  },
  darkTitle: {
    color: '#D3D3D3',
  },
  lightTitle: {
    color: '#333333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 25, // Increased padding for spacing
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 18, // Increased font size for readability
    flexWrap: 'wrap',
    fontFamily: 'Montserrat-Bold',
  },
  darkLabel: {
    color: 'white',
  },
  lightLabel: {
    color: 'black',
  },
  value: {
    fontSize: 14, // Increased font size for readability
    marginTop: 5,
    flexWrap: 'wrap',
    fontFamily: 'Montserrat-Regular',
  },
  darkValue: {
    color: '#999999',
  },
  lightValue: {
    color: '#666666',
  },
});

export default SettingsPage;
