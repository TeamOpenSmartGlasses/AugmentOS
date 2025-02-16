import React, {
  useRef,
  useCallback,
  PropsWithChildren,
  useState,
  useEffect,
} from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Header from '../components/Header';
import ConnectedDeviceInfo from '../components/ConnectedDeviceInfo';
import RunningAppsList from '../components/RunningAppsList';
import YourAppsList from '../components/YourAppsList';
import NavigationBar from '../components/NavigationBar';
import PuckConnection from '../components/PuckConnection';
import { useStatus } from '../AugmentOSStatusProvider';
import { ScrollView } from 'react-native-gesture-handler';
import {
  GET_APP_STORE_DATA_ENDPOINT,
  SETTINGS_KEYS,
  SIMULATED_PUCK_DEFAULT,
} from '../consts';
import { loadSetting } from '../augmentos_core_comms/SettingsHelper';
import { AppStoreItem, NavigationProps } from '../components/types.ts';
import { NativeModules } from 'react-native';
import BackendServerComms from '../backend_comms/BackendServerComms.tsx';
const { FetchConfigHelperModule } = NativeModules;
import semver from 'semver';
import { AUGMENTOS_MANAGER_PACKAGE_NAME, AUGMENTOS_CORE_PACKAGE_NAME } from '../consts';
import { fetchAppStoreData } from '../utils/backendUtils.ts';
import CloudConnection from '../components/CloudConnection.tsx';

interface HomepageProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
}

interface AnimatedSectionProps extends PropsWithChildren {
  delay?: number;
}

