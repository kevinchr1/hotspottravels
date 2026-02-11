import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const SUPPORT_EMAIL = 'support@hotspot.com';

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // MVP: vi gemmer ikke toggle i DB endnu — kun UI.
  // Senere kan du gemme det i users/{uid}/settings/...
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const appVersionText = useMemo(() => {
    // Hvis du vil vise rigtig version senere:
    // - expo-constants (Constants.expoConfig.version)
    // Men for MVP: fast tekst
    return '1.0.0';
  }, []);

  const openSupportEmail = async () => {
    const subject = encodeURIComponent('Hotspot Support');
    const body = encodeURIComponent(
      `Hi Hotspot team,\n\nI need help with:\n\n(Describe the issue here)\n\nThanks!`
    );

    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (!canOpen) {
        Alert.alert('Unable to open email', `Please email us at ${SUPPORT_EMAIL}`);
        return;
      }
      await Linking.openURL(mailtoUrl);
    } catch (e) {
      Alert.alert('Error', `Please email us at ${SUPPORT_EMAIL}`);
    }
  };

  const openDeviceNotificationSettings = async () => {
    // På iOS åbner app settings, på Android forsøger vi samme
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
        return;
      }
      // Android:
      await Linking.openSettings();
    } catch (e) {
      Alert.alert('Unable to open settings', 'Please open system settings manually.');
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('../assets/hotspotflame.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.content}>
        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Enable notifications</Text>
              <Text style={styles.rowSub}>
                Turn on/off notifications inside the app (MVP).
              </Text>
            </View>

            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E5E5', true: '#FFD79A' }}
              thumbColor={notificationsEnabled ? ORANGE : '#FFFFFF'}
            />
          </View>

          <TouchableOpacity style={styles.linkRow} onPress={openDeviceNotificationSettings}>
            <Text style={styles.linkRowText}>Open device notification settings</Text>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.linkRow} onPress={openSupportEmail}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Contact support</Text>
              <Text style={styles.rowSub}>{SUPPORT_EMAIL}</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>App version</Text>
              <Text style={styles.rowSub}>Build info for debugging.</Text>
            </View>
            <Text style={styles.valueText}>{appVersionText}</Text>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Legal')}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Legal & policies</Text>
              <Text style={styles.rowSub}>Privacy Policy, Terms, Community Guidelines.</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingVertical: 6,
    paddingRight: 8,
    width: 70,
  },
  backText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  headerTitle: {
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  linkRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  linkRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: ORANGE,
  },
  chevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '700',
  },
});

export default SettingsScreen;