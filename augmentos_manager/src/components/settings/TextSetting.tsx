import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

type TextSettingProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  theme: any;
};

const TextSetting: React.FC<TextSettingProps> = ({
  label,
  value,
  onChangeText,
  theme
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Whenever the parent’s value changes, update localValue
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { color: theme.textColor, borderColor: theme.textColor }
        ]}
        value={localValue}
        onChangeText={setLocalValue}
        onBlur={() => onChangeText(localValue)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%'
  },
  label: {
    fontSize: 16,
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 16
  }
});

export default TextSetting;
