import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface ConnectedDeviceInfoProps {
  isDarkTheme: boolean;
}

const ConnectedDeviceInfo: React.FC<ConnectedDeviceInfoProps> = ({ isDarkTheme }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedGlasses, setConnectedGlasses] = useState('');
  const [batteryLevel] = useState(83); // Add setBatteryLevel to update battery level - const [batteryLevel, setBatteryLevel] = useState(83);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (isConnected) {
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
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(-50);
    }
  }, [isConnected, fadeAnim, scaleAnim, slideAnim]);

  const handleConnect = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setConnectedGlasses('vuzix-z100');
      setIsLoading(false);
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectedGlasses('');
  };

  const formatGlassesTitle = (title: string) =>
    title.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  // Theme styles defined as JavaScript objects, not within StyleSheet
  const themeStyles = {
    backgroundColor: isDarkTheme ? '#333333' : '#F2F2F7',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    statusLabelColor: isDarkTheme ? '#CCCCCC' : '#666666',
    statusValueColor: isDarkTheme ? '#FFFFFF' : '#333333',
    connectedDotColor: '#28a745', // common color for connected dot
  };

  const getGlassesImage = (glasses: string) => {
    switch (glasses) {
      case 'vuzix-z100':
        return require('../assets/glasses/vuzix-z100-glasses.png');
      case 'inmo_air':
        return require('../assets/glasses/inmo_air.png');
      case 'tcl_rayneo_x_two':
        return require('../assets/glasses/tcl_rayneo_x_two.png');
      case 'vuzix_shield':
        return require('../assets/glasses/vuzix_shield.png');
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
    if (level > 60) { return '#4CAF50'; } // Green
    if (level > 20) { return '#FFB300'; } // Darker Yellow for better contrast
    return '#FF5722'; // Red
  };

  const glassesImage = getGlassesImage(connectedGlasses);
  const batteryIcon = getBatteryIcon(batteryLevel);
  const batteryColor = getBatteryColor(batteryLevel);

  return (
    <View style={[styles.deviceInfoContainer, { backgroundColor: themeStyles.backgroundColor }]}>
      {isConnected ? (
        <>
          {glassesImage && (
            <Animated.Image
              source={glassesImage}
              style={[styles.glassesImage, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
            />
          )}
          <Animated.View style={[styles.connectedStatus, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={[styles.connectedDot, { color: themeStyles.connectedDotColor }]}>●</Text>
            <Text style={styles.connectedTextGreen}>Connected</Text>
            <Text style={[styles.connectedTextTitle, { color: themeStyles.textColor }]}>
              | {formatGlassesTitle(connectedGlasses)} Glasses
            </Text>
          </Animated.View>

          <Animated.View style={[styles.statusBar, { opacity: fadeAnim }]}>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: themeStyles.statusLabelColor }]}>Battery</Text>
              <View style={styles.batteryContainer}>
                <Icon name={batteryIcon} size={20} color={batteryColor} style={styles.batteryIcon} />
                <Text style={[styles.batteryValue, { color: batteryColor }]}>{batteryLevel}%</Text>
              </View>
            </View>

            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: themeStyles.statusLabelColor }]}>Brightness</Text>
              <Text style={[styles.statusValue, { color: themeStyles.statusValueColor }]}>87%</Text>
            </View>

            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Icon name="power-off" size={18} color="white" style={styles.icon} />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      ) : (
        <>
          <Text style={[styles.connectText, { color: themeStyles.textColor }]}>
            {isLoading ? 'Connecting...' : 'No device connected'}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#2196F3" />
          ) : (
            <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
              <Icon name="wifi" size={18} color="white" style={styles.icon} />
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  deviceInfoContainer: {
    padding: 20,
    marginTop: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  glassesImage: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
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
  connectedTextGreen: {
    color: '#28a745',
    marginLeft: 4,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  connectedTextTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginTop: 10,
    backgroundColor: '#6750A414',
  },
  statusInfo: {
    alignItems: 'center',
    flex: 1,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryIcon: {
    marginRight: 5,
  },
  batteryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  statusLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.08,
    fontFamily: 'SF Pro',
  },
  connectText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'Montserrat-Bold',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  disconnectButton: {
    flexDirection: 'row',
    backgroundColor: '#E24A24',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 10,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Montserrat-Regular',
  },
});

export default ConnectedDeviceInfo;
