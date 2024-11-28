import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
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

const ReviewList: React.FC<ReviewListProps> = ({ reviews, onReviewPress }) => (
  <View>
    {reviews.map((review) => (
      <TouchableOpacity
        key={review.id}
        style={styles.reviewCard}
        onPress={() => onReviewPress(review)}
      >
        {/* Avatar and User Info */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: review.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
          <Text style={styles.userName}>{review.user}</Text>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingContainer}>
          {Array.from({ length: 5 }, (_, index) => (
            <MaterialCommunityIcons
              key={index}
              name={index < review.rating ? 'star' : 'star-outline'}
              size={16}
              color={index < review.rating ? '#FFD700' : '#E0E0E0'}
            />
          ))}
        </View>

        {/* Comment Preview */}
        <Text numberOfLines={1} style={styles.reviewComment}>
          {review.comment}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
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
