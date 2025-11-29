import React, { useState } from 'react';
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

const PrivateMessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const { groupId, groupName } = route.params || {};
  const title = groupName || 'Group chat';

  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [fullImageStartIndex, setFullImageStartIndex] = useState(0);

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Welcome to the group chat.',
      isMe: false,
      time: '19:02',
      author: 'Host',
    },
    {
      id: '2',
      text: 'Remember welcome drinks at the beach bar tonight.',
      isMe: false,
      time: '19:05',
      author: 'Host',
    },
    {
      id: '3',
      text: 'Nice! See you there.',
      isMe: true,
      time: '19:07',
      author: 'You',
    },
  ]);

  const [input, setInput] = useState('');

  // alle billed-beskeder (til galleriet)
  const imageMessages = messages.filter((m) => m.image);
  const imageUris = imageMessages.map((m) => m.image);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      isMe: true,
      time: 'Now',
      author: 'You',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  const handlePickImage = async () => {
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
      const newMessage = {
        id: Date.now().toString(),
        image: result.assets[0].uri,
        isMe: true,
        time: 'Now',
        author: 'You',
      };

      setMessages((prev) => [...prev, newMessage]);
    }
  };

  const renderMessage = ({ item }) => {
    const containerStyle = item.isMe
      ? [styles.messageRow, styles.messageRowRight]
      : [styles.messageRow, styles.messageRowLeft];

    const bubbleStyle = item.isMe
      ? [styles.bubble, styles.bubbleMe]
      : [styles.bubble, styles.bubbleOther];

    const textStyle = item.isMe ? styles.bubbleTextMe : styles.bubbleTextOther;

    const handlePressImage = () => {
      // find index for denne besked i billed-listen
      const idx = imageMessages.findIndex((m) => m.id === item.id);
      setFullImageStartIndex(idx >= 0 ? idx : 0);
      setFullImageVisible(true);
    };

    return (
      <View style={containerStyle}>
        <View style={bubbleStyle}>
          {item.image ? (
            <TouchableOpacity activeOpacity={0.8} onPress={handlePressImage}>
              <RNImage
                source={{ uri: item.image }}
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 12,
                  marginBottom: 6,
                  backgroundColor: '#eee',
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <Text style={textStyle}>{item.text}</Text>
          )}

          <Text style={styles.timeText}>{item.time}</Text>
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
          {messages.length === 0 ? (
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
              inverted={false}
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

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

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
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
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