import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '../components/types'; // Import NavigationProps instead of NativeStackNavigationProp

interface NavigationBarProps {
  toggleTheme: () => void;
  isDarkTheme: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ isDarkTheme }) => {
  const navigation = useNavigation<NavigationProps>(); // Use NavigationProps directly
  const iconColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const backgroundColor = isDarkTheme ? '#000000' : '#F2F2F7';

  return (
    <View style={[styles.navBarContainer, { backgroundColor }]}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.iconWrapper}>
        <Image 
          source={require('../icons/Home-Icon.png')} 
          style={[styles.icon, { tintColor: iconColor }]} 
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('GlassesMirror')} style={styles.iconWrapper}>
        <Image 
          source={require('../icons/Screen-Mirron-Icon.png')} 
          style={[styles.icon, { tintColor: iconColor }]} 
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('SettingsPage')} style={styles.iconWrapper}>
        <Image 
          source={require('../icons/Settings-Icon.png')} 
          style={[styles.icon, { tintColor: iconColor }]} 
        />
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
  },
  iconWrapper: {
    alignItems: 'center',
  },
  icon: {
    width: 30,
    height: 30,
  },
});

export default NavigationBar;
