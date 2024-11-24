import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Review = {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  comment: string;
};

const ReviewItem: React.FC<{ review: Review }> = ({ review }) => (
  <View style={styles.reviewCard}>
    <Image source={{ uri: review.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
    <View style={styles.reviewContent}>
      <View style={styles.reviewHeader}>
        <Text style={styles.userName}>{review.user}</Text>
        <View style={styles.ratingContainer}>
          {Array.from({ length: 5 }, (_, index) => (
            <MaterialCommunityIcons
              key={index}
              name={index < review.rating ? 'star' : 'star-outline'}
              size={18}
              color={index < review.rating ? '#FFD700' : '#E0E0E0'}
            />
          ))}
        </View>
      </View>
      <Text style={styles.comment}>{review.comment}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  reviewCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  reviewContent: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  comment: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default ReviewItem;
