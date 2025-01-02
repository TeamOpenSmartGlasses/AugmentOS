// GlassesPairingGuides.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
        1. Make sure your G1 smart glasses are fully charged.
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        2. Disconnect your G1 from within the Even Realities app
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        3. Place your G1 in the charging case with the lid open.
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        4. G1 may prompt your device twice to pair with your device. If this happens, select "pair" both times.
      </Text>
      <Text style={[styles.guideStep, { color: textColor }]}>
        4. On your device, confirm the G1 appears in the Bluetooth list, then tap to connect and follow any on-screen prompts.
      </Text>
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
    marginBottom: 6,
  },
});
