import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';

type ToggleSettingProps = {
  label: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  theme: any;
};

const ToggleSetting: React.FC<ToggleSettingProps> = ({ label, value, onValueChange, theme }) => {

  const isDarkTheme = false;
  const switchColors = {
    trackColor: {
      false: isDarkTheme ? '#666666' : '#D1D1D6',
      true: '#2196F3',
    },
    thumbColor:
      Platform.OS === 'ios' ? undefined : isDarkTheme ? '#FFFFFF' : '#FFFFFF',
    ios_backgroundColor: isDarkTheme ? '#666666' : '#D1D1D6',
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={switchColors.trackColor}
        thumbColor={switchColors.thumbColor}
        ios_backgroundColor={switchColors.ios_backgroundColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  label: {
    fontSize: 16,
  },
});

export default ToggleSetting;
