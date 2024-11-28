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
}

const ReviewDetailsModal: React.FC<ReviewDetailsModalProps> = ({
  isVisible,
  review,
  onClose,
}) => {
  if (!review) {
    return null;
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <Image source={{ uri: review.avatar }} style={styles.avatar} />
          <Text style={styles.userName}>{review.user}</Text>

          <View style={styles.ratingContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <MaterialCommunityIcons
                key={index}
                name={index < review.rating ? 'star' : 'star-outline'}
                size={24}
                color={index < review.rating ? '#FFD700' : '#E0E0E0'}
              />
            ))}
          </View>

          <Text style={styles.comment}>{review.comment}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ReviewDetailsModal;
