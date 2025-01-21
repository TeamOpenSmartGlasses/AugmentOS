import React, {useState, useRef, memo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import {RootStackParamList, AppStoreItem} from '../components/types';
import NavigationBar from '../components/NavigationBar';
import {AppStoreData} from '../data/appStoreData';
import AppItem from '../components/AppStore/AppItem.tsx';

interface AppStoreProps {
  isDarkTheme: boolean;
}

const RecommendedItem = memo(
  ({
    item,
    theme,
    onPress,
  }: {
    item: AppStoreItem;
    theme: any;
    onPress: () => void;
  }) => {
    const scale = useRef(new Animated.Value(0.5)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useFocusEffect(
      React.useCallback(() => {
        scale.setValue(0.5);
        opacity.setValue(0);

        const animation = Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]);

        animation.start();

        return () => {
          animation.stop();
        };
      }, [opacity, scale]),
    );

    return (
      <Animated.View
        style={{
          transform: [{scale}],
          opacity,
        }}>
        <TouchableOpacity style={styles.recommendCard} onPress={onPress}>
          <Image
            source={{uri: item.icon_image_url}}
            style={styles.recommendIcon}
          />
          <Text
            style={[styles.recommendAppName, {color: theme.textColor}]}
            numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

const AppStore: React.FC<AppStoreProps> = ({isDarkTheme}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'AppStore'>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredApps, setFilteredApps] = useState(AppStoreData);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Animation values for main layout (keeping all except list animations)
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const categoryAnimation = useRef(new Animated.Value(-100)).current;
  const recommendedAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Theme colors
  const theme = {
    backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
    headerBg: isDarkTheme ? '#333333' : '#fff',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    subTextColor: isDarkTheme ? '#999999' : '#666666',
    cardBg: isDarkTheme ? '#333333' : '#fff',
    borderColor: isDarkTheme ? '#444444' : '#e0e0e0',
    searchBg: isDarkTheme ? '#2c2c2c' : '#f5f5f5',
    categoryChipBg: isDarkTheme ? '#444444' : '#e9e9e9',
    categoryChipText: isDarkTheme ? '#FFFFFF' : '#555555',
    selectedChipBg: isDarkTheme ? '#666666' : '#333333',
    selectedChipText: isDarkTheme ? '#FFFFFF' : '#FFFFFF',
  };

  useFocusEffect(
    React.useCallback(() => {
      // Reset animation values
      headerAnimation.setValue(0);
      searchAnimation.setValue(0);
      categoryAnimation.setValue(-100);
      recommendedAnimation.setValue(0);
      fadeAnimation.setValue(0);

      // Start animations
      const animation = Animated.parallel([
        Animated.timing(headerAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(searchAnimation, {
          toValue: 1,
          duration: 800,
          delay: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(categoryAnimation, {
          toValue: 0,
          delay: 400,
          useNativeDriver: true,
          bounciness: 8,
        }),
        Animated.timing(recommendedAnimation, {
          toValue: 1,
          duration: 800,
          delay: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      animation.start();

      return () => {
        animation.stop();
      };
    }, [
      categoryAnimation,
      fadeAnimation,
      headerAnimation,
      recommendedAnimation,
      searchAnimation,
    ]),
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    filterApps(text, selectedCategory);
  };

  const filterApps = (query: string, category: string | null) => {
    let apps = AppStoreData;

    if (category) {
      apps = apps.filter(app => app.category === category);
    }

    if (query) {
      apps = apps.filter(app =>
        app.name.toLowerCase().includes(query.toLowerCase()),
      );
    }

    setFilteredApps(apps);
  };

  const handleCategoryPress = (category: string) => {
    if (category === 'All') {
      setSelectedCategory(null);
      filterApps(searchQuery, null);
    } else {
      const newCategory = selectedCategory === category ? null : category;
      setSelectedCategory(newCategory);
      filterApps(searchQuery, newCategory);
    }
  };

  const renderItem = ({item, index}: {item: AppStoreItem; index: number}) => (
    <AppItem
      item={item}
      index={index}
      theme={theme}
      onPress={() => navigation.navigate('AppDetails', {app: item})}
    />
  );

  const renderRecommendedItem = ({item}: {item: AppStoreItem}) => (
    <RecommendedItem
      item={item}
      theme={theme}
      onPress={() => navigation.navigate('AppDetails', {app: item})}
    />
  );

  const renderCategory = ({item}: {item: string}) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        {backgroundColor: theme.categoryChipBg},
        selectedCategory === item && {backgroundColor: theme.selectedChipBg},
      ]}
      onPress={() => handleCategoryPress(item)}>
      <Text
        style={[
          styles.categoryText,
          {color: theme.categoryChipText},
          selectedCategory === item && {color: theme.selectedChipText},
        ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.backgroundColor}]}>
      <Animated.View
        style={[
          styles.headerContainer,
          {
            backgroundColor: theme.headerBg,
            borderBottomColor: theme.borderColor,
            transform: [
              {
                translateY: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
            opacity: headerAnimation,
          },
        ]}>
        <Text
          style={[
            styles.header,
            isDarkTheme ? styles.headerTextDark : styles.headerTextLight,
          ]}>
          App Store
        </Text>
        <Animated.View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.searchBg,
              transform: [{scale: searchAnimation}],
              opacity: searchAnimation,
            },
          ]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDarkTheme ? '#FFFFFF' : '#aaaaaa'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, {color: theme.textColor}]}
            placeholder="Search for apps..."
            placeholderTextColor={isDarkTheme ? '#999999' : '#aaaaaa'}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearButton}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={isDarkTheme ? '#999999' : '#aaaaaa'}
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

{/* Not in 1.0 */}
      {/* <Animated.View
        style={[
          styles.categoriesSection,
          {
            transform: [{translateX: categoryAnimation}],
          },
        ]}>
        <FlatList
          data={[
            'All',
            'Social',
            'Productivity',
            'Navigation',
            'Artificial Intelligence',
            'Utilities',
            'Accessibility',
            'Health',
          ]}
          horizontal
          renderItem={renderCategory}
          keyExtractor={item => item}
          contentContainerStyle={styles.categoriesList}
          showsHorizontalScrollIndicator={false}
        />
      </Animated.View> */}

      <Animated.View
        style={[
          styles.recommendSection,
          {
            opacity: recommendedAnimation,
          },
        ]}>
        <Text style={[styles.recommendHeader, {color: theme.textColor}]}>
          Recommended for You
        </Text>
        {/* <FlatList
          data={AppStoreData.slice(0, 5)}
          horizontal
          renderItem={renderRecommendedItem}
          keyExtractor={item => item.identifier_code}
          contentContainerStyle={styles.recommendList}
          showsHorizontalScrollIndicator={false}
        /> */}
      </Animated.View>

      <View style={styles.listContainer}>
        <FlatList
          data={filteredApps}
          renderItem={renderItem}
          keyExtractor={item => item.identifier_code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
        />
      </View>

      <Animated.View
        style={[
          styles.navigationBarContainer,
          {
            backgroundColor: theme.headerBg,
            borderTopColor: theme.borderColor,
            opacity: fadeAnimation,
          },
        ]}>
        <NavigationBar toggleTheme={() => {}} isDarkTheme={isDarkTheme} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  headerTextDark: {
    color: '#ffffff',
  },
  headerTextLight: {
    color: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    height: 40,
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat-Regular',
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: -4,
  },
  categoriesSection: {
    marginTop: 15,
    paddingHorizontal: 0,
  },
  categoriesList: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#e9e9e9',
    borderRadius: 20,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    fontFamily: 'Montserrat-Medium',
  },
  recommendSection: {
    marginTop: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  recommendHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#444',
    //marginBottom: 15,
    fontFamily: 'Montserrat-Bold',
  },
  recommendList: {},
  recommendCard: {
    width: 85,
    marginRight: 15,
    alignItems: 'center',
  },
  recommendIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  recommendAppName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    width: '100%',
    fontFamily: 'Montserrat-SemiBold',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 80,
  },
  navigationBarContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
  },
});

export default AppStore;
