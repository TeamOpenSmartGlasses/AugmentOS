import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface ThemeColors {
  modalBackground: string;
  text: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  placeholderText: string;
  starColor: string;
  submitButton: string;
  cancelButton: string;
  buttonText: string;
  overlay: string;
}

interface ReviewModalProps {
  isVisible: boolean;
  rating: number;
  comment: string;
  setRating: (rating: number) => void;
  setComment: (comment: string) => void;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
  isDarkTheme: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isVisible,
  rating,
  comment,
  setRating,
  setComment,
  onSubmit,
  onClose,
  isDarkTheme,
}) => {
  // Theme colors
  const themeColors: ThemeColors = {
    modalBackground: isDarkTheme ? '#2d2d2d' : '#ffffff',
    text: isDarkTheme ? '#ffffff' : '#000000',
    inputBackground: isDarkTheme ? '#404040' : '#ffffff',
    inputBorder: isDarkTheme ? '#555555' : '#cccccc',
    inputText: isDarkTheme ? '#ffffff' : '#000000',
    placeholderText: isDarkTheme ? '#888888' : '#999999',
    starColor: isDarkTheme ? '#ffd700' : '#ffd700',
    submitButton: isDarkTheme ? '#3b82f6' : '#007BFF',
    cancelButton: isDarkTheme ? '#666666' : '#cccccc',
    buttonText: '#ffffff',
    overlay: 'rgba(0,0,0,0.7)',
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={[styles.modalContainer, { backgroundColor: themeColors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]}>
          <Text style={[styles.modalHeader, { color: themeColors.text }]}>
            Leave a Review
          </Text>

          {/* Star Rating */}
          <View style={styles.ratingContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setRating(index + 1)}
                style={styles.starButton}
              >
                <MaterialCommunityIcons
                  name={index < rating ? 'star' : 'star-outline'}
                  size={30}
                  color={themeColors.starColor}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment Input */}
          <TextInput
            style={[
              styles.input,
              styles.inputFont,
              {
                backgroundColor: themeColors.inputBackground,
                borderColor: themeColors.inputBorder,
                color: themeColors.inputText,
              },
            ]}
            placeholder="Write your review here..."
            placeholderTextColor={themeColors.placeholderText}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeColors.cancelButton }]}
              onPress={onClose}
            >
              <Text style={styles.buttonTextStyle}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: themeColors.submitButton }]}
              onPress={() => onSubmit(rating, comment)}
            >
              <Text style={styles.buttonTextStyle}>Submit</Text>
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
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    height: 80,
    textAlignVertical: 'top',
  },
  inputFont: {
    fontFamily: 'Montserrat-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    padding: 10,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  buttonTextStyle: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});

export default ReviewModal;