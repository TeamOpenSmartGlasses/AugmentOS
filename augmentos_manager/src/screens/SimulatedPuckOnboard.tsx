import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStatus } from '../AugmentOSStatusProvider';
import { loadSetting } from '../augmentos_core_comms/SettingsHelper';
import {
  SETTINGS_KEYS,
  SIMULATED_PUCK_DEFAULT,
} from '../consts';
import {
  openCorePermissionsActivity,
  areAllCorePermissionsGranted,
} from '../augmentos_core_comms/CoreServiceStarter';
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
  toggleTheme,
}) => {
  const [isSimulatedPuck, setIsSimulatedPuck] = useState(false);
  const [isCoreInstalled, setIsCoreInstalled] = useState(false);
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  // Single loading gate
  const [isLoading, setIsLoading] = useState(true);

  const { status } = useStatus();
  const navigation = useNavigation<NavigationProps>();

  // ---------------------------------------------------------------
  // 1) On mount or when status changes, initialize:
  //    load settings, (conditionally) fetch store data,
  //    and check installation status.
  // ---------------------------------------------------------------
  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. Load the "simulated puck" setting
        const simulatedPuck = await loadSetting(
          SETTINGS_KEYS.SIMULATED_PUCK,
          SIMULATED_PUCK_DEFAULT
        );
        setIsSimulatedPuck(simulatedPuck);
        setIsCoreInstalled(true);
        if(await areAllCorePermissionsGranted()) {
            navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          openCorePermissionsActivity();
        }

        // // 3. Check if core is installed
        // const installed = await isAugmentOsCoreInstalled();
        // setIsCoreInstalled(installed);
      } catch (error) {
        console.error('Error in initialization:', error);
      }

      // 4. Done loading everything we need for the initial screen
      setIsLoading(false);
    };

    initialize();
  }, [status]); // status remains in dependencies

  // // ---------------------------------------------------------------
  // // 4) Listen for app state changes to update installation status,
  // //    but do *not* set isLoading to true again.
  // // ---------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        if (await areAllCorePermissionsGranted()) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'GrantPermissionsScreen' }],
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [status]);

  // ---------------------------------------------------------------
  // If "isLoading" is true, show ONE smooth loader
  // ---------------------------------------------------------------
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator
          size="large"
          color={isDarkTheme ? '#FFFFFF' : '#2196F3'}
        />
        <Text
          style={[
            styles.loadingText,
            isDarkTheme ? styles.lightText : styles.darkText,
          ]}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // Past this point, we show the normal UI
  // ---------------------------------------------------------------
  const instructionText = 'Your AugmentOS is outdated. Please update AugmentOS to continue.';
  const buttonText = 'Update AugmentOS';

  return (
    <View
      style={[
        styles.container,
        isDarkTheme ? styles.darkBackground : styles.lightBackground,
      ]}
    >
      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Icon
              name="cellphone-link"
              size={80}
              color={isDarkTheme ? '#FFFFFF' : '#2196F3'}
            />
          </View>

          <Text
            style={[
              styles.title,
              isDarkTheme ? styles.lightText : styles.darkText,
            ]}
          >
            AugmentOS Setup
          </Text>

          <Text
            style={[
              styles.description,
              isDarkTheme ? styles.lightSubtext : styles.darkSubtext,
            ]}
          >
            {instructionText}
          </Text>

          {isSimulatedPuck && (
            <View style={styles.setupContainer}>
              <Button
                onPress={() => {}}
                isDarkTheme={isDarkTheme}
                disabled={isDownloadingCore}
                iconName="download"
              >
                {buttonText}
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
