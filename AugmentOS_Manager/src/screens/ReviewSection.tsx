import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppStoreData } from './AppStore.tsx';
import SearchWithFilters from '../components/AppReview/SearchBar.tsx';
import ReviewList from '../components/AppReview/ReviewList.tsx';
import ReviewModal from '../components/AppReview/ReviewModal.tsx';
import ReviewDetailsModal from '../components/AppReview/ReviewDetailsModal.tsx';
import AnimatedChatBubble from '../components/AppReview/AnimatedChatBubble.tsx';

const ReviewSection = ({ route }: any) => {
  const { appId } = route.params;

  const app = AppStoreData.find((item: { identifier_code: string }) => item.identifier_code === appId);
  const reviews = useMemo(() => app?.reviews || [], [app]);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [filteredReviews, setFilteredReviews] = useState(reviews);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');

  const handleSearch = (query: string, filters: string[]) => {
    const filtered = reviews.filter((review) => {
      const matchesQuery =
        review.user.toLowerCase().includes(query.toLowerCase()) ||
        review.comment.toLowerCase().includes(query.toLowerCase());
      const matchesFilters =
        filters.length === 0 || filters.includes(review.rating.toString()); // Filter by rating
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

    setFilteredReviews((prevReviews) => [...prevReviews, newReview]);
    setModalVisible(false);
  };

  const handleReviewPress = (review: any) => {
    setSelectedReview(review);
    setDetailsModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* SearchWithFilters Component */}
      <SearchWithFilters
        placeholder="Search reviews..."
        onSearch={handleSearch}
        filters={['1', '2', '3', '4', '5']} // Filters for ratings 1 to 5
      />

      {/* Scrollable Review List */}
      <ScrollView style={styles.scrollContainer}>
        <ReviewList reviews={filteredReviews} onReviewPress={handleReviewPress} />
      </ScrollView>

      {/* Animated Chat Bubble */}
      <AnimatedChatBubble />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.reviewBubble} onPress={() => setModalVisible(true)}>
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
      />

      {/* Review Details Modal */}
      <ReviewDetailsModal
        isVisible={isDetailsModalVisible}
        review={selectedReview}
        onClose={() => setDetailsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 60, // Adjust to avoid overlapping with Floating Action Button
  },
  reviewBubble: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default ReviewSection;
