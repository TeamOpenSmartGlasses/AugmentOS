import React, { useMemo, useState } from 'react';
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
                    <View key={index} style={styles.appWrapper}>
                        <View style={styles.mainAppIconWrapper}>
                            <LinearGradient
                                colors={['#ADE7FF', '#FFB2F9', '#FFE396']}
                                style={styles.gradientBorder}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.mainIconContainer}>
                                <AppIcon
                                    app={app}
                                    style={styles.mainAppIcon}
                                    onClick={() => stopApp(app.package_name)}
                                    isMainApp
                                    isDarkTheme={isDarkTheme}
                                />
                            </View>
                            <View style={styles.squareBadge}>
                                <FontAwesome name="star" size={12} color="#FFFFFF" />
                            </View>
                        </View>
                        <Text style={[styles.appName, { color: textColor }]} numberOfLines={1}>
                            {app.name}
                        </Text>
                    </View>
                ))}

                {/* Other Running Apps */}
                {runningApps.map((app, index) => (
                    <AppIcon
                        key={index}
                        app={app}
                        onClick={() => stopApp(app.package_name)}
                        style={styles.otherAppIcon}
                        isDarkTheme={isDarkTheme}
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
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 22,
    letterSpacing: 0.38,
    marginBottom: 10,
  },
  gradientBackground: {
    flex: 1,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  appWrapper: {
    alignItems: 'center',
    width: 65,
    height: 85,
  },
  mainAppIconWrapper: {
    width: 65,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientBorder: {
    width: 71,
    height: 71,
    borderRadius: 20,
    position: 'absolute',
    top: -3,
    left: -3,
    zIndex: 1,
  },
  mainIconContainer: {
    width: 65,
    height: 65,
    position: 'absolute',
    zIndex: 2,
},
mainAppIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
},
  appName: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 16,
    textAlign: 'center',
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
  otherAppIcon: {
    width: 65,
    height: 65,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 23,
    overflow: 'hidden',
},
});

export default RunningAppsList;
