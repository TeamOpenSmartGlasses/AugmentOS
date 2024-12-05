import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Alert, PermissionsAndroid, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { bluetoothService } from '../BluetoothService';
import { useStatus } from '../AugmentOSStatusProvider';

interface ConnectedDeviceInfoProps {
  isDarkTheme: boolean;
}

const ConnectedDeviceInfo: React.FC<ConnectedDeviceInfoProps> = ({ isDarkTheme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const [connectedGlasses, setConnectedGlasses] = useState('');

  const { status, isSearching, isConnecting, refreshStatus } = useStatus();

  useFocusEffect(
    React.useCallback(() => {
      // Reset animations to initial values
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(-50);

      // Start animations if device is connected
      if (status.puck_connected) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Request permissions on Android
      if (Platform.OS === 'android' && Platform.Version >= 23) {
        PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]).then((result) => {
          console.log('Permissions granted:', result);
        });
      }

      // Cleanup function
      return () => {
        fadeAnim.stopAnimation();
        scaleAnim.stopAnimation();
        slideAnim.stopAnimation();
      };
    }, [status.puck_connected, fadeAnim, scaleAnim, slideAnim])
  );

  const handleConnect = async () => {
    try {
      await bluetoothService.scanForDevices();
    } catch (error) {
      // Alert.alert('Error', 'Failed to start scanning for devices');
      // console.error('Scanning error:', error);
      bluetoothService.emit('SHOW_BANNER', { message: 'Failed to start scanning for devices', type: 'error' })
    }
  };

  const connectGlasses = async () => {
    try {
      await bluetoothService.sendConnectWearable();
    } catch (error) {
      console.error('connect 2 glasses error:', error);
    }
  };

  const sendDisconnectWearable = async () => {
    try {
      await bluetoothService.sendDisconnectWearable();
    } catch (error) { }
  }

  const themeStyles = {
    backgroundColor: isDarkTheme ? '#333333' : '#F2F2F7',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    statusLabelColor: isDarkTheme ? '#CCCCCC' : '#666666',
    statusValueColor: isDarkTheme ? '#FFFFFF' : '#333333',
    connectedDotColor: '#28a745',
    separatorColor: isDarkTheme ? '#666666' : '#999999',
  };

  const getGlassesImage = (glasses: string | null) => {
    switch (glasses) {
      case 'Vuzix-z100':
      case 'Vuzix Z100':
      case 'Vuzix Ultralite':
        return require('../assets/glasses/vuzix-z100-glasses.png');
      case 'inmo_air':
        return require('../assets/glasses/inmo_air.png');
      case 'tcl_rayneo_x_two':
        return require('../assets/glasses/tcl_rayneo_x_two.png');
      case 'Vuzix_shield':
        return require('../assets/glasses/vuzix_shield.png');
      case 'virtual-wearable':
      case 'Audio Wearable':
        return require('../assets/glasses/virtual_wearable.png');
      default:
        return null;
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 75) { return 'battery-full'; }
    if (level > 50) { return 'battery-three-quarters'; }
    if (level > 25) { return 'battery-half'; }
    if (level > 10) { return 'battery-quarter'; }
    return 'battery-empty';
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) { return '#4CAF50'; }
    if (level > 20) { return '#FFB300'; }
    return '#FF5722';
  };

  const formatGlassesTitle = (title: string) =>
    title.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const batteryIcon = getBatteryIcon(status.glasses_info?.battery_life ?? 0);
  const batteryColor = getBatteryColor(status.glasses_info?.battery_life ?? 0);

  return (
    <View style={[styles.deviceInfoContainer, { backgroundColor: themeStyles.backgroundColor }]}>
      {status.puck_connected ? (
        <>
          {status.glasses_info?.model_name ? (
            <View style={styles.connectedContent}>
              <Animated.Image
                source={getGlassesImage(status.glasses_info.model_name)}
                style={[styles.glassesImage, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
              />
              <Animated.View style={[styles.connectedStatus, { transform: [{ translateX: slideAnim }] }]}>
                <Text style={[styles.connectedDot, { color: themeStyles.connectedDotColor }]}>●</Text>
                <Text style={styles.connectedTextGreen}>Connected</Text>
                <Text style={[styles.separator, { color: themeStyles.separatorColor }]}>|</Text>
                <Text style={[styles.connectedTextTitle, { color: themeStyles.textColor }]}>
                  {formatGlassesTitle(connectedGlasses)} {status.glasses_info.model_name}
                </Text>
              </Animated.View>
              <Animated.View style={[styles.statusBar, { opacity: fadeAnim }]}>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: themeStyles.statusLabelColor }]}>Battery</Text>
                  <View style={styles.batteryContainer}>
                    <Icon name={batteryIcon} size={16} color={batteryColor} style={styles.batteryIcon} />
                    <Text style={[styles.batteryValue, { color: batteryColor }]}>
                      {status.glasses_info.battery_life}%
                    </Text>
                  </View>
                </View>

                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: themeStyles.statusLabelColor }]}>Brightness</Text>
                  <Text style={[styles.statusValue, { color: themeStyles.statusValueColor }]}>87%</Text>
                </View>
                <TouchableOpacity 
                  style={styles.disconnectButton} 
                  onPress={sendDisconnectWearable}
                >
                  <Icon name="power-off" size={18} color="white" style={styles.icon} />
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          ) : (
            <View style={styles.noGlassesContent}>
              <Text style={styles.noGlassesText}>No Glasses Connected</Text>
              <TouchableOpacity style={styles.connectButton} onPress={connectGlasses}>
                <Icon name="wifi" size={16} color="white" style={styles.icon} />
                <Text style={styles.buttonText}>Connect Glasses</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <View style={styles.disconnectedContent}>
          <Text style={[styles.connectText, { color: themeStyles.textColor }]}>
            {isSearching ? 'Searching for Puck...' : isConnecting ? 'Connecting to Puck...' : 'No device connected'}
          </Text>
          {isSearching || isConnecting ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : (
            <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
              <Icon name="wifi" size={16} color="white" style={styles.icon} />
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  deviceInfoContainer: {
    padding: 10,
    borderRadius: 10,
    width: '100%',
    minHeight: 250,
    justifyContent: 'center',
    marginTop: 15,
  },
  connectedContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noGlassesContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassesImage: {
    width: '80%',
    height: '50%',
    resizeMode: 'contain',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    width: '100%',
    backgroundColor: '#6750A414',
    flexWrap: 'wrap',
  },
  statusInfo: {
    alignItems: 'center',
    flex: 1,
    marginRight: 20,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryIcon: {
    marginRight: 4,
  },
  batteryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  connectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  connectedDot: {
    fontSize: 14,
    marginRight: 2,
    fontFamily: 'Montserrat-Bold',
  },
  separator: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  connectedTextGreen: {
    color: '#28a745',
    marginLeft: 4,
    marginRight: 2,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  connectedTextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.08,
    fontFamily: 'SF Pro',
  },
  connectText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Montserrat-Bold',
  },
  noGlassesText: {
    color: 'black',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 10,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    width: '80%',
  },
  icon: {
    marginRight: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  disconnectButton: {
    flexDirection: 'row',
    backgroundColor: '#E24A24',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    marginRight: 5,
    width: '35%',
  },
  disconnectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat-Regular',
  },
});

export default ConnectedDeviceInfo;