import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface InternetConnectionFallbackComponentProps {
  isDarkTheme: boolean;
  retry: () => void;
}

const InternetConnectionFallbackComponent: React.FC<InternetConnectionFallbackComponentProps> = ({ isDarkTheme, retry }) => {
  const theme = {
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    selectedChipBg: isDarkTheme ? '#666666' : '#333333',
    selectedChipText: isDarkTheme ? '#FFFFFF' : '#FFFFFF',
  };

  return (
    <View style={styles.fallbackContainer}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={60}
        color={theme.textColor}
      />
      <Text style={[styles.fallbackText, { color: theme.textColor }]}>
        AugmentOS Store not yet available in 2.0.
      </Text>
      {/*<TouchableOpacity*/}
      {/*  style={[styles.retryButton, { backgroundColor: theme.selectedChipBg }]}*/}
      {/*  onPress={retry}>*/}
      {/*  <Text style={[styles.retryButtonText, { color: theme.selectedChipText }]}>*/}
      {/*    Retry*/}
      {/*  </Text>*/}
      {/*</TouchableOpacity>*/}
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    fontFamily: 'Montserrat-Regular',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
  },
});

export default InternetConnectionFallbackComponent;
