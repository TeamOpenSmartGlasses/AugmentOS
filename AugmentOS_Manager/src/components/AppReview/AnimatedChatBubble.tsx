import React, { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

const AnimatedChatBubble: React.FC = () => {
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bubbleOpacity]);

  return (
    <Animated.View style={[styles.chatBubble, { opacity: bubbleOpacity }]}>
      <Text style={styles.chatBubbleText}>Leave a Review!</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chatBubble: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#007BFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
  },
  chatBubbleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AnimatedChatBubble;
