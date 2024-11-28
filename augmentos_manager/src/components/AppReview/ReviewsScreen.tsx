import React from 'react';
import { FlatList, Text, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Review {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  comment: string;
}

interface ReviewListProps {
  reviews: Array<Review>;
  onReviewPress: (review: Review) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews, onReviewPress }) => {
  const renderItem = ({ item }: { item: Review }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.reviewCard}
      onPress={() => onReviewPress(item)}
    >
      {/* Avatar and User Info */}
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
        <Text style={styles.userName}>{item.user}</Text>
      </View>

      {/* Star Rating */}
      <View style={styles.ratingContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <MaterialCommunityIcons
            key={index}
            name={index < item.rating ? 'star' : 'star-outline'}
            size={16}
            color={index < item.rating ? '#FFD700' : '#E0E0E0'}
          />
        ))}
      </View>

      {/* Comment Preview */}
      <Text numberOfLines={1} style={styles.reviewComment}>
        {item.comment}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={reviews}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20, // Add some padding for spacing at the bottom
  },
  reviewCard: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  reviewComment: {
    color: '#555',
    marginTop: 5,
  },
});

export default ReviewList;
