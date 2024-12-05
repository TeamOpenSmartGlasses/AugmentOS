import React, { useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, Text } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
  const navigation = useNavigation();
  const { status } = useStatus();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const animationState = useRef({ isAnimating: false }).current;

  const getRunningApps = (): AppInfo[] => {
    return status.apps.filter(app => app.is_running);
  };

  // Use useFocusEffect instead of useEffect
  useFocusEffect(
    React.useCallback(() => {
      // Animation logic moved inside useCallback
      const startAnimations = () => {
        // Reset animations
        fadeAnim.setValue(0);
        slideAnim.setValue(-50);

        // Prevent multiple animation starts
        if (animationState.isAnimating) { return; }
        animationState.isAnimating = true;

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
        ]).start(() => {
          animationState.isAnimating = false;
        });
      };

      startAnimations();

      return () => {
        // Optional cleanup
        animationState.isAnimating = false;
      };
    }, [animationState, fadeAnim, slideAnim]) // Only depend on the animation values
  );

  const currentThemeStyles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <View style={currentThemeStyles.container}>
       {/* Margin bottom is 60 as super quick ugly hack for navbar */}
      <ScrollView style={{marginBottom:60}}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Header isDarkTheme={isDarkTheme} navigation={navigation} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PuckConnection isDarkTheme={isDarkTheme} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ConnectedDeviceInfo isDarkTheme={isDarkTheme} />
        </Animated.View>

        {status?.apps.length > 0 ? (
          <>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <RunningAppsList isDarkTheme={isDarkTheme} />
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <YourAppsList isDarkTheme={isDarkTheme} key={Math.random()} />
            </Animated.View>
          </>
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
