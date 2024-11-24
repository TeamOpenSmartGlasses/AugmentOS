import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface ReviewModalProps {
  isVisible: boolean;
  rating: number;
  comment: string;
  setRating: (rating: number) => void;
  setComment: (comment: string) => void;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isVisible,
  rating,
  comment,
  setRating,
  setComment,
  onSubmit,
  onClose,
}) => {
  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>Leave a Review</Text>

          {/* Star Rating */}
          <View style={styles.ratingContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <TouchableOpacity key={index} onPress={() => setRating(index + 1)}>
                <MaterialCommunityIcons
                  name={index < rating ? 'star' : 'star-outline'}
                  size={30}
                  color="#FFD700"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment Input */}
          <TextInput
            style={styles.input}
            placeholder="Write your review here..."
            value={comment}
            onChangeText={setComment}
            multiline
          />

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => onSubmit(rating, comment)}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ReviewModal;
