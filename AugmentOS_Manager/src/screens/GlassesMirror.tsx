import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient'; // Import LinearGradient
import Icon from 'react-native-vector-icons/FontAwesome';
import NavigationBar from '../components/NavigationBar.tsx';

interface Card {
  id: number;
  name: string;
  content: string;
}

interface GlassesMirrorProps {
  isDarkTheme: boolean;
}

const GlassesMirror: React.FC<GlassesMirrorProps> = ({ isDarkTheme }) => {
  const [cards] = useState<Card[]>([
    { id: 1, name: 'Convoscope', content: 'Last 10 minutes of conversation displayed with highlights on key phrases.' },
    { id: 2, name: 'ADHD Assist', content: 'Reminder to take a 10-minute break. Stretch and reset your focus.' },
    { id: 3, name: 'Translator', content: 'Currently translating your conversation from English to French in real-time.' },
    { id: 4, name: 'WeatherLens', content: 'Local forecast: Sunny, high of 75°F. Minimal rain expected today.' },
    { id: 5, name: 'Health Tracker', content: 'You’ve been sitting for over 45 minutes. Time to stand up and stretch!' },
    { id: 6, name: 'Convoscope', content: 'Important conversations saved. Topics flagged for easy navigation.' },
    { id: 7, name: 'Mindful Moments', content: 'Guided breathing exercise: inhale for 4 seconds, exhale for 6 seconds.' },
    { id: 8, name: 'Workout Buddy', content: 'Next exercise: 15 push-ups. Keep up the good work!' },
    { id: 10, name: 'Convoscope', content: 'Last 10 minutes of conversation displayed with highlights on key phrases.' },
    { id: 21, name: 'ADHD Assist', content: 'Reminder to take a 10-minute break. Stretch and reset your focus.' },
    { id: 32, name: 'Translator', content: 'Currently translating your conversation from English to French in real-time.' },
    { id: 43, name: 'WeatherLens', content: 'Local forecast: Sunny, high of 75°F. Minimal rain expected today.' },
    { id: 54, name: 'Health Tracker', content: 'You’ve been sitting for over 45 minutes. Time to stand up and stretch!' },
    { id: 65, name: 'Convoscope', content: 'Important conversations saved. Topics flagged for easy navigation.' },
    { id: 76, name: 'Mindful Moments', content: 'Guided breathing exercise: inhale for 4 seconds, exhale for 6 seconds.' },
    { id: 87, name: 'Workout Buddy', content: 'Next exercise: 15 push-ups. Keep up the good work!' },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, []);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    setShowScrollDownButton(!isAtBottom);
  };

  const handleScrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const getAppColor = (name: string) => {
    switch (name) {
      case 'Convoscope':
        return '#4A90E2'; // Blue
      case 'ADHD Assist':
        return '#FF7F50'; // Coral
      case 'Translator':
        return '#FFD700'; // Gold
      case 'WeatherLens':
        return '#87CEEB'; // Sky Blue
      case 'Health Tracker':
        return '#32CD32'; // Lime Green
      case 'Mindful Moments':
        return '#FF69B4'; // Hot Pink
      case 'Workout Buddy':
        return '#FF4500'; // Orange Red
      default:
        return '#CCCCCC'; // Gray for unknown apps
    }
  };

  return (
    <View style={[styles.container, isDarkTheme ? styles.darkContainer : styles.lightContainer]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, isDarkTheme ? styles.darkText : styles.lightText]}>AugmentOS Glasses Mirror</Text>
      </View>

      {/* Mirrored Screen Area */}
      <View style={styles.mirrorArea}>
        <View style={styles.indicatorContainer}>
          {cards.map((card, index) => (
            <TouchableOpacity key={card.id} onPress={() => scrollViewRef.current?.scrollTo({ y: index * 100, animated: true })}>
              <View style={[styles.indicatorBox, { backgroundColor: getAppColor(card.name) }]} />
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {cards.map((card, index) => {
            const cardColor = getAppColor(card.name);
            const isLastCard = index === cards.length - 1;
            return isLastCard ? (
                <LinearGradient
                    key={card.id}
                    colors={isDarkTheme ? ['#1a2b3c', '#3d5266'] : ['#a1c4fd', '#c2e9fb']}
                    style={[styles.card, styles.lastCardFocused]}>
             <View style={[styles.cardHeader, { backgroundColor: cardColor }]}>
                  <Text style={[styles.cardName, isDarkTheme ? styles.darkText : styles.lightText]}>{card.name}</Text>
                </View>
                <Text style={[styles.cardContent, isDarkTheme ? styles.darkText : styles.lightText]}>{card.content}</Text>
              </LinearGradient>
            ) : (
              <View
                key={card.id}
                style={[
                  styles.card,
                  isDarkTheme ? styles.cardDark : styles.cardLight,
                  { borderColor: cardColor, shadowColor: cardColor },
                ]}
              >
                <View style={[styles.cardHeader, { backgroundColor: cardColor }]}>
                  <Text style={[styles.cardName, isDarkTheme ? styles.darkText : styles.lightText]}>{card.name}</Text>
                </View>
                <Text style={[styles.cardContent, isDarkTheme ? styles.darkText : styles.lightText]}>{card.content}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Scroll Down Button */}
      {showScrollDownButton && (
        <TouchableOpacity style={styles.focusedScrollDownButton} onPress={handleScrollToBottom}>
          <Icon name="arrow-down" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Navigation Bar */}
      <NavigationBar isDarkTheme={isDarkTheme} toggleTheme={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  lightContainer: {
    backgroundColor: '#f8f9fa',
  },
  titleContainer: {
    paddingBottom: 10,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
    color: '#4A90E2',
  },
  darkText: {
    color: '#ffffff',
  },
  lightText: {
    color: '#000000',
  },
  mirrorArea: {
    flex: 1,
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    opacity: 0.8,
  },
  indicatorContainer: {
    width: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  indicatorBox: {
    width: 10,
    height: 45,
    borderRadius: 5,
    marginVertical: 2,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  card: {
    height: 180,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  cardLight: {
    backgroundColor: '#ffffff',
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  lastCardFocused: {
    borderWidth: 3,
    height: 200,
    borderRadius: 0 },
  cardHeader: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  cardContent: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    padding: 16,
    textAlign: 'left',
  },
  focusedScrollDownButton: {
    position: 'absolute',
    bottom: 75,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 15,
  },
});

export default GlassesMirror;
