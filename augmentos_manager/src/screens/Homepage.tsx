import React, { useRef, useCallback, PropsWithChildren } from 'react';
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
import { SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT } from '../consts';
import { loadSetting } from '../augmentos_core_comms/SettingsHelper';

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

  // Initialize animations with starting values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  // Create a single AnimatedView component to reduce code duplication
  const AnimatedSection: React.FC<AnimatedSectionProps> = useCallback(
    ({ children }) => (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
        {children}
      </Animated.View>
    ),
    [fadeAnim, slideAnim],
  );

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
      // Reset animations immediately when screen is about to focus
      fadeAnim.setValue(0);
      slideAnim.setValue(-50);

      // Start animations after a brief delay to ensure layout is ready
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
        // Reset animations on cleanup
        fadeAnim.setValue(0);
        slideAnim.setValue(-50);
      };
    }, [fadeAnim, slideAnim]),
  );

  const currentThemeStyles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <View style={currentThemeStyles.container}>
      <ScrollView style={currentThemeStyles.contentContainer}>
        <AnimatedSection>
          <Header isDarkTheme={isDarkTheme} navigation={navigation} />
        </AnimatedSection>

        {!isSimulatedPuck && (
        <AnimatedSection>
          <PuckConnection isDarkTheme={isDarkTheme} />
        </AnimatedSection>
        )}

        <AnimatedSection>
          <ConnectedDeviceInfo isDarkTheme={isDarkTheme} />
        </AnimatedSection>

        {status.puck_connected &&
          <>
            {status?.apps.length > 0 ? (
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
        }
      </ScrollView>
      <NavigationBar toggleTheme={toggleTheme} isDarkTheme={isDarkTheme} />
    </View>
  );
};

const lightThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingBottom:55,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 55,
  },
  noAppsText: {
    marginTop:10,
    color: '#000000',
    fontFamily: 'Montserrat-Regular',
  },
});

const darkThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingBottom:55,
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

export default Homepage;
