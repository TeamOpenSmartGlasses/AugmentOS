import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

type Theme = {
  backgroundColor: string;
  textColor: string;
};

type SliderSettingProps = {
  label: string;
  value: number | undefined; // Allow undefined if value might not always be set
  min: number;
  max: number;
  onValueChange: (value: number) => void; // For immediate feedback, e.g., UI updates
  onValueSet: (value: number) => void; // For BLE requests or final actions
  theme: Theme;
};

const SliderSetting: React.FC<SliderSettingProps> = ({
  label,
  value = 0, // Default value if not provided
  min,
  max,
  onValueChange,
  onValueSet,
  theme,
}) => {

  const handleValueChange = (val: number) => {
    const roundedValue = Math.round(val);
    onValueChange(roundedValue); // Emit only integer values
  };

  const handleValueSet = (val: number) => {
    const roundedValue = Math.round(val);
    onValueSet(roundedValue); // Emit only integer values
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.label, { color: theme.textColor }]}>
        {label}: {value !== undefined ? Math.round(value) : 'N/A'}
      </Text>
      <Slider
        style={styles.slider}
        value={value || 0} // Fallback to 0 if undefined
        onValueChange={handleValueChange} // Wrap the callback to round values
        onSlidingComplete={handleValueSet} // Wrap the callback to round values
        minimumValue={min}
        maximumValue={max}
        minimumTrackTintColor="#1EB1FC"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#1EB1FC"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 10,
    width: '100%',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default SliderSetting;
