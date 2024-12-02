import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useStatus } from '../AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import { bluetoothService } from '../BluetoothService';

const { height } = Dimensions.get('window');

interface RunningAppsListProps {
  isDarkTheme: boolean;
}

const RunningAppsList: React.FC<RunningAppsListProps> = ({ isDarkTheme }) => {
  const { status } = useStatus();
  const [_isLoading, setIsLoading] = useState(false);

  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const borderColor = isDarkTheme ? '#FFFFFF' : '#CCCCCC';
  const gradientColors = isDarkTheme
    ? ['#4a3cb5', '#7856FE', '#9a7dff']
    : ['#56CCFE', '#FF8DF6', '#FFD04E'];

  const stopApp = async (packageName: string) => {
    setIsLoading(true);
    try {
      await bluetoothService.stopAppByPackageName(packageName);
    } catch (error) {
      console.error('Stop app error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runningApps = useMemo(() => status.apps.filter((app) => app.is_running && !app.is_foreground), [status]);
  const foregroundApps = useMemo(() => status.apps.filter((app) => app.is_foreground), [status]);

  return (
    <View style={styles.appsContainer}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Running Apps</Text>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >


        <View style={styles.appIconsContainer}>
          {/* Main/Highlighted Apps */}
          {foregroundApps.map((app, index) => (
            <View key={index}>
              <View style={[styles.mainAppIconWrapper, { borderColor }]}>
                <LinearGradient
                  colors={['#ADE7FF', '#FFB2F9', '#FFE396']}
                  style={styles.overlayRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                  <AppIcon
                    app={app}
                    key={index}
                    style={styles.mainAppIcon} // Pass style for round icons
                    onClick={() => {
                      stopApp(app.package_name);
                    }}
                  />
                <View style={styles.squareBadge}>
                  <FontAwesome name="star" size={12} color="#FFFFFF" />
                </View>
              </View>
            </View>
          ))}

          {/* Other Running Apps */}
          {runningApps.map((app, index) => (
            <AppIcon
              app={app}
              key={index}
              style={styles.otherAppIcon} // Pass style for round icons
              onClick={() => {
                stopApp(app.package_name);
              }}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    height: height * 0.2,
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 58,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 22,
    letterSpacing: 0.38,
    marginBottom: 8,
  },
  gradientBackground: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
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
    width: 65,
  },
  mainAppIconWrapper: {
    width: 65,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 0.5,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  overlayRing: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: 20,
    zIndex: 1,
  },
  mainAppIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#FF438B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  appName: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 14,
    textAlign: 'center',
  },
  otherAppIcon: {
    width: 65,
    height: 65,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 23, // Perfect circle
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default RunningAppsList;
