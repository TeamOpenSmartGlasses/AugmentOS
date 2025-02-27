import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useStatus} from '../providers/AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import {BluetoothService} from '../BluetoothService';

interface RunningAppsListProps {
  isDarkTheme: boolean;
}

const RunningAppsList: React.FC<RunningAppsListProps> = ({isDarkTheme}) => {
  const {status} = useStatus();
  const [_isLoading, setIsLoading] = useState(false);
  const bluetoothService = BluetoothService.getInstance();
  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const gradientColors = isDarkTheme
    ? ['#4a3cb5', '#7856FE', '#9a7dff']
    : ['#56CCFE', '#FF8DF6', '#FFD04E'];

  const stopApp = async (packageName: string) => {
    console.log('STOP APP');
    setIsLoading(true);
    try {
      await bluetoothService.stopAppByPackageName(packageName);
    } catch (error) {
      console.error('Stop app error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runningApps = useMemo(
    () => status.apps.filter(app => app.is_running),
    [status],
  );

  return (
    <View style={styles.appsContainer}>
      <Text style={[styles.sectionTitle, {color: textColor}]}>
        Running Apps
      </Text>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        {runningApps.length > 0 ? (
          <View style={styles.appIconsContainer}>
            {runningApps.map((app, index) => (
              <View key={index} style={styles.iconWrapper}>
                <AppIcon
                  app={app}
                  onClick={() => stopApp(app.packageName)}
                  isForegroundApp={app.is_foreground}
                  isDarkTheme={isDarkTheme}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noAppsContainer}>
            <Text style={[styles.noAppsText, {color: textColor}]}>
              No apps, start apps below.
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    justifyContent: 'flex-start',
    marginTop: 10,
    marginBottom: 10,
    height: 160,
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
    height: 120,
    paddingHorizontal: 15,
    borderRadius: 20,
    paddingVertical: 15,
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
  },
  iconWrapper: {
    alignItems: 'center',
  },
  noAppsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAppsText: {
    textAlign: 'center',
  },
});

export default RunningAppsList;
