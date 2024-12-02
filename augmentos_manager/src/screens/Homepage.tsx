import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import ConnectedDeviceInfo from '../components/ConnectedDeviceInfo';
import RunningAppsList from '../components/RunningAppsList';
import YourAppsList from '../components/YourAppsList';
import NavigationBar from '../components/NavigationBar';
import PuckConnection from '../components/PuckConnection';
import { useStatus } from '../AugmentOSStatusProvider';
import { AppInfo } from '../AugmentOSStatusParser';

const { height } = Dimensions.get('window');

interface HomepageProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ isDarkTheme, toggleTheme }) => {
  const navigation = useNavigation();
  const { status } = useStatus();

  // Simulated apps data
  const simulatedApps: AppInfo[] = [
    {
      name: "YouTube",
      package_name: "com.google.android.youtube",
      icon: "youtube_icon",
      description: "Video streaming platform",
      is_running: true,
      is_foreground: true
    },
    {
      name: "Netflix",
      package_name: "com.netflix.mediaclient",
      icon: "netflix_icon",
      description: "Movie and TV streaming",
      is_running: false,
      is_foreground: false
    },
    {
      name: "Chrome",
      package_name: "com.android.chrome",
      icon: "chrome_icon",
      description: "Web browser",
      is_running: true,
      is_foreground: false
    },
    {
      name: "Maps",
      package_name: "com.google.android.apps.maps",
      icon: "maps_icon",
      description: "Navigation app",
      is_running: false,
      is_foreground: false
    }
  ];

  const getRunningApps = (): AppInfo[] => {
    return simulatedApps.filter(app => app.is_running);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const currentThemeStyles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <View style={currentThemeStyles.container}>
      <View style={styles.contentContainer}>
        <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Header isDarkTheme={isDarkTheme} navigation={navigation} />
        </Animated.View>

        <Animated.View style={[styles.puckSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <PuckConnection isDarkTheme={isDarkTheme} />
        </Animated.View>

        <Animated.View style={[styles.deviceSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ConnectedDeviceInfo isDarkTheme={isDarkTheme} />
        </Animated.View>

        {getRunningApps().length > 0 && (
          <Animated.View style={[styles.runningAppsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <RunningAppsList isDarkTheme={isDarkTheme} />
          </Animated.View>
        )}

        {simulatedApps.length > 0 ? (
          <Animated.View style={[styles.appsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <YourAppsList isDarkTheme={isDarkTheme} />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.noAppsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={{ color: isDarkTheme ? '#FFFFFF' : '#000000' }}>
              No apps found. Visit the AugmentOS App Store to explore and download apps for your device.
            </Text>
          </Animated.View>
        )}
      </View>
      <NavigationBar toggleTheme={toggleTheme} isDarkTheme={isDarkTheme} />
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  headerSection: {
    height: height * 0.08,
    marginBottom: 0,
  },
  puckSection: {
    height: height * 0.06,
  },
  deviceSection: {
    height: height * 0.25,
    marginBottom: 10,
  },
  runningAppsSection: {
    height: height * 0.2,
    marginBottom: 10,
  },
  appsSection: {
    height: height * 0.25,
    marginBottom: 10,
  },
  noAppsSection: {
    height: height * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const lightThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
});

const darkThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
});

export default Homepage;