import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  isDarkTheme?: boolean;
  iconName?: string;
  disabled: boolean;
}

const Button: React.FC<ButtonProps> = ({ onPress, disabled, children, isDarkTheme, iconName, ...props }) => {
  return (
    <TouchableOpacity
      style={[styles.button, isDarkTheme && styles.buttonDark]}
      onPress={onPress}
      disabled={disabled}
      {...props}>
      {iconName && (
        <Icon name={iconName} size={16}           color={disabled ? '#999' : 'white'} 
        style={styles.buttonIcon} />
      )}
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    maxWidth: 300,
    height: 44,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonDark: {
    backgroundColor: '#1976D2',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonTextDisabled: {
    color: '#999',
  },
});

export default Button;
