import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList, AppStoreItem } from '../components/types';
import NavigationBar from '../components/NavigationBar';

export const AppStoreData: AppStoreItem[] = [
    {
      name: 'Open Browser',
      packagename: 'org.open.browser',
      description:
        'A lightweight, open-source browser that allows users to surf the web quickly and efficiently, featuring a clean interface and essential tools for a seamless browsing experience.',
      icon_image_url:
        'https://augmentos.org/wp-content/uploads/2024/11/output-007-2048x2048.png',
      identifier_code: 'BROWSER1',
      rating: 4.5,
      downloads: 5000,
      requirements: ['Display', 'Network Access'],
      category: 'Tools',
      screenshots: [
        'https://picsum.photos/400?random=1',
        'https://picsum.photos/400?random=2',
        'https://picsum.photos/400?random=3',
      ],
      reviews: [
        {
          id: '1',
          user: 'Alice',
          avatar: 'https://i.pravatar.cc/150?img=1',
          rating: 5,
          comment: 'Amazing browser! Fast and reliable.',
        },
        {
          id: '2',
          user: 'Bob',
          avatar: 'https://i.pravatar.cc/150?img=2',
          rating: 4,
          comment: 'Good, but needs better ad-blocking.',
        },
        {
          id: '3',
          user: 'Charlie',
          avatar: 'https://i.pravatar.cc/150?img=3',
          rating: 3,
          comment: 'Could be faster.',
        },
        {
          id: '4',
          user: 'David',
          avatar: 'https://i.pravatar.cc/150?img=4',
          rating: 5,
          comment: 'Best browser I\'ve ever used!',
        },
        {
          id: '5',
          user: 'Eve',
          avatar: 'https://i.pravatar.cc/150?img=5',
          rating: 5,
          comment: 'I love this browser! It\'s fast and has a clean interface.',
        },
        {
          id: '6',
          user: 'Frank',
          avatar: 'https://i.pravatar.cc/150?img=6',
          rating: 4,
          comment: 'This browser is great for basic browsing. It\'s fast and reliable.',
        },
        {
          id: '7',
          user: 'Grace',
          avatar: 'https://i.pravatar.cc/150?img=7',
          rating: 5,
          comment: 'This browser is amazing! It\'s fast and has a clean interface.',
        },
        {
          id: '8',
          user: 'Hannah',
          avatar: 'https://i.pravatar.cc/150?img=8',
          rating: 5,
          comment: 'This browser is amazing! It\'s fast and has a clean interface.',
        },
        {
          id: '9',
          user: 'Isaac',
          avatar: 'https://i.pravatar.cc/150?img=9',
          rating: 5,
          comment: 'This browser is amazing! It\'s fast and has a clean interface.',
        },
        {
          id: '10',
          user: 'Jack',
          avatar: 'https://i.pravatar.cc/150?img=10',
          rating: 5,
          comment: 'This browser is amazing! It\'s fast and has a clean interface.',
        },
        {
          id: '11',
          user: 'Kate',
          avatar: 'https://i.pravatar.cc/150?img=11',
          rating: 5,
          comment: 'This browser is amazing! It\'s fast and has a clean interface.',
        },
      ],
    },
    {
      name: 'Simple Notes',
      packagename: 'org.simple.notes',
      description:
        'A minimalist note-taking app designed for users who prefer simplicity and efficiency, allowing them to jot down thoughts and ideas quickly without distractions.',
      icon_image_url:
        'https://augmentos.org/wp-content/uploads/2024/11/output-006-768x768.png',
      identifier_code: 'NOTES1',
      rating: 4.8,
      downloads: 3000,
      requirements: ['Display', 'Storage'],
      category: 'Productivity',
      screenshots: [
        'https://picsum.photos/400?random=4',
        'https://picsum.photos/400?random=5',
      ],
      reviews: [
        {
          id: '1',
          user: 'Charlie',
          avatar: 'https://i.pravatar.cc/150?img=3',
          rating: 5,
          comment: 'Perfect for quick notes.',
        },
        {
          id: '2',
          user: 'Diana',
          avatar: 'https://i.pravatar.cc/150?img=4',
          rating: 4,
          comment: 'Great, but needs more customization.',
        },
      ],
    },
    {
      name: 'Fitness Tracker',
      packagename: 'org.fit.tracker',
      description:
        'Track your fitness goals with ease using this comprehensive app that monitors your workouts, progress, and health metrics, helping you stay motivated and on track.',
      icon_image_url:
        'https://augmentos.org/wp-content/uploads/2024/11/output-004-768x768.png',
      identifier_code: 'FITNESS1',
      rating: 4.9,
      downloads: 10000,
      requirements: ['Display', 'GPS', 'Network Access'],
      category: 'Health',
      screenshots: [
        'https://picsum.photos/400?random=6',
        'https://picsum.photos/400?random=7',
      ],
      reviews: [
        {
          id: '1',
          user: 'Eve',
          avatar: 'https://i.pravatar.cc/150?img=5',
          rating: 5,
          comment: 'Keeps me on track with my fitness goals!',
        },
        {
          id: '2',
          user: 'Frank',
          avatar: 'https://i.pravatar.cc/150?img=6',
          rating: 5,
          comment: 'Best fitness tracker I’ve used.',
        },
      ],
    },
    {
      name: 'Photo Editor',
      packagename: 'org.photo.editor',
      description:
        'Edit your photos with advanced filters and tools that allow for professional-grade enhancements, making it easy to create stunning visuals for sharing or personal use.',
      icon_image_url:
        'https://augmentos.org/wp-content/uploads/2024/11/output-009-768x768.png',
      identifier_code: 'PHOTO1',
      rating: 4.7,
      downloads: 7500,
      requirements: ['Display', 'Storage', 'Network Access', 'Camera', 'Audio'],
      category: 'Photography',
      screenshots: [
        'https://picsum.photos/400?random=8',
        'https://picsum.photos/400?random=9',
      ],
      reviews: [
        {
          id: '1',
          user: 'Grace',
          avatar: 'https://i.pravatar.cc/150?img=7',
          rating: 5,
          comment: 'Professional-level photo editing tools!',
        },
        {
          id: '2',
          user: 'Henry',
          avatar: 'https://i.pravatar.cc/150?img=8',
          rating: 4,
          comment: 'Needs more filters, but great overall.',
        },
      ],
    },
  ];

  const AppStore: React.FC = () => {
    const navigation =
      useNavigation<NativeStackNavigationProp<RootStackParamList, 'AppStore'>>();

    const [searchQuery, setSearchQuery] = useState('');
    const [filteredApps, setFilteredApps] = useState(AppStoreData);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const handleSearch = (text: string) => {
      setSearchQuery(text);
      filterApps(text, selectedCategory);
    };

    const filterApps = (query: string, category: string | null) => {
      let apps = AppStoreData;

      if (category) {
        apps = apps.filter((app) => app.category === category);
      }

      if (query) {
        apps = apps.filter((app) =>
          app.name.toLowerCase().includes(query.toLowerCase())
        );
      }

      setFilteredApps(apps);
    };

    const handleCategoryPress = (category: string) => {
      const newCategory = selectedCategory === category ? null : category;
      setSelectedCategory(newCategory);
      filterApps(searchQuery, newCategory);
    };

    const renderItem = ({ item }: { item: AppStoreItem }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AppDetails', { app: item })}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.icon_image_url }} style={styles.icon} />
        <View style={styles.cardContent}>
          <Text style={styles.appName}>{item.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingBadge}>{item.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="download" size={16} color="#444" />
              <Text style={styles.downloadBadge}>
                {item.downloads.toLocaleString()} downloads
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );

    const renderRecommendedItem = ({ item }: { item: AppStoreItem }) => (
      <TouchableOpacity
        style={styles.recommendCard}
        onPress={() => navigation.navigate('AppDetails', { app: item })}
      >
        <Image source={{ uri: item.icon_image_url }} style={styles.recommendIcon} />
        <Text style={styles.recommendAppName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>App Store</Text>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#aaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for apps..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesSection}>
          <FlatList
            data={[
              'All',
              'Productivity',
              'Tools',
              'Health',
              'Photography',
              'Education',
              'Finance',
              'Lifestyle',
              'Utilities',
            ]}
            horizontal
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.selectedCategoryChip,
                ]}
                onPress={() => handleCategoryPress(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === item && styles.selectedCategoryText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Recommended Section */}
        <View style={styles.recommendSection}>
          <Text style={styles.recommendHeader}>Recommended for You</Text>
          <FlatList
            data={AppStoreData}
            horizontal
            renderItem={renderRecommendedItem}
            keyExtractor={(item) => item.identifier_code}
            contentContainerStyle={styles.recommendList}
          />
        </View>

        {/* App List */}
        <FlatList
          data={filteredApps}
          renderItem={renderItem}
          keyExtractor={(item) => item.identifier_code}
          contentContainerStyle={styles.listContent}
        />

        {/* Bottom Navigation Bar */}
        <View style={styles.navigationBarContainer}>
          <NavigationBar toggleTheme={() => {}} isDarkTheme={false} />
        </View>
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
      fontSize: 22,
      fontWeight: '600',
      color: '#333',
      textAlign: 'center',
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
      fontSize: 16,
      color: '#333',
    },
    categoriesSection: {
      marginTop: 15,
      paddingHorizontal: 15,
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
    selectedCategoryChip: {
      backgroundColor: '#333',
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#555',
    },
    selectedCategoryText: {
      color: '#fff',
    },
    recommendSection: {
      marginTop: 20,
      paddingHorizontal: 15,
      marginBottom: 15,
    },
    recommendHeader: {
      fontSize: 18,
      fontWeight: '500',
      color: '#444',
      marginBottom: 10,
    },
    recommendList: {
      paddingHorizontal: 5,
    },
    recommendCard: {
      width: 120,
      marginRight: 15,
      alignItems: 'center',
    },
    recommendIcon: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginBottom: 5,
    },
    recommendAppName: {
      fontSize: 12,
      fontWeight: '600',
      color: '#333',
      textAlign: 'center',
    },
    listContent: {
      paddingHorizontal: 15,
      paddingBottom: 80,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      padding: 10,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    icon: {
      width: 50,
      height: 50,
      borderRadius: 4,
      marginRight: 10,
    },
    cardContent: {
      flex: 1,
    },
    appName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#333',
    },
    description: {
      fontSize: 12,
      color: '#666',
    },
    badges: {
      flexDirection: 'row',
      marginTop: 5,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
    },
    ratingBadge: {
      fontSize: 12,
      color: '#444',
    },
    downloadBadge: {
      fontSize: 12,
      color: '#444',
    },
    navigationBarContainer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
    },
  });

  export default AppStore;
  