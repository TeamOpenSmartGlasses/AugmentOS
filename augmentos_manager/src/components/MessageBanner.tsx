import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { bluetoothService } from "../BluetoothService";
import { MOCK_CONNECTION } from "../consts";

export default function MessageBanner() {
    const [message, setMessage] = useState<string | null>(null);
    const [type, setType] = useState<string | null>(null);
    const slideAnim = new Animated.Value(-100);

  useEffect(() => {
    const handleMessageChanged = ({ message, type }: { message: string, type: string }) => {
      setMessage(message);
      setType(type);
    }

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
  }, [message]);

    useEffect(() => {
    if (message) {
            const timer = setTimeout(() => setMessage(null), 15000);
            return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

    const backgroundColor = type === 'success' ? '#48BB78' : '#F56565'; // Green for success, red otherwise

  return (
    <Animated.View
      style={[
        styles.container,
                { transform: [{ translateY: slideAnim }], backgroundColor: backgroundColor },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={() => setMessage(null)}>
        <Text style={styles.dismiss}>Dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    flexWrap: 'wrap', // Allow wrapping for long text
    justifyContent: "space-between",
    alignItems: 'flex-start', // Align text to the top
    zIndex: 1000,
  },

text: {
  flex: 1, // Take available space for text
  color: 'white',
  fontSize: 14,
  marginRight: 10, // Ensure spacing from the button
  flexWrap: 'wrap', // Allow text to wrap
},
dismissContainer: {
  alignSelf: 'flex-start', // Stick the button to the top-right
},
  dismiss: {
    color: "white",
    fontWeight: "bold",
  },
});
