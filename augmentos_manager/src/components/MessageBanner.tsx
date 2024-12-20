import React, {useEffect, useState, useMemo} from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import {BluetoothService} from '../BluetoothService';
import {MOCK_CONNECTION} from '../consts';

export default function MessageBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  // Use useMemo to initialize slideAnim only once
  const slideAnim = useMemo(() => new Animated.Value(-100), []);

  useEffect(() => {
    const handleMessageChanged = ({
      message: incomingMessage,
      type: incomingType,
    }: {
      message: string;
      type: string;
    }) => {
      setMessage(incomingMessage);
      setType(incomingType);
    };

    const bluetoothService = BluetoothService.getInstance();

    if (!MOCK_CONNECTION) {
      bluetoothService.on('SHOW_BANNER', handleMessageChanged);
    }

    return () => {
      if (!MOCK_CONNECTION) {
        bluetoothService.removeListener('SHOW_BANNER', handleMessageChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (message) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [message, slideAnim]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) {return null;}

  const backgroundColor = type === 'success' ? '#48BB78' : '#F56565'; // Green for success, red otherwise

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
          backgroundColor: backgroundColor,
        },
      ]}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={() => setMessage(null)}>
        <Text style={styles.dismiss}>Dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1000,
  },
  text: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    marginRight: 10,
    flexWrap: 'wrap',
    fontFamily: 'Montserrat-Regular',
  },
  dismiss: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});

