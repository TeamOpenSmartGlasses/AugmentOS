import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppStoreData } from '../data/appStoreData.ts';
import SearchWithFilters from '../components/AppReview/SearchBar.tsx';
import ReviewList from '../components/AppReview/ReviewList.tsx';
import ReviewModal from '../components/AppReview/ReviewModal.tsx';
import ReviewDetailsModal from '../components/AppReview/ReviewDetailsModal.tsx';
import AnimatedChatBubble from '../components/AppReview/AnimatedChatBubble.tsx';

interface ReviewSectionProps {
  route: any;
  isDarkTheme: boolean;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ route, isDarkTheme }) => {
  const { appId } = route.params;

  const app = AppStoreData.find((item: { identifier_code: string }) => item.identifier_code === appId);
  const reviews = useMemo(() => app?.reviews || [], [app]);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [filteredReviews, setFilteredReviews] = useState(reviews);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');

  // Theme-based colors
  const themeColors = {
    background: isDarkTheme ? '#1a1a1a' : '#f9f9f9',
    text: isDarkTheme ? '#ffffff' : '#000000',
    card: isDarkTheme ? '#2d2d2d' : '#ffffff',
    accent: isDarkTheme ? '#3b82f6' : '#007BFF',
    border: isDarkTheme ? '#404040' : '#e0e0e0',
  };

  const handleSearch = (query: string, filters: string[]) => {
    const filtered = reviews.filter((review: { user: string; comment: string; rating: number }) => {
      const matchesQuery =
        review.user.toLowerCase().includes(query.toLowerCase()) ||
        review.comment.toLowerCase().includes(query.toLowerCase());
      const matchesFilters =
        filters.length === 0 || filters.includes(review.rating.toString());
      return matchesQuery && matchesFilters;
    });
    setFilteredReviews(filtered);
  };

  const handleSubmitReview = (rating: number, comment: string) => {
    const newReview = {
      id: String(filteredReviews.length + 1),
      user: 'Anonymous User',
      avatar: 'https://i.pravatar.cc/150',
      rating,
      comment,
    };

    setFilteredReviews((prevReviews: typeof reviews) => [...prevReviews, newReview]);
    setModalVisible(false);
  };

  const handleReviewPress = (review: any) => {
    setSelectedReview(review);
    setDetailsModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* SearchWithFilters Component */}
      <SearchWithFilters
        placeholder="Search reviews..."
        onSearch={handleSearch}
        filters={['1', '2', '3', '4', '5']}
        isDarkTheme={isDarkTheme}
      />

      {/* Scrollable Review List */}
      <ScrollView style={[styles.scrollContainer, { borderColor: themeColors.border }]}>
        <ReviewList
          reviews={filteredReviews}
          onReviewPress={handleReviewPress}
          isDarkTheme={isDarkTheme}
        />
      </ScrollView>

      {/* Animated Chat Bubble */}
      <AnimatedChatBubble isDarkTheme={isDarkTheme} />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.reviewBubble, { backgroundColor: themeColors.accent }]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="message-reply-text" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Review Modal */}
      <ReviewModal
        isVisible={isModalVisible}
        rating={newRating}
        comment={newComment}
        setRating={setNewRating}
        setComment={setNewComment}
        onSubmit={handleSubmitReview}
        onClose={() => setModalVisible(false)}
        isDarkTheme={isDarkTheme}
      />

      {/* Review Details Modal */}
      <ReviewDetailsModal
        isVisible={isDetailsModalVisible}
        review={selectedReview}
        onClose={() => setDetailsModalVisible(false)}
        isDarkTheme={isDarkTheme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  reviewBubble: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default ReviewSection;