import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import IconFA5 from 'react-native-vector-icons/FontAwesome5';
import { useStatus } from '../providers/AugmentOSStatusProvider';

interface PuckConnectionProps {
  isDarkTheme: boolean;
}

const PuckConnection: React.FC<PuckConnectionProps> = ({ isDarkTheme }) => {
  const { status } = useStatus();

  useEffect(() => {
    console.log('AugmentOS Status Updated:', JSON.stringify(status, null, 2));
  }, [status]);

  const getBatteryIcon = (level: number | null) => {
    if (level === null) {return 'question-circle';}
    if (level > 75) {return 'battery-full';}
    if (level > 50) {return 'battery-three-quarters';}
    if (level > 25) {return 'battery-half';}
    if (level > 10) {return 'battery-quarter';}
    return 'battery-empty';
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) {return '#9E9E9E';}
    if (level > 50) {return '#4CAF50';}
    if (level > 10) {return '#FFC107';}
    return '#FF5722';
  };

  const currentStyles = isDarkTheme ? darkThemeStyles : lightThemeStyles;

  return (
    <LinearGradient
      colors={status.core_info.puck_connected ? ['#4CAF50', '#81C784'] : ['#FF8A80', '#FF5252']}
      style={currentStyles.outerContainer}
    >
      <View style={currentStyles.innerContainer}>
        <View style={currentStyles.row}>
          <View style={currentStyles.leftContainer}>
            <View style={currentStyles.leftItem}>
              <Icon
                name={status.core_info.puck_connected ? 'check-circle' : 'exclamation-circle'}
                size={16}
                color={status.core_info.puck_connected ? '#4CAF50' : '#FF5722'}
                style={currentStyles.icon}
              />
              <Text style={currentStyles.text}>
                {status.core_info.puck_connected ? 'Puck Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
          {status.core_info.puck_connected && (
            <View style={currentStyles.rightContainer}>
              <View style={currentStyles.rightItem}>
                <View style={currentStyles.batteryContainer}>
                  <Icon
                    name={getBatteryIcon(status.core_info.puck_battery_life)}
                    size={16}
                    color={getBatteryColor(status.core_info.puck_battery_life)}
                  />
                  {status.core_info.puck_charging_status && (
                    <IconFA5
                      name="bolt"
                      size={8}
                      color="#fff"
                      style={currentStyles.chargingIcon}
                    />
                  )}
                </View>
                <Text style={[currentStyles.text, { color: getBatteryColor(status.core_info.puck_battery_life) }]}>
                  {status.core_info.puck_battery_life !== null ? `${status.core_info.puck_battery_life}%` : 'N/A'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};
const lightThemeStyles = StyleSheet.create({
  outerContainer: {
    borderRadius: 6,
    padding: 2,
  },
  innerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Changed from space-between
    alignItems: 'center',
    width: '100%', // Added to ensure full width
  },
  leftContainer: {
    alignItems: 'center', // Changed from flex-start
  },
  rightContainer: {
    alignItems: 'center', // Changed from flex-end
  },
  leftItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    position: 'relative',
  },
  chargingIcon: {
    position: 'absolute',
    left: 7,
    top: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat-Regular',
    color: '#000',
  },
});

const darkThemeStyles = StyleSheet.create({
  ...lightThemeStyles,
  innerContainer: {
    ...lightThemeStyles.innerContainer,
    backgroundColor: '#121212',
    shadowColor: '#fff',
  },
  text: {
    ...lightThemeStyles.text,
    color: '#fff',
  },
});

export default PuckConnection;
