import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, ScrollView, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import ConnectedDeviceInfo from '../components/ConnectedDeviceInfo';
import RunningAppsList from '../components/RunningAppsList';
import YourAppsList from '../components/YourAppsList';
import NavigationBar from '../components/NavigationBar';
import PuckConnection from '../components/PuckConnection';
import { useStatus } from '../AugmentOSStatusProvider';
import { AppInfo } from '../AugmentOSStatusParser';

interface HomepageProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ isDarkTheme, toggleTheme }) => {
  const navigation = useNavigation(); // Access navigation using the hook

  const { status, refreshStatus } = useStatus(); // Access status data and refreshStatus function
  const [isLoading, setIsLoading] = useState(false);
  const getRunningApps = (): AppInfo[] => {
    return status.apps.filter(app => app.is_running);
  }

  // Initialize animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Start animations for fade and slide
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
      <ScrollView>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Header isDarkTheme={isDarkTheme} navigation={navigation} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PuckConnection isDarkTheme={isDarkTheme} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ConnectedDeviceInfo isDarkTheme={isDarkTheme} />
        </Animated.View>
        {getRunningApps().length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <RunningAppsList isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />
          </Animated.View>
        )}

        {status?.apps.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <YourAppsList isDarkTheme={isDarkTheme} />
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text>No apps found. Visit the AugmentOS App Store to explore and download apps for your device.</Text>
        </Animated.View>
        )}
      </ScrollView>
      <NavigationBar toggleTheme={toggleTheme} isDarkTheme={isDarkTheme} />

    </View>
  );
};

// Light theme styles
const lightThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});

// Dark theme styles
const darkThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
});

export default Homepage;
