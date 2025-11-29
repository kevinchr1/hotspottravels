import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

/**
 * ForumScreen fungerer nu som en chat-oversigt.
 * Den viser den aktuelle gruppechat øverst og tidligere grupper nedenunder
 * i en klassisk chat-liste-stil.
 */

const ForumScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // På sigt skal disse data komme fra backend (fx userGroups i Firebase)
  const [currentGroup] = useState({
    id: 'group-barcelona-2025',
    name: 'Barcelona Getaway 2025',
    dateRange: '12–16 May 2025',
    members: 23,
    lastMessagePreview: 'See you all at the beach bar tonight.',
    lastMessageTime: '20:31',
    unreadCount: 3,
  });

  const [pastGroups] = useState([
    {
      id: 'group-madrid-2024',
      name: 'Madrid Spring 2024',
      dateRange: '3–7 April 2024',
      members: 18,
      lastMessagePreview: 'Thanks for an amazing trip everyone.',
      lastMessageTime: 'Apr 09',
    },
    {
      id: 'group-krakow-2023',
      name: 'Krakow Study Tour 2023',
      dateRange: '10–14 March 2023',
      members: 30,
      lastMessagePreview: 'Remember to share your photos here.',
      lastMessageTime: 'Mar 15',
    },
  ]);

  const isInGroup = !!currentGroup; // på sigt styres af rigtig gruppelogik

  const openGroupChat = (group) => {
    navigation.navigate('Private messages', {
      groupId: group.id,
      groupName: group.name,
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  return (
    <View style={styles.screen}>
      {/* Header med logo og orange linje */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLogo}>
          <Image
            source={require('../assets/hotspotflame.png')}
            style={styles.headerLogoImage}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentWrapper}
      >
        <Text style={styles.pageTitle}>Chats</Text>

        {/* Aktuel gruppechat */}
        <View style={styles.section}>
          {isInGroup ? (
            <>
              <Text style={styles.sectionLabel}>Active group</Text>
              <TouchableOpacity
                style={[styles.chatRow, styles.activeChatRow]}
                onPress={() => openGroupChat(currentGroup)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(currentGroup.name)}
                  </Text>
                </View>

                <View style={styles.chatTextWrapper}>
                  <View style={styles.chatTopRow}>
                    <Text style={styles.chatName} numberOfLines={1}>
                      {currentGroup.name}
                    </Text>
                    <Text style={styles.chatTime}>{currentGroup.lastMessageTime}</Text>
                  </View>

                  <View style={styles.chatMetaRow}>
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {currentGroup.lastMessagePreview}
                    </Text>
                  </View>

                  <View style={styles.chatBottomRow}>
                    <Text style={styles.chatSubMeta}>
                      {currentGroup.dateRange} · {currentGroup.members} travelers
                    </Text>

                    {currentGroup.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {currentGroup.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No active group chat</Text>
              <Text style={styles.emptyText}>
                Join a trip from your profile page to unlock your group chat.
              </Text>
            </View>
          )}
        </View>

        {/* Tidligere grupper */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Previous group chats</Text>

          {pastGroups.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No previous trips yet</Text>
              <Text style={styles.emptyText}>
                When you travel more with Hotspot, your past group chats will
                appear here.
              </Text>
            </View>
          ) : (
            pastGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.chatRow}
                onPress={() => openGroupChat(group)}
              >
                <View style={[styles.avatar, styles.pastAvatar]}>
                  <Text style={styles.pastAvatarText}>
                    {getInitials(group.name)}
                  </Text>
                </View>

                <View style={styles.chatTextWrapper}>
                  <View style={styles.chatTopRow}>
                    <Text style={styles.chatName} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.chatTime}>{group.lastMessageTime}</Text>
                  </View>

                  <View style={styles.chatMetaRow}>
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {group.lastMessagePreview}
                    </Text>
                  </View>

                  <View style={styles.chatBottomRow}>
                    <Text style={styles.chatSubMeta}>
                      {group.dateRange} · {group.members} travelers
                    </Text>
                    <View style={styles.pastBadge}>
                      <Text style={styles.pastBadgeText}>Past trip</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  headerLogo: {
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  scroll: {
    flex: 1,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#777',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  activeChatRow: {
    borderWidth: 1,
    borderColor: ORANGE,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  pastAvatar: {
    backgroundColor: '#F4F4F4',
  },
  pastAvatarText: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '700',
  },
  chatTextWrapper: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatMetaRow: {
    marginTop: 2,
  },
  chatPreview: {
    fontSize: 13,
    color: '#555',
  },
  chatBottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatSubMeta: {
    fontSize: 12,
    color: '#777',
  },
  unreadBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  pastBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F1F1F1',
  },
  pastBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
  },
});

export default ForumScreen;