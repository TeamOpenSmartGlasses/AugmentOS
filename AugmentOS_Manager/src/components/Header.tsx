import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface HeaderProps {
  isDarkTheme: boolean;
  navigation: any; // Add the navigation prop
}

const Header: React.FC<HeaderProps> = ({ isDarkTheme, navigation }) => {
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Set to true to ensure "Sign Out" button is visible initially

  // const toggleDropdown = () => {
  //   setDropdownVisible(!isDropdownVisible);
  // };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setDropdownVisible(false);
    if (navigation) {
      navigation.navigate('Intro'); // Navigate to the Intro screen after logging out
    } else {
      console.error('Navigation prop is undefined');
    }
  };

  const handleProfileSettings = () => {
    if (navigation) {
      navigation.navigate('ProfileSettings');
    } else {
      console.error('Navigation prop is undefined');
    }
  };


  const textColor = isDarkTheme ? '#FFFFFF' : '#000000'; // Adjust text color based on theme
  const dropdownBackgroundColor = isDarkTheme ? '#333333' : '#FFFFFF'; // Background color for dropdown
  const shadowColor = isDarkTheme ? '#FFFFFF' : '#000000'; // Shadow color for better visibility in dark mode

  return (
    <View style={styles.headerContainer}>
      <Text style={[styles.title, { color: textColor }]}>AugmentOS</Text>
      {/* Commented out the profile image temporarily */}
      {/* <TouchableOpacity onPress={toggleDropdown}>
        <Image
          source={require('../assets/profile-pic.jpg')}
          style={styles.profileImage}
        />
      </TouchableOpacity> */}
      {isDropdownVisible && (
        <View style={[styles.dropdown, { backgroundColor: dropdownBackgroundColor, shadowColor }]}>
          <TouchableOpacity style={styles.dropdownItem} onPress={handleProfileSettings}>
            <Text style={{ color: textColor }}>Profile Settings</Text>
          </TouchableOpacity>

          {isLoggedIn && (
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Text style={{ color: textColor }}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold', // Set Montserrat for the title
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  dropdown: {
    position: 'absolute',
    top: 70,
    right: 20,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    padding: 10,
    zIndex: 2,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular', // Set Montserrat for dropdown items
  },
});


export default Header;
