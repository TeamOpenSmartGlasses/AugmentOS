import React, { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

interface AnimatedChatBubbleProps {
  isDarkTheme: boolean;
}

const AnimatedChatBubble: React.FC<AnimatedChatBubbleProps> = ({ isDarkTheme }) => {
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
    <Animated.View 
      style={[
        styles.chatBubble, 
        isDarkTheme ? styles.chatBubbleDark : styles.chatBubbleLight,
        { opacity: bubbleOpacity }
      ]}
    >
      <Text style={styles.chatBubbleText}>Leave a Review!</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chatBubble: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chatBubbleLight: {
    backgroundColor: '#007BFF',
  },
  chatBubbleDark: {
    backgroundColor: '#3b82f6',
  },
  chatBubbleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});

export default AnimatedChatBubble;