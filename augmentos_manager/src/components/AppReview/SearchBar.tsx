import React, {useState} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface ThemeColors {
  background: string;
  searchBarBg: string;
  searchBarBorder: string;
  inputText: string;
  placeholder: string;
  icon: string;
  filterBg: string;
  filterBorder: string;
  filterText: string;
  activeFilterBg: string;
  activeFilterBorder: string;
  activeFilterText: string;
}

interface SearchWithFiltersProps {
  placeholder?: string;
  onSearch: (query: string, filters: string[]) => void;
  filters: string[];
  isDarkTheme: boolean;
}

const SearchWithFilters: React.FC<SearchWithFiltersProps> = ({
  placeholder = 'Search...',
  onSearch,
  filters,
  isDarkTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Theme colors
  const themeColors: ThemeColors = {
    background: isDarkTheme ? '#1a1a1a' : '#f9f9f9',
    searchBarBg: isDarkTheme ? '#2d2d2d' : '#ffffff',
    searchBarBorder: isDarkTheme ? '#404040' : '#cccccc',
    inputText: isDarkTheme ? '#ffffff' : '#333333',
    placeholder: isDarkTheme ? '#888888' : '#888888',
    icon: isDarkTheme ? '#888888' : '#888888',
    filterBg: isDarkTheme ? '#2d2d2d' : '#f9f9f9',
    filterBorder: isDarkTheme ? '#404040' : '#cccccc',
    filterText: isDarkTheme ? '#ffffff' : '#333333',
    activeFilterBg: isDarkTheme ? '#3b82f6' : '#007BFF',
    activeFilterBorder: isDarkTheme ? '#3b82f6' : '#007BFF',
    activeFilterText: '#ffffff',
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query, selectedFilters);
  };

  const toggleFilter = (filter: string) => {
    const updatedFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter];
    setSelectedFilters(updatedFilters);
    onSearch(searchQuery, updatedFilters);
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: themeColors.searchBarBg,
            borderColor: themeColors.searchBarBorder,
          },
        ]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={themeColors.icon}
          style={styles.icon}
        />
        <TextInput
          style={[
            styles.input,
            styles.inputFont,
            {color: themeColors.inputText},
          ]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Filter Toggles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedFilters.includes(filter)
                  ? themeColors.activeFilterBg
                  : themeColors.filterBg,
                borderColor: selectedFilters.includes(filter)
                  ? themeColors.activeFilterBorder
                  : themeColors.filterBorder,
              },
            ]}
            onPress={() => toggleFilter(filter)}>
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedFilters.includes(filter)
                    ? themeColors.activeFilterText
                    : themeColors.filterText,
                },
              ]}>
              {filter} Star
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  inputFont: {
    fontFamily: 'Montserrat-Regular',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 10,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
});

export default SearchWithFilters;
