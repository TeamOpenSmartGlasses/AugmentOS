import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Switch } from 'react-native';

interface SettingsProps {
  toggleTheme: () => void;
  isDarkTheme: boolean;
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({
  toggleTheme,
  isDarkTheme,
  modalVisible,
  setModalVisible,
}) => {
  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  return (
    <View>
      {/* Settings Menu Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={toggleModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>

            {/* Theme Switch */}
            <View style={styles.switchContainer}>
              <Text style={styles.modalItem}>
                {isDarkTheme ? 'Dark Theme' : 'Light Theme'}
              </Text>
              <Switch value={isDarkTheme} onValueChange={toggleTheme} />
            </View>

            <TouchableOpacity onPress={toggleModal}>
              <Text style={styles.modalItem}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Arial', // Change to Arial for testing
    marginBottom: 20,
  },
  modalItem: {
    fontSize: 16,
    marginVertical: 10,
    fontFamily: 'Arial', // Change to Arial for testing
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    width: '100%',
  },
});

export default Settings;
