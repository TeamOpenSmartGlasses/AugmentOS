import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';

const PuckConnection: React.FC = () => {
  const { status } = useStatus();
  const isConnected = status.puck_connected;
  const batteryLevel = status.puck_battery_life ?? 0; // Default to 0 if battery level is null

  useEffect(()=>{
    console.log("STATUS UPDATED WOOT WOOT");
    console.log(JSON.stringify(status))
    console.log("\n")
  }, [
    status
  ])

  // Function to determine the battery icon based on battery level
  const getBatteryIcon = (level: number) => {
    if (level > 75) {
      return 'battery-full';
    }
    if (level > 50) {
      return 'battery-three-quarters';
    }
    if (level > 25) {
      return 'battery-half';
    }
    if (level > 10) {
      return 'battery-quarter';
    }
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
          {isConnected ? 'Connected' : 'Puck Disconnected'}
        </Text>
        <Text>
          {JSON.stringify(status)}
        </Text>
      </View>
      {isConnected && (
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
      )}
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
    backgroundColor: '#E0E0E0',
    justifyContent: 'space-between',
  },
  connected: {
    backgroundColor: '#E0F7FA',
  },
  disconnected: {
    backgroundColor: '#FFE5E5',
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
