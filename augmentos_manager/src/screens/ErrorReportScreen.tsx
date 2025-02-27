import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import LogService from '../logic/LogService';
import { useStatus } from '../providers/AugmentOSStatusProvider';

interface ErrorReportingScreenProps {
  navigation: any;
}

const ErrorReportingScreen: React.FC<ErrorReportingScreenProps> = ({ navigation }) => {
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
    const { status } = useStatus();
  
  const sendErrorReport = async () => {
    if (description.trim().length === 0) {
      Alert.alert('Error', 'Please enter a description of the issue');
      return;
    }
    
    setIsSending(true);
    
    try {
      // Get the log service instance
      const logService = LogService.getInstance();
      
      // Use the token from state or pass a placeholder if not available
      const authToken = status.core_info.core_token || 'placeholder-token';
      
      // Send the error report
      await logService.sendErrorReport(description, authToken);
      
      Alert.alert(
        'Success', 
        'Error report submitted successfully. Thank you for helping improve the app!',
        [{ 
          text: 'OK',
          onPress: () => {
            setDescription('');
            navigation.goBack(); // Return to previous screen after successful report
          }
        }]
      );
    } catch (error) {
      console.error("Error sending report:", error);
      Alert.alert(
        'Error', 
        'Could not send error report. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Report an Error</Text>
      
      <Text style={styles.label}>Describe the issue you encountered:</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
        placeholder="What happened? What were you trying to do when the error occurred?"
        placeholderTextColor="#999"
      />
      
      <Text style={styles.note}>
        This will send your description along with recent app logs to our support team.
        No personal information is collected other than what you provide above.
      </Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={sendErrorReport}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Report</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={isSending}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
    color: '#333',
  },
  note: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
  },
});

export default ErrorReportingScreen;