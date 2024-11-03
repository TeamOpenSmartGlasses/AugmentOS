import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface PuckConnectionProps {
  isConnected: boolean;
  batteryLevel: number; // Battery level as a percentage
}

const PuckConnection: React.FC<PuckConnectionProps> = ({ isConnected, batteryLevel }) => {
  const getBatteryIcon = (level: number) => {
    if (level > 75) return 'battery-full';
    if (level > 50) return 'battery-three-quarters';
    if (level > 25) return 'battery-half';
    if (level > 10) return 'battery-quarter';
    return 'battery-empty';
  };

  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <View style={styles.statusContainer}>
        <Icon
          name={isConnected ? 'check-circle' : 'exclamation-circle'}
          size={16}
          color={isConnected ? '#4CAF50' : '#FF5722'}
          style={styles.icon}
        />
        <Text style={[styles.statusText, isConnected ? styles.connectedText : styles.disconnectedText]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
      <View style={styles.batteryContainer}>
        <Text style={styles.label}>Puck Battery</Text>
        <Icon
          name={getBatteryIcon(batteryLevel)}
          size={16}
          color={batteryLevel > 10 ? '#4CAF50' : '#FF5722'}
          style={styles.batteryIcon}
        />
        <Text style={styles.batteryText}>{batteryLevel}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0', // Neutral background for the component
    justifyContent: 'space-between',
  },
  connected: {
    backgroundColor: '#E0F7FA', // Light theme background when connected
  },
  disconnected: {
    backgroundColor: '#FFE5E5', // Subtle background for disconnected
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
  },
  connectedText: {
    color: '#4CAF50',
  },
  disconnectedText: {
    color: '#FF5722',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#666666',
    marginRight: 6,
    fontFamily: 'Montserrat-Regular',
  },
  batteryIcon: {
    marginRight: 4,
  },
  batteryText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
    color: '#333333',
  },
});

export default PuckConnection;
