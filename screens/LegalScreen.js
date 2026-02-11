import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const LegalScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Legal & policies</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.text}>
            This is a placeholder. Hotspot will add a full privacy policy before launch.
            It should describe what data is collected, why, how long it is stored, and how users can delete their account.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.text}>
            This is a placeholder. Hotspot will add terms before launch, including acceptable use, liability, and account rules.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Community Guidelines</Text>
          <Text style={styles.text}>
            Be respectful. No harassment, hate, threats, illegal content, or spam.
            Content may be removed and accounts may be restricted if guidelines are violated.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  backButton: {
    width: 70,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  headerRightSpacer: {
    width: 70,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
});

export default LegalScreen;