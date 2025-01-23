import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import NavigationBar from '../components/NavigationBar';
import { supabase } from '../supabaseClient';
interface ProfileSettingsPageProps {
  isDarkTheme: boolean;
}

const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ isDarkTheme }) => {
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setTimeout(() => {
      alert('Profile updated successfully');
      setLoading(false);
    }, 1000);
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const { uri } = result.assets[0];
      if (uri) {
        setProfilePicture(uri);
      }
    }
  };

  // Conditionally applied theme styles
  const containerStyle = isDarkTheme ? styles.darkContainer : styles.lightContainer;
  const textStyle = isDarkTheme ? styles.darkText : styles.lightText;
  const profilePlaceholderStyle = isDarkTheme ? styles.darkProfilePlaceholder : styles.lightProfilePlaceholder;
  const inputStyle = isDarkTheme ? styles.darkInput : styles.lightInput;

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      // Handle sign-out error
    } else {
      console.log('Sign-out successful');
    }
  }
  

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.title, textStyle]}>Profile Settings</Text>

      <TouchableOpacity onPress={pickImage}>
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, profilePlaceholderStyle]}>
            <Text style={[styles.profilePlaceholderText, textStyle]}>Pick a Profile Picture</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={[styles.input, inputStyle]}
        placeholder="Display Name"
        placeholderTextColor={isDarkTheme ? '#AAAAAA' : '#666666'}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TextInput
        style={[styles.input, inputStyle]}
        placeholder="Email"
        placeholderTextColor={isDarkTheme ? '#AAAAAA' : '#666666'}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <Button title="Update Profile" onPress={handleUpdateProfile} disabled={loading} />
      {loading && <ActivityIndicator size="large" color={isDarkTheme ? '#ffffff' : '#0000ff'} />}

      <View style={styles.navigationBarContainer}>
        <NavigationBar
          toggleTheme={() => {}}
          isDarkTheme={isDarkTheme}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  lightContainer: {
    backgroundColor: '#ffffff',
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  lightText: {
    color: '#000000',
  },
  darkText: {
    color: '#ffffff',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  lightProfilePlaceholder: {
    backgroundColor: '#cccccc',
  },
  darkProfilePlaceholder: {
    backgroundColor: '#444444',
  },
  profilePlaceholderText: {
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  lightInput: {
    borderColor: '#cccccc',
  },
  darkInput: {
    borderColor: '#777777',
  },
  navigationBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default ProfileSettingsPage;
function alert(_arg0: string) {
    throw new Error('Function not implemented.');
}

