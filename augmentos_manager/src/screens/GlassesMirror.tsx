import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import NavigationBar from '../components/NavigationBar.tsx';
import { useStatus } from '../providers/AugmentOSStatusProvider.tsx';
import { useGlassesMirror } from '../providers/GlassesMirrorContext.tsx';
import { PermissionsAndroid } from 'react-native';

interface GlassesMirrorProps {
  isDarkTheme: boolean;
}

// Function to request camera permission
const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'AugmentOS Manager needs access to your camera for full-screen mirror mode',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Camera permission request error:', err);
      return false;
    }
  } else if (Platform.OS === 'ios') {
    // iOS permissions are handled differently through Info.plist
    // The react-native-vision-camera package would handle this
    return true;
  }
  return false;
};

const GlassesMirror: React.FC<GlassesMirrorProps> = ({isDarkTheme}) => {
  const { status } = useStatus();
  const { events } = useGlassesMirror(); // From context
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  // Helper to check if we have a glasses model name
  const isGlassesConnected = !!status.glasses_info?.model_name;
  
  // Get only the last event
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  
  // Function to toggle fullscreen mode
  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      // Request camera permission if entering fullscreen
      const granted = await requestCameraPermission();
      if (granted) {
        setHasCameraPermission(true);
        setIsFullScreen(true);
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Camera permission is required for fullscreen mode.',
          [{ text: 'OK' }]
        );
      }
    } else {
      // Exit fullscreen mode
      setIsFullScreen(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isFullScreen ? styles.fullscreenContainer : (isDarkTheme ? styles.darkContainer : styles.lightContainer),
      ]}
    >
      {!isFullScreen && (
        <View
          style={[
            styles.titleContainer,
            isDarkTheme ? styles.titleContainerDark : styles.titleContainerLight,
          ]}
        >
          <Text
            style={[
              styles.title,
              isDarkTheme ? styles.titleTextDark : styles.titleTextLight,
            ]}
          >
            Glasses Mirror
          </Text>
          
          {isGlassesConnected && lastEvent && (
            <TouchableOpacity
              style={styles.fullscreenButton}
              onPress={toggleFullScreen}
            >
              <Text style={styles.fullscreenButtonText}>
                Enter Fullscreen
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Fullscreen mode - renders a simulated camera view with overlay */}
      {isFullScreen && isGlassesConnected && lastEvent ? (
        <View style={styles.fullscreenCameraContainer}>
          {/* Simulated camera background - in production this would use react-native-vision-camera */}
          <View style={styles.cameraBackground}></View>
          
          {/* Overlay the glasses display content with transparent background */}
          <View style={styles.fullscreenOverlay}>
            {lastEvent.layout && lastEvent.layout.layoutType ? (
              renderLayout(lastEvent.layout)
            ) : (
              <Text style={styles.glassesText}>
                Unknown layout data
              </Text>
            )}
          </View>
          
          {/* Fullscreen exit button */}
          <TouchableOpacity
            style={styles.exitFullscreenButton}
            onPress={toggleFullScreen}
          >
            <Text style={styles.exitFullscreenText}>Exit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Regular mode - same as before */
        <>
          {isGlassesConnected ? (
            <View style={styles.contentContainer}>
              {lastEvent ? (
                <View style={styles.glassesDisplayContainer}>
                  <View style={styles.glassesScreen}>
                    {lastEvent.layout && lastEvent.layout.layoutType ? (
                      renderLayout(lastEvent.layout)
                    ) : (
                      <Text style={styles.glassesText}>
                        Unknown layout data
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.fallbackContainer}>
                  <Text style={[isDarkTheme ? styles.darkText : styles.lightText, styles.fallbackText]}>
                    No display events available
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.fallbackContainer}>
              <Text style={[isDarkTheme ? styles.darkText : styles.lightText, styles.fallbackText]}>
                Connect glasses to use the Glasses Mirror
              </Text>
            </View>
          )}
        </>
      )}

      {!isFullScreen && (
        <NavigationBar isDarkTheme={isDarkTheme} toggleTheme={() => {}} />
      )}
    </View>
  );
};

/**
 *  Render logic for each layoutType
 */
function renderLayout(layout: any) {
  const textStyle = styles.glassesText;

  switch (layout.layoutType) {
    case 'reference_card': {
      const { title, text } = layout;
      return (
        <>
          <Text style={[styles.cardTitle, textStyle]}>{title}</Text>
          <Text style={[styles.cardContent, textStyle]}>{text}</Text>
        </>
      );
    }
    case 'text_wall':
    case 'text_line': {
      const { text } = layout;
      // Even if text is empty, show a placeholder message for text_wall layouts
      return (
        <Text style={[styles.cardContent, textStyle]}>
          {text || text === "" ? text : ""}
        </Text>
      );
    }
    case 'double_text_wall': {
      const { topText, bottomText } = layout;
      return (
        <>
          <Text style={[styles.cardContent, textStyle]}>{topText}</Text>
          <Text style={[styles.cardContent, textStyle]}>{bottomText}</Text>
        </>
      );
    }
    case 'text_rows': {
      // layout.text is presumably an array of strings
      const rows = layout.text || [];
      return rows.map((row: string, index: number) => (
        <Text key={index} style={[styles.cardContent, textStyle]}>
          {row}
        </Text>
      ));
    }
    case 'bitmap': {
      // layout.data is a base64 string. We can show an image in RN by creating a data URL
      // e.g. { uri: "data:image/png;base64,<base64string>" }
      const { data } = layout;
      const imageUri = `data:image/png;base64,${data}`;
      return (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 200, height: 200, resizeMode: 'contain', tintColor: '#00FF00' }}
        />
      );
    }
    default:
      return (
        <Text style={[styles.cardContent, textStyle]}>
          Unknown layout type: {layout.layoutType}
        </Text>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  lightContainer: {
    backgroundColor: '#f8f9fa',
  },
  fullscreenContainer: {
    flex: 1,
    padding: 0, // No padding in fullscreen mode
    backgroundColor: 'black',
  },
  titleContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainerDark: {
    backgroundColor: '#333333',
  },
  titleContainerLight: {
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'left',
    marginBottom: 5,
    flex: 1,
  },
  titleTextDark: {
    color: '#ffffff',
    fontFamily: 'Montserrat-Bold',
  },
  titleTextLight: {
    color: '#000000',
    fontFamily: 'Montserrat-Bold',
  },
  darkText: {
    color: '#ffffff',
    fontFamily: 'Montserrat-Regular',
  },
  lightText: {
    color: '#000000',
    fontFamily: 'Montserrat-Regular',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  // Glasses display styling
  glassesDisplayContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  glassesScreen: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#000000',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: '#333333',
  },
  glassesText: {
    color: '#00FF00', // Bright green color for monochrome display
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    // Add text shadow for better visibility against any background
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emptyTextWall: {
    borderWidth: 1,
    borderColor: '#00FF00',
    borderStyle: 'dashed',
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 5,
  },
  cardContent: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
  // Fallback
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // Fullscreen mode styles
  fullscreenButton: {
    backgroundColor: '#4c8bf5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  fullscreenButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
  fullscreenCameraContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cameraBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#333', // Placeholder for camera - in production this would be the camera feed
  },
  fullscreenOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 40,
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    zIndex: 10,
  },
  exitFullscreenText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default GlassesMirror;