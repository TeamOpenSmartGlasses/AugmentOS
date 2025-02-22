import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../components/types';
import NavigationBar from '../components/NavigationBar';
import BluetoothService from '../BluetoothService';
import { MOCK_CONNECTION } from '../consts';
import GroupTitle from '../components/settings/GroupTitle';
import ToggleSetting from '../components/settings/ToggleSetting';
import TextSetting from '../components/settings/TextSetting';
import SliderSetting from '../components/settings/SliderSetting';
import SelectSetting from '../components/settings/SelectSetting';
import MultiSelectSetting from '../components/settings/MultiSelectSetting';
import TitleValueSetting from '../components/settings/TitleValueSetting';
import LoadingComponent from '../components/LoadingComponent';
import { useStatus } from '../AugmentOSStatusProvider';
import BackendServerComms from '../backend_comms/BackendServerComms';

type AppSettingsProps = NativeStackScreenProps<RootStackParamList, 'AppSettings'> & {
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
  const backendServerComms = BackendServerComms.getInstance();

  // Contains the entire data structure from the server (instructions, settings, etc.)
  const [appInfo, setAppInfo] = useState<any>(null);
  // This tracks the current values of each setting for immediate UI updates
  const [settingsState, setSettingsState] = useState<{ [key: string]: any }>({});

  // Pull the core token from your global status (if you store it there)
  const { status } = useStatus();

  // Fetch TPA settings from the server on mount (and when packageName or token changes)
  useEffect(() => {
    const coreToken = status.core_info.core_token; // local variable

    // If no token is available, we can’t fetch
    if (!coreToken) {
      console.warn('No core token available. Cannot fetch TPA settings.');
      return;
    }

    (async () => {
      try {
        const data = await backendServerComms.getTpaSettings(coreToken, packageName);
        setAppInfo(data);

        // Initialize settingsState from data.settings
        if (data.settings && Array.isArray(data.settings)) {
          const initialState: { [key: string]: any } = {};
          data.settings.forEach((setting: any) => {
            if (setting.type !== 'group') {
              initialState[setting.key] = setting.currentValue;
            }
          });
          setSettingsState(initialState);
        }
      } catch (err) {
        console.error('Error fetching TPA settings:', err);
      }
    })();
  }, [status, packageName]);

  // Update local state when a setting changes
  const handleSettingChange = (key: string, value: any) => {
    console.log(`Changing ${key} to ${value}`);

    setSettingsState((prevState) => ({
      ...prevState,
      [key]: value,
    }));

    if (!MOCK_CONNECTION) {
      const settingObj = { [key]: value };
      bluetoothService.sendUpdateAppSetting(packageName, settingObj);
    }
  };

  // Theme colors
  const theme = {
    backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
  };

  const renderSetting = (setting: any, index: number) => {
    switch (setting.type) {
      case 'group':
        return <GroupTitle key={`group-${index}`} title={setting.title} theme={theme} />;
      case 'toggle':
        return (
          <ToggleSetting
            key={index}
            label={setting.label}
            value={settingsState[setting.key]}
            onValueChange={(val) => handleSettingChange(setting.key, val)}
            theme={theme}
          />
        );
      case 'text':
        return (
          <TextSetting
            key={index}
            label={setting.label}
            value={settingsState[setting.key]}
            onChangeText={(text) => handleSettingChange(setting.key, text)}
            theme={theme}
          />
        );
      case 'slider':
        return (
          <SliderSetting
            key={index}
            label={setting.label}
            value={settingsState[setting.key]}
            min={setting.min}
            max={setting.max}
            onValueChange={(val) =>
              setSettingsState((prevState) => ({
                ...prevState,
                [setting.key]: val, // Immediate UI update
              }))
            }
            onValueSet={(val) => handleSettingChange(setting.key, val)}
            theme={theme}
          />
        );
      case 'select':
        return (
          <SelectSetting
            key={index}
            label={setting.label}
            value={settingsState[setting.key]}
            options={setting.options}
            onValueChange={(val) => handleSettingChange(setting.key, val)}
            theme={theme}
          />
        );
      case 'multiselect':
        return (
          <MultiSelectSetting
            key={index}
            label={setting.label}
            values={settingsState[setting.key]}
            options={setting.options}
            onValueChange={(vals) => handleSettingChange(setting.key, vals)}
            theme={theme}
          />
        );
      case 'titleValue':
        return (
          <TitleValueSetting
            key={index}
            label={setting.label}
            value={setting.value}
            theme={theme}
          />
        );
      default:
        return null;
    }
  };

  if (!appInfo) {
    return <LoadingComponent message="Loading App Settings..." theme={theme} />;
  } else {
    if (appInfo.instructions && appInfo.settings?.length > 0) {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
          <ScrollView contentContainerStyle={styles.mainContainer}>
            <View style={[styles.instructionsContainer, { marginBottom: 20 }]}>
              <Text style={[styles.title, { color: theme.textColor }]}>
                Instructions
              </Text>
              <Text style={[styles.instructionsText, { color: theme.textColor }]}>
                {appInfo.instructions}
              </Text>
            </View>
            {appInfo.settings.map((setting: any, index: number) =>
              renderSetting({ ...setting, uniqueKey: `${setting.key}-${index}` }, index)
            )}
          </ScrollView>
        </SafeAreaView>
      );
    } else if (appInfo.instructions) {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
          <ScrollView contentContainerStyle={styles.mainContainer}>
            <View style={[styles.instructionsContainer, { marginBottom: 20 }]}>
              <Text style={[styles.title, { color: theme.textColor }]}>
                Description
              </Text>
              <Text style={[styles.instructionsText, { color: theme.textColor }]}>
                {appInfo.instructions}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    } else if (appInfo.settings?.length === 0) {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.text, { color: theme.textColor }]}>
              {appName} doesn't have any settings
            </Text>
          </View>
        </SafeAreaView>
      );
    } else {
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
          <ScrollView contentContainerStyle={styles.mainContainer}>
            {appInfo.settings.map((setting: any, index: number) =>
              renderSetting(setting, index)
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flexGrow: 1,
    padding: 16,
    alignItems: 'stretch',
  },
  instructionsContainer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  text: {
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default AppSettings;
