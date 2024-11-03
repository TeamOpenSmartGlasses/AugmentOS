import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusProvider } from './AugmentOSStatusProvider';
import Homepage from './screens/Homepage';
import SettingsPage from './screens/SettingsPage';
import IntroScreen from './screens/IntroScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileSettingsPage from './screens/ProfileSettingsPage';
import GlassesMirror from './screens/GlassesMirror';
import { StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => {
    setIsDarkTheme((prevTheme) => !prevTheme);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Intro">
            <Stack.Screen
              name="Intro"
              component={IntroScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              options={{ headerShown: false }}
            >
              {() => <Homepage isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />}
            </Stack.Screen>
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SettingsPage"
              options={{ headerShown: false }}
            >
              {() => <SettingsPage isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />}
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
              }}
            >
              {(props) => <ProfileSettingsPage {...props} isDarkTheme={isDarkTheme} />}
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
              }}
            >
              {() => <GlassesMirror isDarkTheme={isDarkTheme} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </StatusProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
