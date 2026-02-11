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
import { getDatabase, ref, get, update } from 'firebase/database';
import Colors from '../constants/Colors';
import KeyboardScreen from '../components/KeyboardScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ProfileScreen viser brugerens profilinformation og gruppestatus.
 * Brugeren kan:
 * - se basis info
 * - join'e en gruppe med en kode
 * - forlade en gruppe (leave group)
 * - gå til EditProfile, osv.
 */

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [groupCode, setGroupCode] = useState('');
  const [currentGroup, setCurrentGroup] = useState(null);  // data for den gruppe brugeren er i
  const auth = getAuth();

  // Hent bruger + profil + nuværende gruppe
  useEffect(() => {
    const user = auth.currentUser;
    setFirebaseUser(user);
  
    if (!user) return;
  
    const fetchData = async () => {
      try {
        const db = getDatabase();
        const userRef = ref(db, `users/${user.uid}`);
        const userSnap = await get(userRef);
  
        if (userSnap.exists()) {
          const userData = userSnap.val();
          setProfileData(userData);
  
          // Hvis brugeren har en currentGroupId, hent selve gruppen
          if (userData.currentGroupId) {
            const groupRef = ref(db, `groups/${userData.currentGroupId}`);
            const groupSnap = await get(groupRef);
  
            if (groupSnap.exists()) {
              setCurrentGroup({
                id: userData.currentGroupId,
                ...groupSnap.val(),
              });
            }
          }
        }
      } catch (error) {
        console.log("Error fetching user profile or group:", error);
      }
    };
  
    fetchData();
  }, []);

  // Udled visningsnavn, email og evt. profilbillede
  const displayName =
    profileData?.username || firebaseUser?.email?.split('@')[0] || 'Traveler';
  const email = firebaseUser?.email || 'No email';
  const initial = displayName.charAt(0).toUpperCase();
  const photoURL = profileData?.photoURL || firebaseUser?.photoURL || null;

  // Join group med kode
  const handleJoinGroup = async () => {
    const user = auth.currentUser;
  
    if (!user) {
      Alert.alert("Not logged in", "You need to be logged in to join a group.");
      return;
    }
  
    const code = groupCode.trim().toUpperCase(); // fx "TEST123"
  
    if (!code) {
      Alert.alert("Missing code", "Please enter a group code.");
      return;
    }
  
    try {
      const db = getDatabase();
  
      // 1) slå koden op i groupCodes
      const codeRef = ref(db, 'groupCodes/' + code);
      const codeSnap = await get(codeRef);
  
      if (!codeSnap.exists()) {
        Alert.alert("Invalid code", "We couldn't find a group with that code.");
        return;
      }
  
      const { groupId } = codeSnap.val() || {};
  
      if (!groupId) {
        Alert.alert("Error", "This code is not linked to any group.");
        return;
      }
  
      const uid = user.uid;
      const now = Date.now();
  
      // 2) forbered multi-update (skriver flere steder på én gang)
      const updates = {};
  
      // Brugeren som medlem af gruppen
      updates[`groupMembers/${groupId}/${uid}`] = {
        role: "member",
        joinedAt: now,
      };
  
      // Gruppe på brugerens historik
      updates[`userGroups/${uid}/${groupId}`] = {
        role: "member",
        status: "active",
        joinedAt: now,
      };
  
      // Current group på user-profilen
      updates[`users/${uid}/currentGroupId`] = groupId;
  
      // 3) skriv alt på én gang
      await update(ref(db), updates);

      // 4) hent gruppen med det samme og opdater UI
      const groupRef = ref(db, 'groups/' + groupId);
      const groupSnap = await get(groupRef);
      if (groupSnap.exists()) {
        setCurrentGroup({
          id: groupId,
          ...groupSnap.val(),
        });
      }

      // 5) ryd feltet
      setGroupCode('');

      Alert.alert("Joined", "You have joined the group!");
    } catch (error) {
      console.log("handleJoinGroup error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // Leave group med bekræftelse
  const handleLeaveGroup = () => {
    const user = auth.currentUser;

    if (!user || !currentGroup) {
      Alert.alert("Error", "You are not in a group.");
      return;
    }

    Alert.alert(
      "Leave group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const db = getDatabase();
              const uid = user.uid;
              const groupId = currentGroup.id;

              const updates = {};

              // Fjern bruger som medlem af gruppen
              updates[`groupMembers/${groupId}/${uid}`] = null;

              // Marker brugerens historik som “left”
              updates[`userGroups/${uid}/${groupId}`] = {
                role: "member",
                status: "left",
                leftAt: Date.now(),
              };

              // Fjern current group på brugerens profil
              updates[`users/${uid}/currentGroupId`] = null;

              await update(ref(db), updates);

              // Nulstil UI
              setCurrentGroup(null);
              setGroupCode('');
              setProfileData((prev) =>
                prev ? { ...prev, currentGroupId: null } : prev
              );

              Alert.alert("Left group", "You have left this group.");
            } catch (error) {
              console.log("Leave group error:", error);
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardScreen contentContainerStyle={[styles.container, { paddingTop: insets.top - 10 }]}>
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
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.profileTextWrapper}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>
      </View>

      {/* Hotspot group sektion */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Hotspot group</Text>

        {currentGroup ? (
          <>
            <Text style={styles.mutedText}>
              You’re currently in:
            </Text>

            <View style={styles.demoGroupBox}>
              <Text style={styles.demoGroupTitle}>
                {currentGroup.city || "Destination"}
              </Text>
              <Text style={styles.demoGroupName}>
                {currentGroup.name || "Hotspot trip"}
              </Text>
              <Text style={styles.demoGroupMeta}>
                {currentGroup.startDate && currentGroup.endDate
                  ? `${currentGroup.startDate} → ${currentGroup.endDate}`
                  : "Dates to be announced"}
              </Text>
            </View>

            {/* Leave group-knap */}
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#D9534F' }]} 
              onPress={handleLeaveGroup}
            >
              <Text style={styles.primaryButtonText}>Leave group</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.mutedText}>
              You are not part of a Hotspot group right now.
            </Text>

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
              Enter the code you received from your Hotspot trip organizer to join your group.
            </Text>
          </>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickActionButton 
            label="Edit profile" 
            onPress={() => navigation.navigate('EditProfile')} 
          />
        </View>
        <View style={styles.quickActionsRow}>
          <QuickActionButton 
            label="Settings" 
            onPress={() => navigation.navigate('Settings')} 
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
 * Lille genbrugskomponent til quick actions knapperne
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
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 10,
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
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#D33',
    fontWeight: '600',
  },
});

export default ProfileScreen;