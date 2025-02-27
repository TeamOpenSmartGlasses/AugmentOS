import React ,{useEffect}from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {useStatus} from "../providers/AugmentOSStatusProvider.tsx";
import {useNavigation} from "@react-navigation/native";
import {NavigationProps} from "./types.ts";
import { useAuth } from '../AuthContext.tsx';
import BluetoothService from '../BluetoothService.tsx';
import BackendServerComms from '../backend_comms/BackendServerComms.tsx';

interface ConnectingToPuckComponentProps {
  isDarkTheme?: boolean;
  toggleTheme?: () => void;
}

const ConnectingToPuckComponent = ({
  isDarkTheme,
  toggleTheme,
}: ConnectingToPuckComponentProps) => {
  const { status } = useStatus();
  const navigation = useNavigation<NavigationProps>();
  const bluetoothService = BluetoothService.getInstance();
  const { user, session, loading } = useAuth();
  

  useEffect(() => {
    // We only proceed once the puck is connected, the user is loaded, etc.
    if (status.core_info.puck_connected && !loading && user) {
      // 1) Get the Supabase token from your AuthContext
      const supabaseToken = session?.access_token;
      if (!supabaseToken) {
        console.log('No Supabase token found');
        return;
      }
      
      // 2) Check if we need to do the exchange
      if (!status.auth.core_token_owner || status.auth.core_token_owner !== user.email) {
        console.log("OWNER IS NULL CALLING VERIFY (TOKEN EXCHANGE)");

        // 3) Exchange token with your backend
        const backend = BackendServerComms.getInstance();
        backend.exchangeToken(supabaseToken)
          .then((coreToken) => {
            let uid = user.email || user.id;
            bluetoothService.setAuthenticationSecretKey(uid, coreToken);

            // 5) Optionally update your local status or do something if needed
            // e.g. set status.auth.core_token_owner = user.email
            // or navigate:
            // navigation.reset({
            //   index: 0,
            //   routes: [{ name: 'Home' }],
            // });
          })
          .catch((err) => {
            console.error('Token exchange failed:', err);
            // handle error
          });
      } else {
        // If we already have a token or the owner is set, go straight to Home
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    }
  }, [status, loading, user]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.loadingText}>Loading AugmentOS...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000',
  },
});

export default ConnectingToPuckComponent;
