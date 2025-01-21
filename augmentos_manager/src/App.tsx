import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusProvider } from './AugmentOSStatusProvider';
import Homepage from './screens/Homepage';
import SettingsPage from './screens/SettingsPage';
// import IntroScreen from './screens/IntroScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileSettingsPage from './screens/ProfileSettingsPage';
import GlassesMirror from './screens/GlassesMirror';
import NotificationListener from './components/NotificationListener';
import AppStore from './screens/AppStore';
import AppDetails from './screens/AppDetails';
import Reviews from './screens/ReviewSection.tsx';
import { StyleSheet } from 'react-native';
import { RootStackParamList } from './components/types'; // Update path as needed
import MessageBanner from './components/MessageBanner.tsx';
import SimulatedPuckSettings from './screens/SimulatedPuckSettings.tsx';
import SimulatedPuckOnboard from './screens/SimulatedPuckOnboard.tsx';
import SelectGlassesModelScreen from './screens/SelectGlassesModelScreen.tsx';
import GlassesPairingGuideScreen from './screens/GlassesPairingGuideScreen.tsx';
import SelectGlassesBluetoothScreen from './screens/SelectGlassesBluetoothScreen.tsx';
import PhoneNotificationSettings from './screens/PhoneNotificationSettings.tsx';
import { SearchResultsProvider } from './SearchResultsContext.tsx';
import AppSettings from './screens/AppSettings.tsx';
import LoginScreen from './screens/LoginScreen.tsx';
import SplashScreen from './screens/SplashScreen.tsx';

// Assign the RootStackParamList to the navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => {
    setIsDarkTheme(prevTheme => !prevTheme);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <NotificationListener>
        <StatusProvider>
          <SearchResultsProvider>
            <MessageBanner />
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Intro">
                <Stack.Screen
                  name="Intro"
                  component={SplashScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="Home" options={{ headerShown: false }}>
                  {() => (
                    <Homepage
                      isDarkTheme={isDarkTheme}
                      toggleTheme={toggleTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="Register"
                  component={RegisterScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="SettingsPage" options={{ headerShown: false }}>
                  {props => (
                    <SettingsPage
                      {...props}
                      isDarkTheme={isDarkTheme}
                      toggleTheme={toggleTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="AppStore"
                  options={{ title: 'App Store', headerShown: false }}>
                  {props => <AppStore {...props} isDarkTheme={isDarkTheme} />}
                </Stack.Screen>
                <Stack.Screen
                  name="Reviews"
                  options={({ route }) => ({
                    headerShown: false,

                    title: route.params.appName
                      ? `Reviews for ${route.params.appName}`
                      : 'Reviews',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#333333' : '#FFFFFF',
                    },
                    headerTintColor: isDarkTheme ? '#FFFFFF' : '#000000',
                  })}>
                  {props => <Reviews {...props} isDarkTheme={isDarkTheme} />}
                </Stack.Screen>

                <Stack.Screen
                  name="AppDetails"
                  options={({ route }) => ({
                    headerShown: false,
                    title: route.params.app.name || 'App Details',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#333333' : '#FFFFFF',
                    },
                    headerTintColor: isDarkTheme ? '#FFFFFF' : '#000000',
                    headerTitleStyle: {
                      color: isDarkTheme ? '#FFFFFF' : '#000000',
                    },
                  })}>
                  {props => <AppDetails toggleTheme={function (): void {
                    throw new Error('Function not implemented.');
                  }} {...props} isDarkTheme={isDarkTheme} />}
                </Stack.Screen>
                <Stack.Screen
                  name="ProfileSettings"
                  options={{
                    headerShown: false,
                    title: 'Profile Settings',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
                    },
                    headerTintColor: isDarkTheme ? '#ffffff' : '#000000',
                  }}>
                  {props => (
                    <ProfileSettingsPage {...props} isDarkTheme={isDarkTheme} />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="GlassesMirror"
                  options={{
                    headerShown: false,
                    title: 'Glasses Mirror',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
                    },
                    headerTintColor: isDarkTheme ? '#ffffff' : '#000000',
                  }}>
                  {() => <GlassesMirror isDarkTheme={isDarkTheme} />}
                </Stack.Screen>
                <Stack.Screen name="SimulatedPuckSettings"
                  options={{
                    title: 'Simulated Puck',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
                    },
                    headerTintColor: isDarkTheme ? '#ffffff' : '#000000',
                  }}>
                  {props => (
                    <SimulatedPuckSettings
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="SimulatedPuckOnboard"
                  options={{
                    title: 'Simulated Puck',
                    headerShown: false,
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
                    },
                    headerTintColor: isDarkTheme ? '#ffffff' : '#000000',
                  }}>
                  {props => (
                    <SimulatedPuckOnboard
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="AppSettings"
                  options={({ route }) => ({
                    title: route.params?.appName + ' Settings',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
                    },
                    headerTintColor: isDarkTheme ? '#ffffff' : '#000000',
                  })}>
                  {props => (
                    <AppSettings
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="PhoneNotificationSettings"
                  options={{
                    title: 'Notifications',
                    headerStyle: {
                      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
                    },
                    headerTintColor: isDarkTheme ? '#ffffff' : '#000000',
                  }}>
                  {props => (
                    <PhoneNotificationSettings
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="SelectGlassesModelScreen"
                  options={{ title: 'Select Glasses' }}
                >
                  {props => (
                    <SelectGlassesModelScreen
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="GlassesPairingGuideScreen"
                  options={{ title: 'Pairing Guide' }}
                >
                  {props => (
                    <GlassesPairingGuideScreen
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="SelectGlassesBluetoothScreen"
                  options={{ title: 'Finding Glasses' }}
                >
                  {props => (
                    <SelectGlassesBluetoothScreen
                      {...props}
                      toggleTheme={toggleTheme}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                </Stack.Screen>

              </Stack.Navigator>
            </NavigationContainer>
          </SearchResultsProvider>
        </StatusProvider>
      </NotificationListener>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
