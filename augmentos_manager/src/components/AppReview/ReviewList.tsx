import React from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
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
  isDarkTheme: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  onReviewPress,
  isDarkTheme,
}) => {
  // Theme colors
  const themeColors = {
    cardBackground: isDarkTheme ? '#2d2d2d' : '#ffffff',
    text: isDarkTheme ? '#ffffff' : '#000000',
    subText: isDarkTheme ? '#b3b3b3' : '#555555',
    starFilled: isDarkTheme ? '#ffd700' : '#ffd700',
    starEmpty: isDarkTheme ? '#666666' : '#e0e0e0',
    cardShadow: isDarkTheme ? '#000000' : '#000000',
  };

  return (
    <View>
      {reviews.map(review => (
        <TouchableOpacity
          key={review.id}
          style={[
            styles.reviewCard,
            {
              backgroundColor: themeColors.cardBackground,
              shadowColor: themeColors.cardShadow,
            },
          ]}
          onPress={() => onReviewPress(review)}>
          {/* Avatar and User Info */}
          <View style={styles.avatarContainer}>
            <Image
              source={{uri: review.avatar || 'https://i.pravatar.cc/150'}}
              style={styles.avatar}
            />
            <Text style={[styles.userName, {color: themeColors.text}]}>
              {review.user}
            </Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingContainer}>
            {Array.from({length: 5}, (_, index) => (
              <MaterialCommunityIcons
                key={index}
                name={index < review.rating ? 'star' : 'star-outline'}
                size={16}
                color={
                  index < review.rating
                    ? themeColors.starFilled
                    : themeColors.starEmpty
                }
              />
            ))}
          </View>

          {/* Comment Preview */}
          <Text
            numberOfLines={1}
            style={[styles.reviewComment, {color: themeColors.subText}]}>
            {review.comment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  reviewCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    fontFamily: 'Montserrat-Bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  reviewComment: {
    marginTop: 5,
    fontFamily: 'Montserrat-Regular',
  },
});

export default ReviewList;
