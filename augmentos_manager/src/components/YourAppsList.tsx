import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStatus } from '../AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import { BluetoothService } from '../BluetoothService';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 4;
const PAGE_WIDTH = width;
const HORIZONTAL_PADDING = 11;
const ITEM_GAP = 20;

// Temporarily disable this
const ANIMATION_DELAY = 0;//200;

// Temporarily disable this by setting to 0; previously 700
// TODO: This should only play once on boot. Let's solve this at a later date.
const ANIMATION_DURATION = 0;

interface AnimatedAppIconProps {
  app: any;
  index: number;
  fadeAnim: Animated.Value;
  translateAnim: Animated.Value;
  onAppStart: (packageName: string) => void;
  isDarkTheme: boolean;
}

const AnimatedAppIcon: React.FC<AnimatedAppIconProps> = ({
  app,
  fadeAnim,
  translateAnim,
  onAppStart,
  isDarkTheme
}) => (
  <Animated.View
    style={{
      opacity: fadeAnim,
      transform: [{
        translateX: translateAnim,
      }],
    }}
  >
    <AppIcon
      app={app}
      onClick={() => onAppStart(app.package_name)}
      isDarkTheme={isDarkTheme}
    />
  </Animated.View>
);

interface YourAppsListProps {
  isDarkTheme: boolean;
}

const YourAppsList: React.FC<YourAppsListProps> = ({ isDarkTheme }) => {
  const { status } = useStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(0);
  const bluetoothService = BluetoothService.getInstance();
  const fadeAnims = useRef(status.apps.map(() => new Animated.Value(0))).current;
  const translateAnims = useRef(status.apps.map(() => new Animated.Value(50))).current;
  const animationState = useRef({ isAnimating: false }).current;

  const totalPages = Math.ceil(status.apps.length / ITEMS_PER_PAGE);
  const pages = Array.from({ length: totalPages }, (_, pageIndex) => {
    const startIndex = pageIndex * ITEMS_PER_PAGE;
    return status.apps.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  });

  useFocusEffect(
    React.useCallback(() => {
      const animateAppsInView = (startIndex: number, endIndex: number) => {
        if (animationState.isAnimating) return;
        animationState.isAnimating = true;

        const visibleApps = status.apps.slice(startIndex, endIndex);
        visibleApps.forEach((_, index) => {
          fadeAnims[startIndex + index].setValue(0);
          translateAnims[startIndex + index].setValue(30);
        });

        Animated.stagger(ANIMATION_DELAY,
          visibleApps.map((_, index) =>
            Animated.parallel([
              Animated.timing(fadeAnims[startIndex + index], {
                toValue: 1,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
              }),
              Animated.timing(translateAnims[startIndex + index], {
                toValue: 0,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
              }),
            ])
          )
        ).start(() => {
          animationState.isAnimating = false;
        });
      };

      const startIndex = activeIndex * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, status.apps.length);
      animateAppsInView(startIndex, endIndex);

      return () => {
        animationState.isAnimating = false;
      };
    }, [activeIndex, animationState, fadeAnims, status.apps, translateAnims])
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const newActiveIndex = Math.round(scrollPosition / PAGE_WIDTH);

    if (newActiveIndex !== activeIndex) {
      setLastActiveIndex(activeIndex);
      setActiveIndex(newActiveIndex);
    }
  };

  const startApp = async (packageName: string) => {
    setIsLoading(true);
    try {
      await bluetoothService.startAppByPackageName(packageName);
    } catch (error) {
      console.error('start app error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const textColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const dotColor = isDarkTheme ? '#FFFFFF' : '#000000';

  return (
    <View style={styles.appsContainer}>
      <View style={styles.titleContainer}>
        <Text 
          style={[
            styles.sectionTitle, 
            { color: textColor },
            styles.adjustableText
          ]} 
          numberOfLines={1} 
          adjustsFontSizeToFit
        >
          Your Apps
        </Text>
      </View>
      
      <View style={styles.contentContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          snapToInterval={PAGE_WIDTH}
          decelerationRate="fast"
          onScroll={handleScroll}
          showsHorizontalScrollIndicator={false}
        >
          {pages.map((pageApps, pageIndex) => (
            <View
              key={pageIndex}
              style={[styles.page, { width: PAGE_WIDTH }]}
            >
              <View style={styles.appsList}>
                {pageApps.map((app, index) => (
                  <AnimatedAppIcon
                    key={pageIndex * ITEMS_PER_PAGE + index}
                    app={app}
                    index={pageIndex * ITEMS_PER_PAGE + index}
                    fadeAnim={fadeAnims[pageIndex * ITEMS_PER_PAGE + index]}
                    translateAnim={translateAnims[pageIndex * ITEMS_PER_PAGE + index]}
                    onAppStart={startApp}
                    isDarkTheme={isDarkTheme}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.pagination}>
          {[...Array(totalPages)].map((_, index) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
  },
  titleContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 0,
    paddingLeft: 0,
  },
  contentContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    lineHeight: 25,
    letterSpacing: 0.38,
    marginBottom: 10,
    marginTop: 10,
    marginLeft: 0,
    paddingLeft: 0,
    flexShrink: 1,
  },
  adjustableText: {
    minHeight: 30,
  },
  page: {
    flex: 1,
  },
  appsList: {
    flexDirection: 'row',
    gap: ITEM_GAP,
    justifyContent: 'flex-start',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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