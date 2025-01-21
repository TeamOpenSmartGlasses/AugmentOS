import React, { useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { AppStoreItem } from '../types';

interface AppItemProps {
  item: AppStoreItem;
  index: number;
  theme: {
    cardBg: string;
    borderColor: string;
    textColor: string;
    subTextColor: string;
  };
  onPress: () => void;
}

const useItemAnimation = (index: number) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useFocusEffect(
    React.useCallback(() => {
      translateY.setValue(50);
      opacity.setValue(0);
      scale.setValue(0.9);

      const animation = Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 25,  // Reduced from 35 to make it slower
          friction: 8,  // Increased from 7 to make it more smooth
          delay: index * 150, // Increased delay between items
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,  // Increased from 400
          delay: index * 150, // Matching delay with translateY
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 25,  // Reduced from 35
          friction: 8,  // Increased from 7
          delay: index * 150, // Matching delay with other animations
        }),
      ]);

      animation.start();

      return () => animation.stop();
    }, [index, opacity, scale, translateY])
  );

  return { translateY, opacity, scale };
};

const AppItem = memo(({ item, index, theme, onPress }: AppItemProps) => {
  const { translateY, opacity } = useItemAnimation(index);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        zIndex: -index,
      }}
    >
      <TouchableOpacity
        style={[styles.card, {
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
        }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.iconImageUrl }} style={styles.icon} />
        <View style={styles.cardContent}>
          <Text style={[styles.appName, { color: theme.textColor }]}>{item.name}</Text>
          <Text style={[styles.description, { color: theme.subTextColor }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={[styles.ratingBadge, { color: theme.textColor }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name="download"
                size={16}
                color={theme.textColor}
              />
              <Text style={[styles.downloadBadge, { color: theme.textColor }]}>
                {item.downloads.toLocaleString()} downloads
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  cardContent: {
    flex: 1,
  },
  appName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },
  badges: {
    flexDirection: 'row',
    marginTop: 5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  ratingBadge: {
    fontSize: 12,
    color: '#444',
    marginLeft: 4,
    fontFamily: 'Montserrat-Medium',
  },
  downloadBadge: {
    fontSize: 12,
    color: '#444',
    fontFamily: 'Montserrat-Medium',
  },
});

export default AppItem;
