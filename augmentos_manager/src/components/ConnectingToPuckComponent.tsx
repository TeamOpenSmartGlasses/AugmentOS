import React ,{useEffect}from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {useStatus} from "../AugmentOSStatusProvider.tsx";
import {useNavigation} from "@react-navigation/native";
import {NavigationProps} from "./types.ts";
import { useAuth } from '../AuthContext.tsx';
import BluetoothService from '../BluetoothService.tsx';

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
  const { user, loading } = useAuth();

  useEffect(() => {
    if (status.puck_connected) {
      let uid = user.email || user.id;
      if(status.auth.core_token_owner == null || status.auth.core_token_owner != uid){
        console.log("OWNER IS NULL CALLING VERIFY");
        //TODO: Replace user.id with a proper CoreToken
        bluetoothService.setAuthenticationSecretKey(uid, user.id);
      }

      navigation.reset({
        index: 0,
        routes: [{name: 'Home'}],
      });
    }
  }, [navigation, status]);

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
