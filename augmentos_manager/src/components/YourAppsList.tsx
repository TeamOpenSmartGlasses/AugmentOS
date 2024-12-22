import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Animated,
} from 'react-native';
import {useStatus} from '../AugmentOSStatusProvider';
import AppIcon from './AppIcon';
import {BluetoothService} from '../BluetoothService';

const {width} = Dimensions.get('window');
const ITEMS_PER_PAGE = 4;
const ITEM_GAP = 20;
const DOT_SIZE = 8;
const DOT_SPACING = 4;
const ANIMATION_DELAY = 150;

// Simplified width calculations to ensure 4 icons fit
const PAGE_WIDTH = width;

interface AppIconWrapperProps {
  app: any;
  onAppStart: (packageName: string) => void;
  isDarkTheme: boolean;
  index: number;
  pageIndex: number;
  activePageIndex: number;
}

const AppIconWrapper: React.FC<AppIconWrapperProps> = ({
  app,
  onAppStart,
  isDarkTheme,
  index,
  pageIndex,
  activePageIndex,
}) => {
  const translateX = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pageIndex === activePageIndex) {
      translateX.setValue(50);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(index * ANIMATION_DELAY),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [pageIndex, activePageIndex, index, translateX, opacity]);

  return (
    <Animated.View
      style={{
        transform: [{translateX}],
        opacity,
      }}>
      <AppIcon
        app={app}
        onClick={() => onAppStart(app.package_name)}
        isDarkTheme={isDarkTheme}
      />
    </Animated.View>
  );
};

interface YourAppsListProps {
  isDarkTheme: boolean;
}

const YourAppsList: React.FC<YourAppsListProps> = ({isDarkTheme}) => {
  const {status} = useStatus();
  const [_isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const bluetoothService = BluetoothService.getInstance();

  const totalPages = Math.ceil(status.apps.length / ITEMS_PER_PAGE);
  const pages = Array.from({length: totalPages}, (_, pageIndex) => {
    const startIndex = pageIndex * ITEMS_PER_PAGE;
    return status.apps.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const newActiveIndex = Math.round(scrollPosition / PAGE_WIDTH);
    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);
    }
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const newActiveIndex = Math.round(scrollPosition / PAGE_WIDTH);
    if (newActiveIndex !== activeIndex) {
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

  return (
    <View style={styles.appsContainer}>
      <View style={styles.titleContainer}>
        <Text
          style={[
            styles.sectionTitle,
            {color: textColor},
            styles.adjustableText,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          Your Apps
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.scrollViewWrapper}>
          <View style={styles.scrollContent}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              snapToInterval={PAGE_WIDTH}
              snapToAlignment="start"
              decelerationRate="fast"
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              showsHorizontalScrollIndicator={false}>
              {pages.map((pageApps, pageIndex) => (
                <View 
                  key={pageIndex} 
                  style={[
                    styles.page,
                    {width: PAGE_WIDTH},
                  ]}>
                  <View style={styles.appsList}>
                    {pageApps.map((app, index) => (
                      <AppIconWrapper
                        key={pageIndex * ITEMS_PER_PAGE + index}
                        app={app}
                        onAppStart={startApp}
                        isDarkTheme={isDarkTheme}
                        index={index}
                        pageIndex={pageIndex}
                        activePageIndex={activeIndex}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              {Array.from({length: totalPages}).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeIndex
                      ? styles.paginationDotActive
                      : styles.paginationDotInactive,
                    isDarkTheme
                      ? styles.paginationDotLight
                      : styles.paginationDotDark,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appsContainer: {
    marginTop: -10,
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
  },
  scrollViewWrapper: {
    height: 100,
    position: 'relative',
  },
  scrollContent: {
    height: 160,
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
    minHeight: 0,
  },
  page: {
    height: '100%',
    justifyContent: 'center',
    width: PAGE_WIDTH, // Ensure full width
  },
  appsList: {
    flexDirection: 'row',
    gap: ITEM_GAP,
    justifyContent: 'flex-start', // Change from flex-start to space-evenly
    alignItems: 'center',
    height: '100%',
    paddingRight:40,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    paddingBottom: 10,
  },
  paginationDot: {
    marginTop: 45,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_SPACING,
    minWidth: DOT_SIZE,
  },
  paginationDotActive: {
    width: DOT_SIZE * 2,
    opacity: 1,
  },
  paginationDotInactive: {
    width: DOT_SIZE,
    opacity: 0.3,
  },
  paginationDotLight: {
    backgroundColor: '#FFFFFF',
  },
  paginationDotDark: {
    backgroundColor: '#000000',
  },
});

export default YourAppsList;