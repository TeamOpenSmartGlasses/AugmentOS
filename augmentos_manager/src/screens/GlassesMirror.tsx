import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import NavigationBar from '../components/NavigationBar.tsx';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MOCK_CONNECTION } from '../consts.tsx';
import GlobalEventEmitter from '../logic/GlobalEventEmitter.tsx';
import { useStatus } from '../providers/AugmentOSStatusProvider.tsx';
import { useGlassesMirror } from '../providers/GlassesMirrorContext.tsx';

interface GlassesMirrorProps {
  isDarkTheme: boolean;
}

const GlassesMirror: React.FC<GlassesMirrorProps> = ({isDarkTheme}) => {
  // State to hold the list of display events
  const [displayEvents, setDisplayEvents] = useState<any[]>([]);
  const { status } = useStatus();
  const { events } = useGlassesMirror(); // <-- from context

  // Helper to check if we have a glasses model name
  const isGlassesConnected = !!status.glasses_info?.model_name;

  return (
    <View
      style={[
        styles.container,
        isDarkTheme ? styles.darkContainer : styles.lightContainer,
      ]}
    >
      <View
        style={[
          styles.titleContainer,
          isDarkTheme ? styles.titleContainerDark : styles.titleContainerLight,
        ]}
      >
        <Text
          style={[
            styles.title,
            isDarkTheme ? styles.titleTextDark : styles.titleTextLight,
          ]}
        >
          Glasses Mirror
        </Text>
      </View>

      {/* 
        If the glasses are connected, show the events.
        Otherwise, show a simple fallback message.
      */}
      {isGlassesConnected ? (
        <ScrollView style={styles.contentContainer}>
        {events.map((evt, idx) => {
          const { layout } = evt;
          if (!layout || !layout.layoutType) {
            return (
              <View key={idx} style={[styles.card, isDarkTheme ? styles.cardDark : styles.cardLight]}>
                <Text style={isDarkTheme ? styles.darkText : styles.lightText}>
                  Unknown layout data
                </Text>
              </View>
            );
          }

          return (
            <View key={idx} style={[styles.card, isDarkTheme ? styles.cardDark : styles.cardLight]}>
              {renderLayout(layout, isDarkTheme)}
            </View>
          );
        })}
      </ScrollView>
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={[isDarkTheme ? styles.darkText : styles.lightText, styles.fallbackText]}>
            Connect glasses to use the Glasses Mirror
          </Text>
        </View>
      )}

      <NavigationBar isDarkTheme={isDarkTheme} toggleTheme={() => {}} />
    </View>
  );
};

/**
 *  Render logic for each layoutType
 */
function renderLayout(layout: any, isDarkTheme: boolean) {
  const textStyle = isDarkTheme ? styles.darkText : styles.lightText;

  switch (layout.layoutType) {
    case 'reference_card': {
      const { title, text } = layout;
      return (
        <>
          <Text style={[styles.cardTitle, textStyle]}>{title}</Text>
          <Text style={[styles.cardContent, textStyle]}>{text}</Text>
        </>
      );
    }
    case 'text_wall':
    case 'text_line': {
      const { text } = layout;
      return (
        <Text style={[styles.cardContent, textStyle]}>{text}</Text>
      );
    }
    case 'double_text_wall': {
      const { topText, bottomText } = layout;
      return (
        <>
          <Text style={[styles.cardContent, textStyle]}>{topText}</Text>
          <Text style={[styles.cardContent, textStyle]}>{bottomText}</Text>
        </>
      );
    }
    case 'text_rows': {
      // layout.text is presumably an array of strings
      const rows = layout.text || [];
      return rows.map((row: string, index: number) => (
        <Text key={index} style={[styles.cardContent, textStyle]}>
          {row}
        </Text>
      ));
    }
    case 'bitmap': {
      // layout.data is a base64 string. We can show an image in RN by creating a data URL
      // e.g. { uri: "data:image/png;base64,<base64string>" }
      const { data } = layout;
      const imageUri = `data:image/png;base64,${data}`;
      return (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 200, height: 200, resizeMode: 'contain' }}
        />
      );
    }
    default:
      return (
        <Text style={[styles.cardContent, textStyle]}>
          Unknown layout type: {layout.layoutType}
        </Text>
      );
  }
}

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
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 10,
  },
  titleContainerDark: {
    backgroundColor: '#333333',
  },
  titleContainerLight: {
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'left',
    marginBottom: 5,
  },
  titleTextDark: {
    color: '#ffffff',
    fontFamily: 'Montserrat-Bold',
  },
  titleTextLight: {
    color: '#000000',
    fontFamily: 'Montserrat-Bold',
  },
  darkText: {
    color: '#ffffff',
    fontFamily: 'Montserrat-Regular',
  },
  lightText: {
    color: '#000000',
    fontFamily: 'Montserrat-Regular',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
    marginBottom: 0,
  },
  card: {
    marginVertical: 10,
    borderRadius: 10,
    padding: 10,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
    borderColor: '#444',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 5,
  },
  cardContent: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },

  // Fallback
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
});

export default GlassesMirror;
