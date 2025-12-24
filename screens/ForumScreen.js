// screens/ForumScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import Colors from '../constants/Colors';

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const ForumScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const auth = getAuth();

  const [loading, setLoading] = useState(true);
  const [currentGroup, setCurrentGroup] = useState(null);

  // Loader group-status HVER gang skærmen kommer i fokus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadGroup = async () => {
        try {
          const user = auth.currentUser;
          if (!user) {
            if (isActive) {
              setCurrentGroup(null);
              setLoading(false);
            }
            return;
          }

          const db = getDatabase();
          const userRef = ref(db, `users/${user.uid}`);
          const userSnap = await get(userRef);

          if (!userSnap.exists()) {
            if (isActive) {
              setCurrentGroup(null);
              setLoading(false);
            }
            return;
          }

          const userData = userSnap.val();
          const groupId = userData.currentGroupId;

          // hvis ingen currentGroupId → ingen aktiv gruppe
          if (!groupId) {
            if (isActive) {
              setCurrentGroup(null);
              setLoading(false);
            }
            return;
          }

          // hent selve gruppen
          const groupRef = ref(db, `groups/${groupId}`);
          const groupSnap = await get(groupRef);

          if (groupSnap.exists() && isActive) {
            setCurrentGroup({
              id: groupId,
              ...groupSnap.val(),
            });
          } else if (isActive) {
            setCurrentGroup(null);
          }

          if (isActive) setLoading(false);
        } catch (err) {
          console.log('Error loading group in ForumScreen:', err);
          if (isActive) {
            setCurrentGroup(null);
            setLoading(false);
          }
        }
      };

      setLoading(true);
      loadGroup();

      return () => {
        isActive = false;
      };
    }, [auth])
  );

  const handleOpenChat = () => {
    if (!currentGroup) {
      Alert.alert(
        'No group',
        'Join a Hotspot group from your profile to unlock the group chat.'
      );
      return;
    }

    navigation.navigate('Private messages', {
      groupId: currentGroup.id,
      groupName: currentGroup.name || 'Hotspot group',
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header med logo */}
      <View style={styles.headerContainer}>
        <Image
          source={require('../assets/hotspotflame.png')}
          style={styles.headerLogoImage}
        />
      </View>

      <View style={styles.contentWrapper}>
        {/* Gruppechat-kort */}
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.mutedText}>Loading your group…</Text>
          ) : currentGroup ? (
            <>
              <Text style={styles.sectionLabel}>Trip group chat</Text>
              <Text style={styles.groupName}>{currentGroup.name}</Text>
              <Text style={styles.groupMeta}>
                {currentGroup.city
                  ? `Destination: ${currentGroup.city}`
                  : 'Destination: TBA'}
              </Text>
              {currentGroup.startDate && currentGroup.endDate ? (
                <Text style={styles.groupMeta}>
                  {currentGroup.startDate} → {currentGroup.endDate}
                </Text>
              ) : null}

              <TouchableOpacity style={styles.primaryButton} onPress={handleOpenChat}>
                <Text style={styles.primaryButtonText}>Open group chat</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>No active group</Text>
              <Text style={styles.groupName}>You are not in a Hotspot group</Text>
              <Text style={styles.groupMeta}>
                Join a trip from your profile to unlock the group chat.
              </Text>
            </>
          )}
        </View>

        {/* Fremtidige direct messages */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Direct messages</Text>
          <Text style={styles.mutedText}>
            Private chats & friends will be added later.
          </Text>
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
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    paddingTop: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  headerLogoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 2,
  },
  groupMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  mutedText: {
    fontSize: 13,
    color: '#777',
  },
});

export default ForumScreen;