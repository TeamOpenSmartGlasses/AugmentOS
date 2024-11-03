import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

interface RunningAppsListProps {
  isDarkTheme: boolean;
  runningApps: string[];
}

const RunningAppsList: React.FC<RunningAppsListProps> = ({ isDarkTheme, runningApps }) => {
  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const borderColor = isDarkTheme ? '#FFFFFF' : '#CCCCCC';
  const gradientColors = isDarkTheme
    ? ['#4a3cb5', '#7856FE', '#9a7dff']
    : ['#56CCFE', '#FF8DF6', '#FFD04E'];

  const limitedRunningApps = runningApps.slice(0, 3);

  const getAppImage = (appName: string) => {
    switch (appName) {
      case 'Convoscope':
        return require('../assets/app-icons/convo-rectangle.png');
      case 'ADHD Assist':
        return require('../assets/app-icons/adhd-rectangle.png');
      case 'Translator':
        return require('../assets/app-icons/translator-rectangle.png');
      case 'Placeholder':
        return require('../assets/app-icons/ARGlassees-rectangle.png');
      default:
        return null;
    }
  };

  return (
    <View style={styles.appsContainer}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Running Apps</Text>
      </View>

      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.appIconsContainer}>
          <View style={[styles.mainAppIconWrapper, { borderColor }]}>
            <ImageBackground
              source={getAppImage('Convoscope')}
              style={styles.mainAppIcon}
              imageStyle={styles.mainAppIconImage}
            >
              <LinearGradient
                colors={['#ADE7FF', '#FFB2F9', '#FFE396']}
                style={styles.overlayRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {/* Updated Star Badge to Square with Rounded Edges */}
              <View style={styles.squareBadge}>
                <FontAwesome name="star" size={12} color="#FFFFFF" />
              </View>
            </ImageBackground>
          </View>

          {limitedRunningApps.map((app, index) => (
            <View key={index} style={[styles.appIconWrapper, { borderColor }]}>
              <Image source={getAppImage(app)} style={styles.appIcon} />
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    marginBottom: 30,
    marginTop: 30,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 25,
    letterSpacing: 0.38,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradientBackground: {
    width: '100%',
    height: 132,
    paddingVertical: 6,
    paddingHorizontal: 15, // Adjusted padding to reduce right padding
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainAppIconWrapper: {
    width: 75, // Increased size
    height: 75, // Increased size
    alignItems: 'center',
    marginLeft: 17,
    marginRight: 15,
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: '#000',
    borderRadius: 15,
  },
  mainAppIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainAppIconImage: {
    borderRadius: 15,
  },
  overlayRing: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 15,
    zIndex: -1,
  },
  squareBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 6, // Rounded edges to match other icons
    backgroundColor: '#FF438B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconWrapper: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    marginHorizontal: 8,
  },
  appIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});

export default RunningAppsList;
