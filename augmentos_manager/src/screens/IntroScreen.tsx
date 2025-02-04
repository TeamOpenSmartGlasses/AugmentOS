import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import GoogleIcon from '../icons/GoogleIcon';
import AppleIcon from '../icons/AppleIcon';

interface IntroScreenProps {
  navigation: any;
}

const IntroScreen: React.FC<IntroScreenProps> = ({navigation}) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const formScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (isSigningUp) {
      Animated.spring(formScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      formScale.setValue(0);
    }
  }, [formScale, isSigningUp]);

  const handleGoogleSignIn = async () => {
    try {
      // Implement Google sign in logic
      console.log('Google sign in');
      // After successful sign in
      navigation.replace('Home');
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      // Implement Apple sign in logic
      console.log('Apple sign in');
      // After successful sign in
      navigation.replace('Home');
    } catch (error) {
      console.error('Apple sign in failed:', error);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      // Implement email sign up logic
      console.log('Email sign up:', {email, password});
      // After successful sign up and sign in
      navigation.replace('Home');
    } catch (error) {
      console.error('Email sign up failed:', error);
    }
  };

  return (
    <LinearGradient colors={['#EFF6FF', '#FFFFFF']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Animated.Text
            style={[styles.title, {opacity, transform: [{translateY}]}]}>
            AugmentOS
          </Animated.Text>
          <Animated.Text
            style={[styles.subtitle, {opacity, transform: [{translateY}]}]}>
            The future of smart glasses starts here.
          </Animated.Text>
          <Animated.View
            style={[styles.header, {opacity, transform: [{translateY}]}]}>
            <Animated.Image
              source={require('../assets/AOS.png')}
              style={[styles.image, {opacity, transform: [{translateY}]}]}
            />
          </Animated.View>

          <Animated.View
            style={[styles.content, {opacity, transform: [{translateY}]}]}>
            {isSigningUp ? (
              <Animated.View
                style={[styles.form, {transform: [{scale: formScale}]}]}>


                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.enhancedInputContainer}>
                    <Icon
                      name="envelope"
                      size={16}
                      color="#6B7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.enhancedInput}
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.enhancedInputContainer}>
                    <Icon
                      name="lock"
                      size={16}
                      color="#6B7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.enhancedInput}
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.enhancedPrimaryButton}
                  onPress={handleEmailSignUp}>
                  <LinearGradient
                    colors={['#2196F3', '#1E88E5']}
                    style={styles.buttonGradient}>
                    <Text style={styles.enhancedPrimaryButtonText}>
                      Create Account
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.enhancedGhostButton}
                  onPress={() => setIsSigningUp(false)}>
                  <Icon
                    name="arrow-left"
                    size={16}
                    color="#6B7280"
                    style={styles.backIcon}
                  />
                  <Text style={styles.enhancedGhostButtonText}>
                    Back to Sign In Options
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.signInOptions}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleSignIn}>
                  <View style={styles.socialIconContainer}>
                    <GoogleIcon />
                  </View>
                  <Text style={styles.socialButtonText}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  onPress={handleAppleSignIn}>
                  <View style={styles.socialIconContainer}>
                    <AppleIcon />
                  </View>
                  <Text
                    style={[styles.socialButtonText, styles.appleButtonText]}>
                    Continue with Apple
                  </Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>Or</Text>
                  <View style={styles.divider} />
                </View>

                <TouchableOpacity
                  style={styles.enhancedEmailButton}
                  onPress={() => setIsSigningUp(true)}>
                  <LinearGradient
                    colors={['#2196F3', '#1E88E5']}
                    style={styles.buttonGradient}>
                    <Icon
                      name="envelope"
                      size={16}
                      color="white"
                      style={styles.emailIcon}
                    />
                    <Text style={styles.enhancedEmailButtonText}>
                      Sign up with Email
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          <Animated.Text style={[styles.termsText, {opacity}]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Animated.Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: width * 0.4,
    height: width * 0.4,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 46,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Montserrat-Regular',
  },
  content: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Montserrat-Bold',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Montserrat-Regular',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Montserrat-Medium',
  },
  form: {
    width: '100%',
  },
  enhancedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  enhancedInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: '#111827',
  },
  signInOptions: {
    gap: 8,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  googleButton: {
    backgroundColor: 'white',
  },
  appleButton: {
    backgroundColor: 'black',
    borderColor: 'black',
  },
  socialIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 15,
    color: '#000',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
  },
  appleButtonText: {
    color: 'white',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 14,
  },
  enhancedPrimaryButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  enhancedEmailButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  enhancedPrimaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  enhancedEmailButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  enhancedGhostButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  backIcon: {
    marginRight: 8,
  },
  emailIcon: {
    marginRight: 8,
  },
  enhancedGhostButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontFamily: 'Montserrat-Medium',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#6B7280',
    fontSize: 12,
    textTransform: 'uppercase',
    fontFamily: 'Montserrat-Regular',
  },
  termsText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
    marginTop: 8,
  },
});

export default IntroScreen;
