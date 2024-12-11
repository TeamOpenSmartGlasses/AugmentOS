import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';

interface IntroScreenProps {
  navigation: any; // Add typing for navigation if needed
}

const IntroScreen: React.FC<IntroScreenProps> = ({ navigation }) => {
  const opacity = useRef(new Animated.Value(0)).current; // Initial opacity for fade-in
  const translateY = useRef(new Animated.Value(20)).current; // Initial position for upward movement

  useEffect(() => {
    // Animation for fade-in and upward movement
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const handleLoginPress = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/AOS.png')}
        style={[styles.image, { opacity, transform: [{ translateY }] }]}
      />
      <Animated.Text style={[styles.title, { opacity, transform: [{ translateY }] }]}>
        Welcome to AugmentOS
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity, transform: [{ translateY }] }]}>
        The future of smart glasses starts here
      </Animated.Text>
      <TouchableOpacity style={styles.button} onPress={handleLoginPress}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 20,
    color: '#000',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Montserrat-Regular',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
  },
});

export default IntroScreen;
