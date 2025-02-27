import React, { useEffect,useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loadSetting, saveSetting } from '../logic/SettingsHelper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SETTINGS_KEYS, SIMULATED_PUCK_DEFAULT } from '../consts';
import { NavigationProps } from '../components/types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useStatus } from '../providers/AugmentOSStatusProvider';
import { doesHaveAllPermissions } from '../logic/PermissionsUtils';
import { isAugmentOsCoreInstalled, openCorePermissionsActivity, stopExternalService } from '../bridge/CoreServiceStarter';

interface SplashScreenProps {
  //navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({}) => {
  const navigation = useNavigation<NavigationProps>();
  const { user, loading } = useAuth();
  const { status, startBluetoothAndCore } = useStatus();

  useEffect(() => {
    const initializeApp = async () => {
      const simulatedPuck = await loadSetting(SETTINGS_KEYS.SIMULATED_PUCK, SIMULATED_PUCK_DEFAULT);
      let previouslyBondedPuck = await loadSetting(SETTINGS_KEYS.PREVIOUSLY_BONDED_PUCK, false);

      // Handle core being uninstalled
      if (simulatedPuck && !(await isAugmentOsCoreInstalled())) {
        await saveSetting(SETTINGS_KEYS.PREVIOUSLY_BONDED_PUCK, false);
        previouslyBondedPuck = false;
      }

      /*
      The purpose of SplashScreen is to route the user wherever the user needs to be
      If they're not logged in => login screen
      If they're logged in, but no perms => perm screen
      If they're logged in + perms => SimulatedPucK setup
      */
      if (user) {
        if (await doesHaveAllPermissions()) {
          startBluetoothAndCore();
          if (previouslyBondedPuck) {
            // if (status.core_info.puck_connected) {
            //   navigation.reset({
            //     index: 0,
            //     routes: [{ name: 'Home' }],
            //   });
            // } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'ConnectingToPuck' }],
              });
            // }
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
            routes: [{ name: 'GrantPermissionsScreen' }],
          });
        }
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };

    if (!loading) {
      initializeApp();
    }
  }, [navigation, user, loading, status, startBluetoothAndCore]);

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
