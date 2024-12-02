import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';
import { useStatus } from '../AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import { bluetoothService } from '../BluetoothService';

const { width } = Dimensions.get('window');

interface YourAppsListProps {
  isDarkTheme: boolean;
}

const YourAppsList: React.FC<YourAppsListProps> = ({ isDarkTheme }) => {
  const { status } = useStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const activePageIndex = Math.round(scrollPosition / width);
    setActiveIndex(activePageIndex);
  };

  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const dotColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const appLabelColor = isDarkTheme ? '#C0C0C0' : 'black';

  const startApp = async (packageName: string) => {
    setIsLoading(true);
    try {
      await bluetoothService.startAppByPackageName(packageName);
    } catch (error) {
      console.error('start app error:', error);
    }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.appsContainer}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Your Apps
        </Text>
      </View>

      <ScrollView
        horizontal
        snapToInterval={width}
        decelerationRate="fast"
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {status.apps.map((app, index) => (
          <AppIcon
            app={app}
            key={index}
            onClick={() => { startApp(app.package_name); }}
          />
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {[...Array(Math.ceil(status.apps.length / 4)).keys()].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === 0 && styles.elongatedDot,
              activeIndex === index && styles.activeDot,
              { backgroundColor: dotColor },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    marginTop: 20,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 25,
    letterSpacing: 0.38,
    marginBottom: 10,
    marginTop: 35 },
  scrollViewContent: {
    alignItems: 'center',
  },


  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  elongatedDot: {
    width: 18,
    borderRadius: 10,
  },
  activeDot: {
    opacity: 1,
  },
});

export default YourAppsList;
