import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen: React.FC = () => {
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const navigation = useNavigation();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    // Handle registration logic here
    Alert.alert('Success', 'You have successfully registered!', [
      {
        text: 'OK',
        onPress: () => navigation.navigate('Home' as never)      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://cdn.wallpapersafari.com/96/40/MwOixn.jpg' }} // Example background image URL
        style={styles.backgroundImage}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Register</Text>
          <View style={styles.inputContainer}>
            <Icon name="user" size={20} color="#fff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#fff"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="envelope" size={20} color="#fff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#fff"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#fff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#fff"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#fff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#fff"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <View style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Register</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginRedirect} onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.registerRedirectText}>
            Already have an account? <Text style={styles.loginRedirectText}>Login here</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
;const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark transparent background for inputs
    paddingHorizontal: 10,
    width: '90%',
  },
  icon: {
    marginRight: 10,
    color: '#aaa',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'black',
    width: '90%',
  },
  buttonGradient: {
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginRedirect: {
    marginTop: 20,
  },
  loginRedirectText: {
    color: '#00bcd4',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  registerRedirectText: {
    marginTop: 20,
    color: '#ccc',
    textAlign: 'center',
  },
});

export default RegisterScreen;
