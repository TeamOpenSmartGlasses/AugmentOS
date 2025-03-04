// GlassesPairingGuides.tsx

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

// 1) Create an interface for the props
interface GlassesPairingGuideProps {
  isDarkTheme: boolean;
}

// 2) Declare each guide component with the correct prop type
export const EvenRealitiesG1PairingGuide: React.FC<GlassesPairingGuideProps> = ({
  isDarkTheme,
}) => {
  const textColor = isDarkTheme ? 'white' : 'black';

  return (
    <View style={styles.guideContainer}>
      <Text style={[styles.guideTitle, { color: textColor }]}>
        Even Realities G1 Pairing Instructions
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        1. Disconnect your G1 from within the Even Realities app, or uninstall the Even Realities app
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        2. Place your G1 in the charging case with the lid open.
      </Text>

      <Image source={require('../assets/guide/image_g1_pair.png')} style={styles.guideImage} />
    </View>
  );
};

export const VuzixZ100PairingGuide: React.FC<GlassesPairingGuideProps> = ({
  isDarkTheme,
}) => {
  const textColor = isDarkTheme ? 'white' : 'black';

  return (
    <View style={styles.guideContainer}>
      <Text style={[styles.guideTitle, { color: textColor }]}>
        Vuzix Z100 Pairing Instructions
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        1. Make sure your Z100 is fully charged and turned on.
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        2. Pair your Z100 with your device using the Vuzix Connect app.
      </Text>
    </View>
  );
};

export const MentraLivePairingGuide: React.FC<GlassesPairingGuideProps> = ({
  isDarkTheme,
}) => {
  const textColor = isDarkTheme ? 'white' : 'black';

  return (
    <View style={styles.guideContainer}>
      <Text style={[styles.guideTitle, { color: textColor }]}>
        Mentra Live Pairing Instructions
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        1. Make sure your Mentra Live is fully charged and turned on.
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        2. TBD
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        3. TBD
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  guideContainer: {
    marginTop: 20,
    width: '90%',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  guideStep: {
    fontSize: 16,
    marginBottom: 8,
  },
  guideImage: {
    width: '100%',
    height: 200, // Adjust height as needed
    resizeMode: 'contain',
    marginVertical: 10,
  },
});
