import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,

  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, AppStoreItem } from '../components/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type AppDetailsProps = NativeStackScreenProps<RootStackParamList, 'AppDetails'> & {
  isDarkTheme: boolean;
};

const AppDetails: React.FC<AppDetailsProps> = ({ route, navigation, isDarkTheme }) => {
  const { app } = route.params as { app: AppStoreItem };
  const [installState, setInstallState] = useState<'Install' | 'Installing...' | 'Start'>('Install');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const screenshotScrollAnim = useRef(new Animated.Value(0)).current;

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

  // Animation sequence
  useEffect(() => {
    const animationSequence = Animated.parallel([
      // Fade in everything
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      // Slide up elements
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      // Scale up elements
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      // Rotate icon
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      // Scroll animation for screenshots
      Animated.timing(screenshotScrollAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
    ]);

    animationSequence.start();
  }, [fadeAnim, rotateAnim, scaleAnim, screenshotScrollAnim, slideAnim]);

  // Button press animation
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const sendInstallAppFromStore = (identifier_code: string) => {
    animateButtonPress();
    if (installState === 'Install') {
      setInstallState('Installing...');
      console.log(`Installing app with identifier: ${identifier_code}`);

      setTimeout(() => {
        setInstallState('Start');
      }, 3000);
    } else if (installState === 'Start') {
      console.log(`Starting app with identifier: ${identifier_code}`);
    }
  };

  const navigateToReviews = () => {
    navigation.navigate('Reviews', { appId: app.identifier_code, appName: app.name });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Animated.View style={[
        styles.contentContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}>
        <Animated.Image
          source={{ uri: app.icon_image_url }}
          style={[
            styles.icon,
            {
              borderColor: theme.iconBorder,
              transform: [{ rotate: spin }],
            },
          ]}
        />

        <Animated.Text style={[
          styles.appName,
          { color: theme.textColor },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          {app.name}
        </Animated.Text>

        <Animated.Text style={[
          styles.packageName,
          { color: theme.subTextColor },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          {app.packagename}
        </Animated.Text>

        <Animated.View style={[
          styles.metaContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
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
        </Animated.View>

        <Animated.Text style={[
          styles.description,
          { color: theme.subTextColor },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          {app.description}
        </Animated.Text>

        {app.screenshots && app.screenshots.length > 0 && (
          <Animated.View style={[
            styles.screenshotsContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateX: screenshotScrollAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                })},
              ],
            },
          ]}>
            <Text style={[styles.sectionHeader, { color: theme.textColor }]}>
              Screenshots
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.screenshotsList}>
                {app.screenshots.map((screenshotUrl, index) => (
                  <Animated.Image
                    key={index}
                    source={{ uri: screenshotUrl }}
                    style={[
                      styles.screenshot,
                      { borderColor: theme.borderColor },
                      {
                        opacity: fadeAnim,
                        transform: [
                          { scale: scaleAnim },
                          { translateX: screenshotScrollAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50 * (index + 1), 0],
                          })},
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Requirements</Text>
        <View style={styles.requirementsGrid}>
          {app.requirements.map((requirement: string, index: number) => (
            <Animated.View
              key={index}
              style={[
                styles.requirementItem,
                { backgroundColor: theme.requirementBg },
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: slideAnim },
                  ],
                },
              ]}
            >
              <Text style={[styles.requirementText, { color: theme.requirementText }]}>
                {requirement}
              </Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={[
          styles.buttonContainer,
          {
            transform: [{ scale: buttonScaleAnim }],
            opacity: fadeAnim,
          },
        ]}>
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
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
    alignItems: 'center',
  },

  buttonContainer: {
    width: '100%',
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
    width: '100%',
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
