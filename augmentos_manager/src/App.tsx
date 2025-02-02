import React, { useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StatusProvider, useStatus } from './AugmentOSStatusProvider';
import { SearchResultsProvider } from './SearchResultsContext';
import { AuthProvider } from './AuthContext';
import NotificationListener from './components/NotificationListener';
import MessageBanner from './components/MessageBanner';

import Homepage from './screens/Homepage';
import SettingsPage from './screens/SettingsPage';
import RegisterScreen from './screens/RegisterScreen';
import ProfileSettingsPage from './screens/ProfileSettingsPage';
import GlassesMirror from './screens/GlassesMirror';
import AppStore from './screens/AppStore';
import AppDetails from './screens/AppDetails';
import Reviews from './screens/ReviewSection';
import SimulatedPuckSettings from './screens/SimulatedPuckSettings';
import SimulatedPuckOnboard from './screens/SimulatedPuckOnboard';
import SelectGlassesModelScreen from './screens/SelectGlassesModelScreen';
import GlassesPairingGuideScreen from './screens/GlassesPairingGuideScreen';
import SelectGlassesBluetoothScreen from './screens/SelectGlassesBluetoothScreen';
import PhoneNotificationSettings from './screens/PhoneNotificationSettings';
import AppSettings from './screens/AppSettings';
import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import VerifyEmailScreen from './screens/VerifyEmail';

import 'react-native-url-polyfill/auto';

export type RootStackParamList = {
  SplashScreen: undefined;
  Login: undefined;
  VerifyEmailScreen: undefined;
  Home: undefined;
  Register: undefined;
  SettingsPage: undefined;
  AppStore: undefined;
  Reviews: { appName?: string };
  AppDetails: { app: any };
  ProfileSettings: undefined;
  GlassesMirror: undefined;
  SimulatedPuckSettings: undefined;
  SimulatedPuckOnboard: undefined;
  SelectGlassesModelScreen: undefined;
  GlassesPairingGuideScreen: undefined;
  SelectGlassesBluetoothScreen: undefined;
  AppSettings: { appName?: string };
  PhoneNotificationSettings: undefined;
};

const linking = {
  prefixes: ['https://augmentos.org'],
  config: {
    screens: {
      VerifyEmailScreen: 'verify_email',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainRoutes: React.FC<{ isDarkTheme: boolean; toggleTheme: () => void }> = ({
  isDarkTheme,
  toggleTheme,
}) => {
  const { status } = useStatus();

  if (!status.puck_connected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading AugmentOS...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="SplashScreen">
        <Stack.Screen
          name="SplashScreen"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VerifyEmailScreen"
          component={VerifyEmailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" options={{ headerShown: false }}>
          {() => (
            <Homepage isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />
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
          })}>
          {props => <Reviews {...props} isDarkTheme={isDarkTheme} />}
        </Stack.Screen>
        <Stack.Screen
          name="AppDetails"
          options={({ route }) => ({
            headerShown: false,
            title: route.params.app.name || 'App Details',
          })}>
          {props => (
            <AppDetails toggleTheme={toggleTheme} {...props} isDarkTheme={isDarkTheme} />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ProfileSettings"
          options={{
            headerShown: false,
            title: 'Profile Settings',
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
          }}>
          {() => <GlassesMirror isDarkTheme={isDarkTheme} />}
        </Stack.Screen>
        <Stack.Screen
          name="SimulatedPuckSettings"
          options={{
            title: 'Simulated Puck',
          }}>
          {props => (
            <SimulatedPuckSettings
              {...props}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="SimulatedPuckOnboard"
          options={{
            title: 'Simulated Puck',
            headerShown: false,
          }}>
          {props => (
            <SimulatedPuckOnboard
              {...props}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="AppSettings"
          options={({ route }) => ({
            title: route.params?.appName + ' Settings',
          })}>
          {props => (
            <AppSettings
              {...props}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="PhoneNotificationSettings"
          options={{
            title: 'Notifications',
          }}>
          {props => (
            <PhoneNotificationSettings
              {...props}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="SelectGlassesModelScreen"
          options={{ title: 'Select Glasses' }}>
          {props => (
            <SelectGlassesModelScreen
              {...props}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="GlassesPairingGuideScreen"
          options={{ title: 'Pairing Guide' }}>
          {props => (
            <GlassesPairingGuideScreen
              {...props}
              toggleTheme={toggleTheme}
              isDarkTheme={isDarkTheme}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="SelectGlassesBluetoothScreen"
          options={{ title: 'Finding Glasses' }}>
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
  );
};

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => {
    setIsDarkTheme(prevTheme => !prevTheme);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <NotificationListener>
        <AuthProvider>
          <StatusProvider>
            <SearchResultsProvider>
              <MessageBanner />
              <MainRoutes isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />
            </SearchResultsProvider>
          </StatusProvider>
        </AuthProvider>
      </NotificationListener>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000',
  },
});

export default App;
