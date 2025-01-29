import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Slider } from 'react-native-elements';
import { useStatus } from '../AugmentOSStatusProvider';
import { BluetoothService } from '../BluetoothService';
import { loadSetting, saveSetting } from '../augmentos_core_comms/SettingsHelper';
import { SETTINGS_KEYS } from '../consts';
import NavigationBar from '../components/NavigationBar';
import { supabase } from '../supabaseClient';

interface SettingsPageProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  navigation: any;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  isDarkTheme,
  toggleTheme,
  navigation,
}) => {
  const [isDoNotDisturbEnabled, setDoNotDisturbEnabled] = React.useState(false);
  const [isBrightnessAutoEnabled, setBrightnessAutoEnabled] =
    React.useState(false);
  const { status } = useStatus();
  const [isSensingEnabled, setIsSensingEnabled] = React.useState(
    status.sensing_enabled,
  );
  const [isContextualDashboardEnabled, setIsContextualDashboardEnabled] = React.useState(
    status.contextual_dashboard_enabled,
  );

  const [brightness, setBrightness] = useState(
    status.glasses_info && status.glasses_info.brightness && !(status.glasses_info.brightness.includes('-'))
      ? parseInt(status.glasses_info.brightness.replace('%', ''), 10)
      : 50
  );

  React.useEffect(() => {
    const loadInitialSettings = async () => { };

    loadInitialSettings();
  }, []);

  const toggleSensing = async () => {
    let newSensing = !isSensingEnabled;
    await BluetoothService.getInstance().sendToggleSensing(newSensing);
    setIsSensingEnabled(newSensing);
  };

  const toggleContextualDashboard = async () => {
    let newContextualDashboardSetting = !isContextualDashboardEnabled;
    await BluetoothService.getInstance().sendToggleContextualDashboard(newContextualDashboardSetting);
    setIsContextualDashboardEnabled(newContextualDashboardSetting);
  };

  const changeBrightness = async (newBrightness: number) => {
    if (status.glasses_info?.brightness === '-') {return;}
    await BluetoothService.getInstance().setGlassesBrightnessMode(newBrightness, false);

    console.log(`Brightness set to: ${newBrightness}`);
  };


  React.useEffect(() => {
    setIsSensingEnabled(status.sensing_enabled);
    if (status.glasses_info && status.glasses_info.brightness) {
        setBrightness(parseInt(status.glasses_info.brightness.replace('%', ''), 10));
    } else {
        console.log('No brightness info found');
    }
  }, [status]);

  const switchColors = {
    trackColor: {
      false: isDarkTheme ? '#666666' : '#D1D1D6',
      true: '#2196F3',
    },
    thumbColor:
      Platform.OS === 'ios' ? undefined : isDarkTheme ? '#FFFFFF' : '#FFFFFF',
    ios_backgroundColor: isDarkTheme ? '#666666' : '#D1D1D6',
  };

  const sendDisconnectWearable = async () => {
    throw new Error('Function not implemented.');
  };

  const forgetPuck = async () => {
    await BluetoothService.getInstance().disconnectFromDevice();
    await saveSetting(SETTINGS_KEYS.PREVIOUSLY_BONDED_PUCK, null);
  };

  const forgetGlasses = async () => {
    await BluetoothService.getInstance().sendForgetSmartGlasses();
  };

  // Theme colors
  const theme = {
    backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
    headerBg: isDarkTheme ? '#333333' : '#fff',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    subTextColor: isDarkTheme ? '#999999' : '#666666',
    cardBg: isDarkTheme ? '#333333' : '#fff',
    borderColor: isDarkTheme ? '#444444' : '#e0e0e0',
    searchBg: isDarkTheme ? '#2c2c2c' : '#f5f5f5',
    categoryChipBg: isDarkTheme ? '#444444' : '#e9e9e9',
    categoryChipText: isDarkTheme ? '#FFFFFF' : '#555555',
    selectedChipBg: isDarkTheme ? '#666666' : '#333333',
    selectedChipText: isDarkTheme ? '#FFFFFF' : '#FFFFFF',
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      // Handle sign-out error
    } else {
      console.log('Sign-out successful');
      BluetoothService.resetInstance();
      navigation.reset({
        index: 0,
        routes: [{ name: 'SplashScreen' }],
      });
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: handleSignOut,
        },
      ],
      { cancelable: false }
    );
  };

  const confirmForgetGlasses = () => {
    Alert.alert(
      "Forget Glasses",
      "Are you sure you want to forget your glasses?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: forgetGlasses,
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View
      style={[
        styles.container,
        isDarkTheme ? styles.darkBackground : styles.lightBackground,
      ]}>
      <View
        style={[
          styles.titleContainer,
          isDarkTheme ? styles.titleContainerDark : styles.titleContainerLight,
        ]}>
        <Text
          style={[
            styles.title,
            isDarkTheme ? styles.lightText : styles.darkText,
            {},
          ]}>
          Settings
        </Text>
      </View>
      {/* Margin bottom is 60 as super quick ugly hack for navbar */}
      <ScrollView style={styles.scrollViewContainer}>
        {/* Dark Mode */}
        {/* <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              Dark Mode
            </Text>
            <Text
              style={[
                styles.value,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
              ]}>
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
        </View> */}

        {/* <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              Use Virtual Wearable
            </Text>
            <Text
              style={[
                styles.value,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
              ]}>
              Puck will use a simulated smart glasses instead of real smart
              glasses.
            </Text>
          </View>
          <Switch
            disabled={!status.puck_connected}
            value={isUsingAudioWearable}
            onValueChange={() => toggleVirtualWearable()}
            trackColor={switchColors.trackColor}
            thumbColor={switchColors.thumbColor}
            ios_backgroundColor={switchColors.ios_backgroundColor}
          />
        </View> */}

        {/* Disable changing simulated puck */}
        {/* {Platform.OS == 'android' && (
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              navigation.navigate('SimulatedPuckSettings');
            }}>
            <View style={styles.settingTextContainer}>
              <Text
                style={[
                  styles.label,
                  isDarkTheme ? styles.lightText : styles.darkText,
                ]}>
                Simulated Puck
              </Text>
            </View>
            <Icon
              name="angle-right"
              size={20}
              color={
                isDarkTheme ? styles.lightIcon.color : styles.darkIcon.color
              }
            />
          </TouchableOpacity>
        )} */}

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            navigation.navigate('PhoneNotificationSettings');
          }}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                isDarkTheme ? styles.lightText : styles.darkText,
              ]}>
              Notifications
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
            <Text
              style={[
                styles.label,
                isDarkTheme ? styles.lightText : styles.darkText,
                (!status.puck_connected || !status.glasses_info?.model_name) &&
                  styles.disabledItem,
              ]}>
              Sensing
            </Text>
            <Text
              style={[
                styles.value,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
                (!status.puck_connected || !status.glasses_info?.model_name) &&
                  styles.disabledItem,
              ]}>
              Enable microphones & cameras.
            </Text>
          </View>
          <Switch
            disabled={!status.glasses_info?.model_name}
            value={isSensingEnabled}
            onValueChange={toggleSensing}
            trackColor={switchColors.trackColor}
            thumbColor={switchColors.thumbColor}
            ios_backgroundColor={switchColors.ios_backgroundColor}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
              <Text
                style={[
                  styles.label,
                  isDarkTheme ? styles.lightText : styles.darkText,
                  (!status.puck_connected || !status.glasses_info?.model_name) &&
                    styles.disabledItem,
                ]}
              >
                Contextual Dashboard
              </Text>
              {status.glasses_info && status.glasses_info.model_name && (
                <Text
                  style={[
                    styles.value,
                    isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
                    (!status.puck_connected || !status.glasses_info?.model_name) &&
                      styles.disabledItem,
                  ]}
                >
                  {/* TODO: Make this less bespoke */}
                  {`Show the summary of your phone notifications when you ${
                    status.glasses_info?.model_name.toLowerCase().includes('even')
                      ? 'look up'
                      : 'tap your smart glasses'
                  }.`}
                </Text>
              )}
          </View>
          <Switch
            disabled={!status.glasses_info?.model_name}
            value={isContextualDashboardEnabled}
            onValueChange={toggleContextualDashboard}
            trackColor={switchColors.trackColor}
            thumbColor={switchColors.thumbColor}
            ios_backgroundColor={switchColors.ios_backgroundColor}
          />
        </View>

        {/* Brightness Slider */}
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                isDarkTheme ? styles.lightText : styles.darkText,
                (!status.puck_connected || !status.glasses_info?.model_name) &&
                  styles.disabledItem,
              ]}>
              Brightness
            </Text>
            <Text
              style={[
                styles.value,
                isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
                (!status.puck_connected || !status.glasses_info?.model_name) &&
                  styles.disabledItem,
              ]}>
              Adjust the brightness level of your smart glasses.
            </Text>
            <Slider
              disabled={
                !status.glasses_info?.model_name ||
                status.glasses_info?.brightness === '-' ||
                !status.glasses_info.model_name.toLowerCase().includes('even')
              }
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              thumbTouchSize={styles.thumbTouchSize}
              trackStyle={styles.trackStyle}
              thumbStyle={styles.thumbStyle}
              step={1}
              onSlidingComplete={value => changeBrightness(value)}
              value={brightness}
              minimumTrackTintColor={styles.minimumTrackTintColor.color}
              maximumTrackTintColor={
                isDarkTheme
                  ? styles.maximumTrackTintColorDark.color
                  : styles.maximumTrackTintColorLight.color
              }
              thumbTintColor={styles.thumbTintColor.color}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingItem}
          disabled={!status.puck_connected || status.default_wearable === ''}
          onPress={() => {
            confirmForgetGlasses();
          }}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                styles.redText,
                (!status.puck_connected || status.default_wearable === '') &&
                  styles.disabledItem,
              ]}>
              Forget Glasses
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            confirmSignOut();
          }}>
          <View style={styles.settingTextContainer}>
            <Text
              style={[
                styles.label,
                styles.redText,
                // (!status.puck_connected || status.default_wearable === "") && styles.disabledItem
              ]}>
              Sign Out
            </Text>
          </View>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.settingItem}>
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
      </TouchableOpacity> */}
      </ScrollView>
      <NavigationBar toggleTheme={toggleTheme} isDarkTheme={isDarkTheme} />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollViewContainer: {
    marginBottom: 55,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 10,
  },
  titleContainerDark: {
    backgroundColor: '#333333',
  },
  titleContainerLight: {
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'left',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  darkBackground: {
    backgroundColor: '#1c1c1c',
  },
  lightBackground: {
    backgroundColor: '#f0f0f0',
  },
  redText: {
    color: '#FF0F0F', // Using orange as a warning color
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
  headerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  disabledItem: {
    opacity: 0.4,
  },
  disabledText: {
    color: '#aaaaaa',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  thumbTouchSize: {
    width: 40,
    height: 40,
  },
  trackStyle: {
    height: 5,
  },
  thumbStyle: {
    height: 20,
    width: 20,
  },
  minimumTrackTintColor: {
    color: '#2196F3',
  },
  maximumTrackTintColorDark: {
    color: '#666666',
  },
  maximumTrackTintColorLight: {
    color: '#D1D1D6',
  },
  thumbTintColor: {
    color: '#FFFFFF',
  },
});

export default SettingsPage;
