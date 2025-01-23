import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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

const AppItem = memo(({ item, index, theme, onPress }: AppItemProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.borderColor,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.iconImageUrl }} style={styles.icon} />
        <View style={styles.cardContent}>
          <Text style={[styles.appName, { color: theme.textColor }]}>
            {item.name}
          </Text>
          <Text
            style={[styles.description, { color: theme.subTextColor }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          {/*<View style={styles.badges}>*/}
          {/*  <View style={styles.badge}>*/}
          {/*    <MaterialCommunityIcons*/}
          {/*      name="star"*/}
          {/*      size={16}*/}
          {/*      color="#FFD700"*/}
          {/*    />*/}
          {/*    <Text*/}
          {/*      style={[styles.ratingBadge, { color: theme.textColor }]}*/}
          {/*    >*/}
          {/*      {item.rating.toFixed(1)}*/}
          {/*    </Text>*/}
          {/*  </View>*/}
          {/*  <View style={styles.badge}>*/}
          {/*    <MaterialCommunityIcons*/}
          {/*      name="download"*/}
          {/*      size={16}*/}
          {/*      color={theme.textColor}*/}
          {/*    />*/}
          {/*    <Text*/}
          {/*      style={[styles.downloadBadge, { color: theme.textColor }]}*/}
          {/*    >*/}
          {/*      {item.downloads.toLocaleString()} downloads*/}
          {/*    </Text>*/}
          {/*  </View>*/}
          {/*</View>*/}
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    // Optional: Add any container styles if needed
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    // Removed backgroundColor and borderColor as they are set via props
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
    fontFamily: 'Montserrat-Bold',
    // color is set via props
  },
  description: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
    // color is set via props
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
    marginLeft: 4,
    fontFamily: 'Montserrat-Medium',
    // color is set via props
  },
  downloadBadge: {
    fontSize: 12,
    fontFamily: 'Montserrat-Medium',
    // color is set via props
  },
});

export default AppItem;
