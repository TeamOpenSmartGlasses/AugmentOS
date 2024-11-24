import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';

interface PuckConnectionProps {
  isDarkTheme: boolean;
}

const PuckConnection: React.FC<PuckConnectionProps> = ({ isDarkTheme }) => {
  const { status } = useStatus();
  const isConnected = status.puck_connected;
  const batteryLevel = status.puck_battery_life ?? null; // Handle null battery level
  const isCharging = status.puck_charging_status;

  useEffect(() => {
    console.log('AugmentOS Status Updated:', JSON.stringify(status, null, 2));

    if (!isConnected) {
      Alert.alert('Puck Disconnected', 'The puck has been disconnected.');
    }
  }, [isConnected, status]);

  const getBatteryIcon = (level: number | null) => {
    if (level === null) {
      return 'question-circle';
    }
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


  const getBatteryColor = (level: number | null) => {
    if (level === null) {
      return '#9E9E9E'; // Gray for unavailable
    }
    if (level > 50) {
      return '#4CAF50'; // Green
    }
    if (level > 10) {
      return '#FFC107'; // Yellow
    }
    return '#FF5722'; // Red
  };
  const currentStyles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <LinearGradient
      colors={isConnected ? ['#4CAF50', '#81C784'] : ['#FF8A80', '#FF5252']}
      style={currentStyles.outerContainer}
    >
      <View style={currentStyles.innerContainer}>
        <View style={currentStyles.row}>
          <View style={currentStyles.item}>
            <Icon
              name={isCharging ? 'bolt' : 'plug'}
              size={16}
              color={isCharging ? '#FFC107' : '#9E9E9E'}
              style={currentStyles.icon}
            />
            <Text style={currentStyles.text}>{isCharging ? 'Charging' : 'Not Charging'}</Text>
          </View>
          <View style={currentStyles.item}>
            <Icon
              name={isConnected ? 'check-circle' : 'exclamation-circle'}
              size={16}
              color={isConnected ? '#4CAF50' : '#FF5722'}
              style={currentStyles.icon}
            />
            <Text style={currentStyles.text}>
              {isConnected ? 'Puck Connected' : 'Puck Disconnected'}
            </Text>
          </View>
          {isConnected && (
            <View style={currentStyles.item}>
              <Icon
                name={getBatteryIcon(batteryLevel)}
                size={16}
                color={getBatteryColor(batteryLevel)}
                style={currentStyles.icon}
              />
              <Text style={{ ...currentStyles.text, color: getBatteryColor(batteryLevel) }}>
                {batteryLevel !== null ? `${batteryLevel}%` : 'Battery N/A'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

// Light theme styles
const lightThemeStyles = StyleSheet.create({
  outerContainer: {
    borderRadius: 12,
    padding: 6,
    margin: 5,
  },
  innerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat-Regular',
    color: '#000',
  },
});

// Dark theme styles
const darkThemeStyles = StyleSheet.create({
  ...lightThemeStyles,
  innerContainer: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat-Regular',
    color: '#fff',
  },
});

export default PuckConnection;
