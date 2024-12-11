import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigationProps } from '../components/types';

interface NavigationBarProps {
  toggleTheme: () => void;
  isDarkTheme: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ isDarkTheme }) => {
  const navigation = useNavigation<NavigationProps>();
  const iconColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const backgroundColor = isDarkTheme ? '#000000' : '#F2F2F7';

  const iconSize = 30; // Set a uniform icon size

  return (
    <View style={[styles.navBarContainer, { backgroundColor }]}>
      {/* Home Icon */}
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.iconWrapper}>
        <MaterialCommunityIcons name="home-outline" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {/* Glasses Mirror Icon */}
      <TouchableOpacity onPress={() => navigation.navigate('GlassesMirror')} style={styles.iconWrapper}>
        <MaterialCommunityIcons name="monitor" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {/* App Store Icon (Apps) */}
      <TouchableOpacity onPress={() => navigation.navigate('AppStore')} style={styles.iconWrapper}>
        <MaterialCommunityIcons name="apps" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {/* Settings Icon */}
      <TouchableOpacity onPress={() => navigation.navigate('SettingsPage')} style={styles.iconWrapper}>
        <MaterialCommunityIcons name="cog-outline" size={iconSize} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50, // Set a fixed width for alignment
    height: 50, // Set a fixed height for alignment
  },
});

export default NavigationBar;
