// GlassesPairingGuideScreen.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native'; // <<--- import useRoute
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import { BluetoothService } from '../BluetoothService';
import { loadSetting, saveSetting } from '../augmentos_core_comms/SettingsHelper';
import { SETTINGS_KEYS } from '../consts';
import { NavigationProps } from '../components/types';
import { getGlassesImage } from '../logic/getGlassesImage';
import PairingDeviceInfo from '../components/PairingDeviceInfo';
import { EvenRealitiesG1PairingGuide, VuzixZ100PairingGuide } from '../components/GlassesPairingGuides';
// import NavigationBar from '../components/NavigationBar'; // if needed

interface GlassesPairingGuideScreenProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
}

const GlassesPairingGuideScreen: React.FC<GlassesPairingGuideScreenProps> = ({
  isDarkTheme,
  toggleTheme,
}) => {
    const { status } = useStatus();
    const route = useRoute();
    const bluetoothService = BluetoothService.getInstance();
    const { glassesModelName } = route.params as { glassesModelName: string };
    const navigation = useNavigation<NavigationProps>();

    React.useEffect(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        const actionType = e.data?.action?.type;
        if (actionType === 'GO_BACK' || actionType === 'POP') {
          bluetoothService.sendForgetSmartGlasses();
          bluetoothService.sendDisconnectWearable();
        } else {
          console.log('Navigation triggered by', actionType, 'so skipping disconnect logic.');
        }
      });
    
      return unsubscribe;
    }, [navigation]);
    

  React.useEffect(() => {
    console.log('Pairing guide started for: ', glassesModelName);
    bluetoothService.sendConnectWearable(glassesModelName);
  }, [glassesModelName]);

  React.useEffect(() => {
    // If puck gets d/c'd here, return to home
    if (!status.puck_connected){
      console.log("RETURN HOME FROM PAIR SCREEN: DISCONNECTED FROM PUCK")
      navigation.navigate('Home');
    }
    
    // If pairing successful, return to home
    if (status.puck_connected && status.glasses_info?.model_name) {
      console.log("RETURN HOME FROM PAIR SCREEN: GOT MODEL NAME: " + status.glasses_info?.model_name);
      navigation.navigate('Home');
    }
  }, [status]);

  const getPairingGuide = (glassesModelName: string) => {
    switch (glassesModelName) {
      case 'Even Realities G1':
        return <EvenRealitiesG1PairingGuide isDarkTheme={isDarkTheme}/>;
      case 'Vuzix Z100':
        return <VuzixZ100PairingGuide isDarkTheme={isDarkTheme}/>;
      default:
        return <View />;
    }
  };

  return (
    <View style={[styles.container, isDarkTheme ? styles.darkBackground : styles.lightBackground]}>
      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.contentContainer}>
          <PairingDeviceInfo glassesModelName={glassesModelName} isDarkTheme={isDarkTheme} />
          {getPairingGuide(glassesModelName)}
        </View>
      </ScrollView>
    </View>
  );
};

export default GlassesPairingGuideScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollViewContainer: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  glassesImage: {
    width: 100,
    height: 60,
    resizeMode: 'contain',
    marginTop: 20,
  },
  darkBackground: {
    backgroundColor: '#1c1c1c',
  },
  lightBackground: {
    backgroundColor: '#f9f9f9',
  },
  darkText: {
    color: '#FFFFFF',
  },
  lightText: {
    color: '#333333',
  },
});

