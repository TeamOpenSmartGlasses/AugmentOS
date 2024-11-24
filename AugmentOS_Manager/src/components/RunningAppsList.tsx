import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
// import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import { bluetoothService } from '../BluetoothService';

interface RunningAppsListProps {
  isDarkTheme: boolean;
}

const RunningAppsList: React.FC<RunningAppsListProps> = ({ isDarkTheme }) => {
  const { status } = useStatus(); // Access status data and refreshStatus function
  const [_isLoading, setIsLoading] = useState(false);
  const runningApps = useMemo(() => status.apps.filter((app) => app.is_running), [status]);

  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  // const borderColor = isDarkTheme ? '#FFFFFF' : '#CCCCCC';
  const gradientColors = isDarkTheme
    ? ['#4a3cb5', '#7856FE', '#9a7dff']
    : ['#56CCFE', '#FF8DF6', '#FFD04E'];

  // Get the limited running apps (first three) from the list
  const limitedRunningApps = useMemo(() => runningApps.slice(0, 3), [runningApps]);

  const stopApp = async (packageName: string) => {
    setIsLoading(true);
    try {
      await bluetoothService.stopAppByPackageName(packageName);
    } catch (error) {
      console.error('Stop app error:', error);
    }
    finally {
      setIsLoading(false);
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
          {/* First App is a highlighted app (Simulating Convoscope for now) */}
          {/* {runningApps.length > 0 && (
            <View style={styles.appWrapper}>
              <View style={[styles.mainAppIconWrapper, { borderColor }]}>
                <ImageBackground
                  source={getAppImage(runningApps[0].name)}
                  style={styles.mainAppIcon}
                  imageStyle={styles.mainAppIconImage}
                >
                  <LinearGradient
                    colors={['#ADE7FF', '#FFB2F9', '#FFE396']}
                    style={styles.overlayRing}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.squareBadge}>
                    <FontAwesome name="star" size={12} color="#FFFFFF" />
                  </View>
                </ImageBackground>
              </View>
              <Text style={[styles.appName, { color: textColor }]} numberOfLines={1}>
                {runningApps[0].name}
              </Text>
            </View>
          )} */}

          {/* Display limited running apps */}
          {limitedRunningApps.map((app, index) => (
            <AppIcon app={app}
            key={index}
            onClick={() => {
              stopApp(app.package_name);
            }} />
            // <View key={index} style={styles.appWrapper}>
            //   <View style={[styles.appIconWrapper, { borderColor }]}>
            //     <Image source={getAppImage(app.name)} style={styles.appIcon} />
            //   </View>
            //   <Text style={[styles.appName, { color: textColor }]} numberOfLines={1}>
            //     {app.name}
            //   </Text>
            // </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    marginBottom: 30,
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
    height: 150,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  appWrapper: {
    alignItems: 'center',
    width: 75,
    marginLeft: 10,
  },
  mainAppIconWrapper: {
    width: 75,
    height: 75,
    alignItems: 'center',
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
    marginTop: 10,
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
    borderRadius: 6,
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
    marginTop: 10,
  },
  appIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  appName: {
    marginTop: 15,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default RunningAppsList;
