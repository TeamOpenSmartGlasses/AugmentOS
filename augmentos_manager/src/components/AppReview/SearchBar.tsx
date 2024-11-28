import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface SearchWithFiltersProps {
  placeholder?: string;
  onSearch: (query: string, filters: string[]) => void;
  filters: string[];
}

const SearchWithFilters: React.FC<SearchWithFiltersProps> = ({
  placeholder = 'Search...',
  onSearch,
  filters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query, selectedFilters);
  };

  const toggleFilter = (filter: string) => {
    const updatedFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter((f) => f !== filter)
      : [...selectedFilters, filter];
    setSelectedFilters(updatedFilters);
    onSearch(searchQuery, updatedFilters);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Filter Toggles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilters.includes(filter) && styles.activeFilterButton,
            ]}
            onPress={() => toggleFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilters.includes(filter) && styles.activeFilterText,
              ]}
            >
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
      paddingHorizontal: 15, // Added padding around the entire container
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5, // Adjust vertical padding for better appearance
      marginBottom: 10,
      marginTop: 10, // Add margin top to separate search bar from filters
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 40,
      fontSize: 16,
      color: '#333',
    },
    filterContainer: {
      flexDirection: 'row',
      marginTop: 10,
      paddingHorizontal: 5, // Add padding to align filters better
    },
    filterButton: {
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 20,
      marginRight: 10,
      backgroundColor: '#f9f9f9',
    },
    activeFilterButton: {
      backgroundColor: '#007BFF',
      borderColor: '#007BFF',
    },
    filterText: {
      fontSize: 14,
      color: '#333',
    },
    activeFilterText: {
      color: '#fff',
    },
  });


export default SearchWithFilters;
