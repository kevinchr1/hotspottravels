import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import Colors from '../constants/Colors';
import KeyboardScreen from '../components/KeyboardScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ProfileScreen viser brugerens profilinformation og hurtige handlinger.
 * Skærmen viser basis info om brugeren, en sektion til Hotspot grupper
 * (kun UI for nu) samt forskellige quick actions som fx logout.
 */

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase auth bruger
  const [profileData, setProfileData] = useState(null);   // Data fra Realtime Database (username mm.)
  const [groupCode, setGroupCode] = useState('');         // Input til group code (kun UI for nu)
  const auth = getAuth();

  // Hent bruger og profil-data
  useEffect(() => {
    const user = auth.currentUser;
    setFirebaseUser(user);

    if (user) {
      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);

      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            setProfileData(snapshot.val());
          }
        })
        .catch((error) => {
          console.log("Error fetching user profile:", error);
        });
    }
  }, []);

  // Udled visningsnavn og initial
  const displayName = profileData?.username || firebaseUser?.email?.split('@')[0] || 'Traveler';
  const email = firebaseUser?.email || 'No email';
  const initial = displayName.charAt(0).toUpperCase();

  // Dummy handler til join group (kun demo for nu)
  const handleJoinGroup = () => {
    Alert.alert(
      "Coming soon",
      "Group join functionality will be added later. For now this is just a demo of the UI."
    );
  };

  // Logout funktion
  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardScreen contentContainerStyle={[styles.container, { paddingTop: insets.top + -10 }]}>
      {/* Logo øverst */}
      <View style={styles.logoWrapper}>
        <Image 
          source={require('../assets/hotspotflame.png')} 
          style={styles.logoImage} 
        />
      </View>

      {/* Profilkort */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileTextWrapper}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>
      </View>

      {/* Hotspot group sektion (UI klar til logik senere) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Hotspot group</Text>
        <Text style={styles.mutedText}>
          You are not part of a Hotspot group right now.
        </Text>

        {/* Demo preview på hvordan en aktiv gruppe kan se ud */}
        <View style={styles.demoGroupBox}>
          <Text style={styles.demoGroupTitle}>Example group</Text>
          <Text style={styles.demoGroupName}>Barcelona Trip 2025</Text>
          <Text style={styles.demoGroupMeta}>3 days left · 24 travelers</Text>
        </View>

        <Text style={styles.label}>Enter group code</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g. BCN2025"
          value={groupCode}
          onChangeText={setGroupCode}
          autoCapitalize="characters"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleJoinGroup}>
          <Text style={styles.primaryButtonText}>Join group</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          This is only a visual demo. The actual group join logic will be added later.
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickActionButton 
            label="Edit profile" 
            onPress={() => Alert.alert("Coming soon", "Profile editing will be added later.")} 
          />
          <QuickActionButton 
            label="Notifications" 
            onPress={() => Alert.alert("Coming soon", "Notification settings will be added later.")} 
          />
        </View>
        <View style={styles.quickActionsRow}>
          <QuickActionButton 
            label="App settings" 
            onPress={() => Alert.alert("Coming soon", "Settings will be added later.")} 
          />
          <QuickActionButton 
            label="Privacy" 
            onPress={() => Alert.alert("Coming soon", "Privacy options will be added later.")} 
          />
        </View>
      </View>

      {/* Logout-knap */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </KeyboardScreen>
  );
};

/**
 * QuickActionButton er en lille genbrugskomponent til knapperne
 * i "Quick actions" sektionen.
 */
const QuickActionButton = ({ label, onPress }) => {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );
};

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.primary,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logoImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileTextWrapper: {
    marginLeft: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NAVY,
  },
  email: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    marginBottom: 8,
  },
  mutedText: {
    fontSize: 13,
    color: '#777',
    marginBottom: 12,
  },
  demoGroupBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  demoGroupTitle: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  demoGroupName: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
    marginTop: 2,
  },
  demoGroupMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    color: NAVY,
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  logoutButtonText: {
    color: '#D33',
    fontWeight: '600',
  },
});

export default ProfileScreen;