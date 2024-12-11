import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Review {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  comment: string;
}

interface ReviewDetailsModalProps {
  isVisible: boolean;
  review: Review | null;
  onClose: () => void;
  isDarkTheme: boolean;
}

const ReviewDetailsModal: React.FC<ReviewDetailsModalProps> = ({
  isVisible,
  review,
  onClose,
  isDarkTheme,
}) => {
  if (!review) {
    return null;
  }

  // Theme colors
  const themeColors = {
    modalBackground: isDarkTheme ? '#2d2d2d' : '#ffffff',
    text: isDarkTheme ? '#ffffff' : '#333333',
    subText: isDarkTheme ? '#b3b3b3' : '#555555',
    starFilled: isDarkTheme ? '#ffd700' : '#ffd700',
    starEmpty: isDarkTheme ? '#666666' : '#e0e0e0',
    closeIcon: isDarkTheme ? '#ffffff' : '#333333',
    overlay: 'rgba(0, 0, 0, 0.7)',
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={[styles.modalContainer, { backgroundColor: themeColors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={themeColors.closeIcon} />
          </TouchableOpacity>

          <Image 
            source={{ uri: review.avatar }} 
            style={styles.avatar} 
          />
          <Text style={[styles.userName, { color: themeColors.text }]}>
            {review.user}
          </Text>

          <View style={styles.ratingContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <MaterialCommunityIcons
                key={index}
                name={index < review.rating ? 'star' : 'star-outline'}
                size={24}
                color={index < review.rating ? themeColors.starFilled : themeColors.starEmpty}
              />
            ))}
          </View>

          <Text style={[styles.comment, { color: themeColors.subText }]}>
            {review.comment}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  comment: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});

export default ReviewDetailsModal;