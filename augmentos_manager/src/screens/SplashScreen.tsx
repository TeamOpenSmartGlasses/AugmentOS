import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loadSetting } from '../augmentos_core_comms/SettingsHelper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT } from '../consts';
import { NavigationProps } from '../components/types';

interface SplashScreenProps {
  //navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({}) => {
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    const initializeApp = async () => {
      const simulatedPuck = await loadSetting(SETTINGS_KEYS.SIMULATED_PUCK, SIMULATED_PUCK_DEFAULT);
      const previouslyBondedPuck = await loadSetting(SETTINGS_KEYS.PREVIOUSLY_BONDED_PUCK, false);
      const authenticated = true;
      
      if (authenticated) {
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
        // navigation.reset({
        //     index: 0,
        //     routes: [{ name: 'Home' }],
        //   });
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

    initializeApp();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>AugmentOS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default SplashScreen;