const Homepage: React.FC<HomepageProps> = ({ isDarkTheme, toggleTheme }) => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { status } = useStatus();
  const [isSimulatedPuck, setIsSimulatedPuck] = React.useState(false);
  const [appStoreData, setAppStoreData] = useState<AppStoreItem[]>([]);
  // We keep these only if you want them for display; no longer rely on them for immediate comparison
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [storeVersion, setStoreVersion] = useState<string | null>(null);

  const [isAugmentOSNotUpdatedString, setIsAugmentOSNotUpdatedString] =
    useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (!status.puck_connected || !status.auth.core_token_owner) {
      navigation.reset({
        index: 0,
        routes: [{name: 'ConnectingToPuck'}],
      });
    }
  }, [navigation, status]);

  /**
   * 2) Fetch the local config for the manager; return the version instead
   *    of only setting it in state. We'll still setLocalVersion for other usage.
   */
  const fetchConfig = async (packageName: string): Promise<string | null> => {
    try {
      const configJson = await FetchConfigHelperModule.fetchConfig(packageName);
      const parsedConfig = JSON.parse(configJson);
      const version = parsedConfig.version;
      // console.log('Local App Version:', version);
      setLocalVersion(version); // If you want to display or store it
      return version;
    } catch (error) {
      console.error(
        'Failed to load config for package name ' + packageName,
        error,
      );
      return null;
    }
  };

  /**
   * 3) For the core version, just return it. We'll still setLocalVersion in case
   *    you want to keep it for display in the component.
   */
  const fetchVersionFromStatus = (): string | null => {
    // console.log('AugmentOS Core Version:', status.augmentos_core_version);
    setLocalVersion(status?.augmentos_core_version);
    return status?.augmentos_core_version ?? null;
  };

  /**
   * 4) Compare versions in a single flow. We'll do the fetches, then compare
   *    using the local variables (rather than waiting on setState).
   */
  const compareVersions = async (packageName: string) => {
    return '' // TODO: Remove this
    // Fetch the store data (returns a fresh copy).
    const data = await fetchAppStoreData();

    // Fetch local version depending on the package
    let local: string | null = null;
    if (packageName === AUGMENTOS_MANAGER_PACKAGE_NAME) {
      local = await fetchConfig(packageName);
    } else {
      local = fetchVersionFromStatus();
    }

    if (!local) {
      // console.warn('Local version not available for ' + packageName);
      return '';
    }

    // Find store version from the newly fetched data
    const matchedApp = data.find(
      (app) => app.packageName === packageName,
    );

    if (!matchedApp) {
      console.warn(
        'App with the specified package name not found in store data: ' +
          packageName,
      );
      return '';
    }

    const storeVer = String(matchedApp.version);
    // console.log('Store App Version:', storeVer);
    setStoreVersion(storeVer); // If you need it in your component state

    // console.log(
    //   `Comparing local version (${local}) with store version (${storeVer})`,
    // );

    const appString = packageName === AUGMENTOS_MANAGER_PACKAGE_NAME ? 'AugmentOS Manager' : 'AugmentOS Core';

    // Use semver for comparison
    if (semver.lt(local, storeVer)) {
      console.log('A new version is available. Please update the app.');
      return `${appString}`;
    } else if (semver.gt(local, storeVer)) {
      console.log('Local version is ahead of store version.');
      return '';
    } else {
      // console.log('Local version is up-to-date.');
      return '';
    }
  };

  // Call both checks and concatenate any "update needed" messages
  // useEffect(() => {
  //   const checkUpdates = async () => {
  //     const isManagerNotUpToDateString = await compareVersions(
  //       AUGMENTOS_MANAGER_PACKAGE_NAME,
  //     );

  //     // If either returned a string, show them together
  //     setIsAugmentOSNotUpdatedString(
  //       (isManagerNotUpToDateString + '\n' ?? '').trim(),
  //     );
  //   };

  //   checkUpdates();
  // }, []);


  // Simple animated wrapper so we do not duplicate logic
  const AnimatedSection: React.FC<AnimatedSectionProps> = useCallback(
    ({ children }) => (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {children}
      </Animated.View>
    ),
    [fadeAnim, slideAnim],
  );

  // Load SIMULATED_PUCK setting once
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

  useFocusEffect(
    useCallback(() => {
      // Reset animations when screen is about to focus
      fadeAnim.setValue(0);
      slideAnim.setValue(-50);

      // Start animations after a short delay
      const animationTimeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 50);

      return () => {
        clearTimeout(animationTimeout);
        fadeAnim.setValue(0);
        slideAnim.setValue(-50);
      };
    }, [fadeAnim, slideAnim]),
  );

  const currentThemeStyles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <View style={currentThemeStyles.container}>
      {isAugmentOSNotUpdatedString.length > 0 ? (
        <View style={{ padding: 20, backgroundColor: '#ffcccc' }}>
            <Text style={{ color: '#cc0000', fontSize: 16 }}>
              Please open the app store tab and update the following apps:
            </Text>
            <Text style={{ color: '#cc0000', fontSize: 16 }}>
              {isAugmentOSNotUpdatedString}
            </Text>
        </View>
      ) : (
        <ScrollView style={currentThemeStyles.contentContainer}>
          <AnimatedSection>
            <Header isDarkTheme={isDarkTheme} navigation={navigation} />
          </AnimatedSection>

          {!isSimulatedPuck && (
            <AnimatedSection>
              <PuckConnection isDarkTheme={isDarkTheme} />
            </AnimatedSection>
          )}

          {status.cloud_connection_status !== 'CONNECTED' &&
          <AnimatedSection>
              <CloudConnection isDarkTheme={isDarkTheme} />
          </AnimatedSection>
          }

          <AnimatedSection>
            <ConnectedDeviceInfo isDarkTheme={isDarkTheme} />
          </AnimatedSection>

          {status.puck_connected && (
            <>
              {status.apps.length > 0 ? (
                <>
                  <AnimatedSection>
                    <RunningAppsList isDarkTheme={isDarkTheme} />
                  </AnimatedSection>

                  <AnimatedSection>
                    <YourAppsList
                      isDarkTheme={isDarkTheme}
                      key={`apps-list-${status.apps.length}`}
                    />
                  </AnimatedSection>
                </>
              ) : (
                <AnimatedSection>
                  <Text style={currentThemeStyles.noAppsText}>
                    No apps found. Visit the AugmentOS App Store to explore and
                    download apps for your device.
                  </Text>
                </AnimatedSection>
              )}
            </>
          )}
        </ScrollView>
      )}
      <NavigationBar toggleTheme={toggleTheme} isDarkTheme={isDarkTheme} />
    </View>
  );
};

const lightThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingBottom: 55,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 55,
  },
  noAppsText: {
    marginTop: 10,
    color: '#000000',
    fontFamily: 'Montserrat-Regular',
  },
});

const darkThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingBottom: 55,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 55,
  },
  noAppsText: {
    color: '#ffffff',
    fontFamily: 'Montserrat-Regular',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Homepage;
