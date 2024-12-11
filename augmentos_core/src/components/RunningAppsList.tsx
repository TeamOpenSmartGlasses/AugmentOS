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
    console.log("STOP APP");
    setIsLoading(true);
    try {
      await bluetoothService.stopAppByPackageName(packageName);
    } catch (error) {
      console.error('Stop app error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runningApps = useMemo(() => status.apps.filter((app) => app.is_running), [status]);

  return (
    <View style={styles.appsContainer}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Running Apps</Text>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {runningApps.length > 0 ? (
          <View style={styles.appIconsContainer}>
            {runningApps.map((app, index) => (
              <View key={index}>
                <AppIcon
                  app={app}
                  onClick={() => stopApp(app.package_name)}
                  isForegroundApp={app.is_foreground}
                  isDarkTheme={isDarkTheme}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', height: '100%' }}>
            <Text style={{ color: textColor, textAlign: 'center' }}>
              No running apps available
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
    paddingTop:20,
    paddingBottom:20
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
  },

  squareBadge: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#FF438B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});

export default RunningAppsList;
