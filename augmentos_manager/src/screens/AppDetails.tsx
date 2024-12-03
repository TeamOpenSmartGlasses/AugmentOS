import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, AppStoreItem } from '../components/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type AppDetailsProps = NativeStackScreenProps<RootStackParamList, 'AppDetails'> & {
  isDarkTheme: boolean;
};

const AppDetails: React.FC<AppDetailsProps> = ({ route, navigation, isDarkTheme  }) => {
  const { app } = route.params as { app: AppStoreItem };
  const [installState, setInstallState] = useState<'Install' | 'Installing...' | 'Start'>(
    'Install'
  );

  // Theme colors
  const theme = {
    backgroundColor: isDarkTheme ? '#1c1c1c' : '#f9f9f9',
    textColor: isDarkTheme ? '#FFFFFF' : '#333333',
    subTextColor: isDarkTheme ? '#999999' : '#666666',
    borderColor: isDarkTheme ? '#444444' : '#dddddd',
    cardBg: isDarkTheme ? '#333333' : '#f0f0f0',
    iconBorder: isDarkTheme ? '#444444' : '#dddddd',
    metaTextColor: isDarkTheme ? '#CCCCCC' : '#555555',
    requirementBg: isDarkTheme ? '#444444' : '#f0f0f0',
    requirementText: isDarkTheme ? '#FFFFFF' : '#444444',
  };

  const sendInstallAppFromStore = (identifier_code: string) => {
    if (installState === 'Install') {
      setInstallState('Installing...');
      console.log(`Installing app with identifier: ${identifier_code}`);

      // Simulate installation delay
      setTimeout(() => {
        setInstallState('Start'); // Mark as installed
      }, 3000); // 3-second delay
    } else if (installState === 'Start') {
      console.log(`Starting app with identifier: ${identifier_code}`);
    }
  };

  const navigateToReviews = () => {
    navigation.navigate('Reviews', { appId: app.identifier_code, appName: app.name });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Image 
        source={{ uri: app.icon_image_url }} 
        style={[styles.icon, { borderColor: theme.iconBorder }]} 
      />

      <Text style={[styles.appName, { color: theme.textColor }]}>{app.name}</Text>
      <Text style={[styles.packageName, { color: theme.subTextColor }]}>{app.packagename}</Text>

      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
          <Text style={[styles.rating, { color: theme.metaTextColor }]}>
            {app.rating.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons 
            name="download" 
            size={16} 
            color={isDarkTheme ? '#FFFFFF' : '#444444'} 
          />
          <Text style={[styles.downloads, { color: theme.metaTextColor }]}>
            {app.downloads.toLocaleString()} Downloads
          </Text>
        </View>
        <TouchableOpacity style={styles.reviewsIcon} onPress={navigateToReviews}>
          <MaterialCommunityIcons name="comment-text" size={24} color="#3a86ff" />
          <Text style={styles.reviewsText}>Reviews</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.description, { color: theme.subTextColor }]}>
        {app.description}
      </Text>

      {app.screenshots && app.screenshots.length > 0 && (
        <View style={styles.screenshotsContainer}>
          <Text style={[styles.sectionHeader, { color: theme.textColor }]}>
            Screenshots
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.screenshotsList}>
              {app.screenshots.map((screenshotUrl, index) => (
                <Image 
                  key={index} 
                  source={{ uri: screenshotUrl }} 
                  style={[styles.screenshot, { borderColor: theme.borderColor }]} 
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Requirements</Text>
      <View style={styles.requirementsGrid}>
        {app.requirements.map((requirement: string, index: number) => (
          <View 
            key={index} 
            style={[styles.requirementItem, { backgroundColor: theme.requirementBg }]}
          >
            <Text style={[styles.requirementText, { color: theme.requirementText }]}>
              {requirement}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.installButton,
          installState === 'Installing...' && styles.disabledButton,
        ]}
        onPress={() => sendInstallAppFromStore(app.identifier_code)}
        disabled={installState === 'Installing...'}
      >
        <Text style={styles.installButtonText}>{installState}</Text>
      </TouchableOpacity>
    </View>
  );
};



  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-start',
      padding: 10,
    },
    icon: {
      width: 100,
      height: 100,
      borderRadius: 28,
      marginBottom: 10,
      borderWidth: 2,
      alignSelf: 'center',
    },
    appName: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 5,
    },
    packageName: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
    },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewsIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  reviewsText: {
    fontSize: 14,
    color: '#3a86ff',
    marginLeft: 5,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginLeft: 5,
  },
  downloads: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginLeft: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  screenshotsContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  screenshotsList: {
    flexDirection: 'row',
    gap: 8,
  },
  screenshot: {
    width: 250,
    height: 150,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  requirementItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  requirementText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
  installButton: {
    width: '90%',
    paddingVertical: 12,
    backgroundColor: '#3a86ff',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignSelf: 'center',
  },
  installButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default AppDetails;
