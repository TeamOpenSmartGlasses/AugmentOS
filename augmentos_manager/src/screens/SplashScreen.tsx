import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loadSetting } from '../augmentos_core_comms/SettingsHelper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT } from '../consts';
import { NavigationProps } from '../components/types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

interface SplashScreenProps {
  //navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({}) => {
  const navigation = useNavigation<NavigationProps>();
  const { user, loading } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      const simulatedPuck = await loadSetting(SETTINGS_KEYS.SIMULATED_PUCK, SIMULATED_PUCK_DEFAULT);
      const previouslyBondedPuck = await loadSetting(SETTINGS_KEYS.PREVIOUSLY_BONDED_PUCK, false);
      const authenticated = false;
      
      if (user) {
        if (previouslyBondedPuck) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else if (simulatedPuck) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'SimulatedPuckOnboard' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };

    if (!loading)
      initializeApp();
  }, [navigation, user, loading]);

  return (
    <View style={styles.container}>
      {loading ? (
        <View>
          <Text style={styles.text}>Loading...</Text>
          <Text style={styles.subText}>Please wait while we authenticate</Text>
        </View>
      ) : user ? (
        <View>
          <Text style={styles.text}>Welcome Back!</Text>
          <Text style={styles.subText}>{user.email}</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.text}>AugmentOS</Text>
          <Text style={styles.subText}>Please log in to continue</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subText: {  // Add this new style
    fontSize: 16,
    marginTop: 8,
  },
});

export default SplashScreen;
