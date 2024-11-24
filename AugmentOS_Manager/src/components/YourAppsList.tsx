import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions, TouchableOpacity } from 'react-native';
import { useStatus } from '../AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import { bluetoothService } from '../BluetoothService';

const { width } = Dimensions.get('window');

interface YourAppsListProps {
  isDarkTheme: boolean;
}

const YourAppsList: React.FC<YourAppsListProps> = ({ isDarkTheme }) => {
  const { status } = useStatus(); // Access the status from AugmentOSStatusProvider
  const installedApps = status.apps; // Get the list of apps from the status
  const [isLoading, setIsLoading] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const activePageIndex = Math.round(scrollPosition / width); // Use width to snap by page of 4 icons
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
        snapToInterval={width} // Snap to the full screen width to show exactly 4 icons per page
        decelerationRate="fast"
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {installedApps.map((app, index) => (
          // <TouchableOpacity key={index} style={styles.appIconWrapper}>
          //   <Image source={{ uri: app.icon }} style={styles.appIcon} />
          //   <Text style={[styles.appLabel, { color: appLabelColor }]} numberOfLines={1}>
          //     {app.name}
          //   </Text>
          // </TouchableOpacity>
          <AppIcon
          app={app} onClick={()=>{startApp(app.package_name)}}>

          </AppIcon>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {[...Array(Math.ceil(installedApps.length / 4)).keys()].map((index) => (
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
    marginBottom: 70,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 25,
    letterSpacing: 0.38,
    marginBottom: 10,
  },
  scrollViewContent: {
    alignItems: 'center',
  },
  appIconWrapper: {
    width: width / 4 - 10, // Adjust to ensure 4 icons fit the screen width
    alignItems: 'center',
    marginHorizontal: 0,
  },
  appIcon: {
    width: 78,
    height: 78,
    borderRadius: 16,
  },
  appLabel: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
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
