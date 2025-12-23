import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Colors from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { Image as RNImage } from 'react-native';
import FullImageModal from '../components/FullImageModal';

import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, off, push } from 'firebase/database';

const NAVY = '#1E3250';
const ORANGE = '#FFA500';
const DARK_ORANGE = '#CC7A00';

const PrivateMessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const auth = getAuth();

  const { groupId, groupName } = route.params || {};
  const title = groupName || 'Group chat';

  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [fullImageStartIndex, setFullImageStartIndex] = useState(0);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('You');

  // Hent username til den aktuelle bruger
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const db = getDatabase();
    const userRef = ref(db, 'users/' + user.uid);

    const unsubscribe = onValue(userRef, (snap) => {
      const data = snap.val();
      if (data && data.username) {
        setUsername(data.username);
      } else if (user.email) {
        setUsername(user.email.split('@')[0]);
      }
    });

    return () => {
      off(userRef);
      unsubscribe();
    };
  }, []);

  // Lyt live på groupMessages/{groupId}
  useEffect(() => {
    if (!groupId) return;

    const db = getDatabase();
    const msgsRef = ref(db, `groupMessages/${groupId}`);

    const unsubscribe = onValue(msgsRef, (snapshot) => {
      const data = snapshot.val();
      const user = auth.currentUser;

      if (!data) {
        setMessages([]);
        return;
      }

      const list = Object.keys(data)
        .map((key) => {
          const m = data[key];
          const mine = user && m.userId === user.uid;

          let time = '';
          if (m.createdAt) {
            const d = new Date(m.createdAt);
            const hh = d.getHours().toString().padStart(2, '0');
            const mm = d.getMinutes().toString().padStart(2, '0');
            time = `${hh}:${mm}`;
          }

          return {
            id: key,
            text: m.text || '',
            image: m.image || null,
            isMe: mine,
            time: time || 'Now',
            author: m.userName || 'Traveler',
            createdAt: m.createdAt || 0,
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt);

      setMessages(list);
    });

    return () => {
      off(msgsRef);
      unsubscribe();
    };
  }, [groupId]);

  const imageMessages = messages.filter((m) => m.image);
  const imageUris = imageMessages.map((m) => m.image);

  const handleSend = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to send messages.');
      return;
    }
    if (!groupId) {
      alert('No group selected.');
      return;
    }

    const text = input.trim();
    if (!text) return;

    try {
      const db = getDatabase();
      const msgsRef = ref(db, `groupMessages/${groupId}`);

      await push(msgsRef, {
        text,
        image: null,
        userId: user.uid,
        userName: username,
        createdAt: Date.now(),
      });

      setInput('');
    } catch (err) {
      console.log('Error sending message:', err);
      alert('Could not send message.');
    }
  };

  const handlePickImage = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to send images.');
      return;
    }
    if (!groupId) {
      alert('No group selected.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      alert('You need to allow gallery permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      try {
        const db = getDatabase();
        const msgsRef = ref(db, `groupMessages/${groupId}`);

        await push(msgsRef, {
          text: '',
          image: uri,
          userId: user.uid,
          userName: username,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.log('Error sending image message:', err);
        alert('Could not send image.');
      }
    }
  };

  const renderMessage = ({ item, index }) => {
    const previous = index > 0 ? messages[index - 1] : null;
    const sameAuthorAsPrev = previous && previous.author === item.author;
    const showAuthor = !sameAuthorAsPrev;

    const isMe = item.isMe;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        {/* Avatar kun for andre brugere */}
        {!isMe && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitial}>
              {(item.author || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageContent,
            isMe && { alignItems: 'flex-end' },
          ]}
        >
          {/* Navn over første besked i blokken */}
          {showAuthor && (
            <Text style={styles.authorText}>{item.author || 'Unknown'}</Text>
          )}

          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
            ]}
          >
            {item.image ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const idx = imageMessages.findIndex((m) => m.id === item.id);
                  setFullImageStartIndex(idx >= 0 ? idx : 0);
                  setFullImageVisible(true);
                }}
              >
                <RNImage
                  source={{ uri: item.image }}
                  style={styles.imageInBubble}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <Text
                style={
                  isMe ? styles.bubbleTextMe : styles.bubbleTextOther
                }
              >
                {item.text}
              </Text>
            )}

            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle}>Group chat</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 10}
      >
        {/* Messages */}
        <View style={styles.messagesContainer}>
          {!groupId ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No group selected</Text>
              <Text style={styles.emptyText}>
                Go back to Messages and open a group chat.
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Send the first message to your group.
              </Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesContent}
            />
          )}
        </View>

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 6 }]}>
          <TouchableOpacity style={styles.mediaButton} onPress={handlePickImage}>
            <Text style={styles.mediaButtonText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor="#999"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen galleri */}
      <FullImageModal
        visible={fullImageVisible}
        images={imageUris}
        initialIndex={fullImageStartIndex}
        onClose={() => setFullImageVisible(false)}
      />
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
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: NAVY,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 50,
  },
  chatWrapper: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  messagesContent: {
    paddingBottom: 8,
  },

  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 4,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },

  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD9A3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 18,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_ORANGE,
  },

  messageContent: {
    maxWidth: '80%',
  },

  authorText: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK_ORANGE,
    marginBottom: 4,
  },

  bubble: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleMe: {
    backgroundColor: ORANGE,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  bubbleTextMe: {
    color: '#fff',
    fontSize: 14,
  },
  bubbleTextOther: {
    color: NAVY,
    fontSize: 14,
  },
  imageInBubble: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#eee',
  },
  timeText: {
    fontSize: 10,
    color: '#EEE',
    marginTop: 3,
    textAlign: 'right',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    maxHeight: 90,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E4E4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    marginRight: 8,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: ORANGE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDEDED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mediaButtonText: {
    fontSize: 28,
    color: '#444',
    marginTop: -2,
  },
});

export default PrivateMessagesScreen;