import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PairPuckScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pair your Puck</Text>
      <Text style={styles.subtitle}>
        AugmentOS runs all your favorite apps on the Puck, so you can use your
        smart glasses all day reliably, without draining your phone's battery.
      </Text>

      <View style={styles.guideContainer}>
        <Text style={styles.guideTitle}>Pairing guide</Text>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>1.</Text>
          <Text style={styles.stepText}>
            Hold the pairing button on the right side of your puck until the
            light starts flashing blue.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>2.</Text>
          <Text style={styles.stepText}>
            Accept any popups that ask you to pair with the Puck.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>3.</Text>
          <Text style={styles.stepText}>
            You’ll be automatically taken back to AugmentOS once the pairing is
            complete!
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.linkContainer}>
        <Text style={styles.linkText}>
          Are you a developer? Enable simulated Puck.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 32,
  },
  guideContainer: {
    width: '100%',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  stepText: {
    fontSize: 16,
    color: '#444',
    flex: 1,
  },
  linkContainer: {
    marginTop: 32,
  },
  linkText: {
    fontSize: 16,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
});

export default PairPuckScreen;
