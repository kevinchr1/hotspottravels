import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image as ExpoImage } from "expo-image";

import Colors from "../constants/Colors";
import FullImageModal from "../components/FullImageModal";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue, off, push } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";
const DARK_ORANGE = "#CC7A00";

const PrivateMessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const auth = getAuth();

  const { groupId, groupName } = route.params || {};
  const title = groupName || "Group chat";

  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [fullImageStartIndex, setFullImageStartIndex] = useState(0);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("You");
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const db = getDatabase();
    const userRef = ref(db, "users/" + user.uid);

    const unsubscribe = onValue(userRef, (snap) => {
      const data = snap.val();
      if (data?.username) {
        setUsername(data.username);
      } else if (user.email) {
        setUsername(user.email.split("@")[0]);
      }
    });

    return () => {
      off(userRef);
      unsubscribe();
    };
  }, [auth.currentUser]);

  useEffect(() => {
    if (!groupId) {
      setInitialLoading(false);
      return;
    }

    const db = getDatabase();
    const msgsRef = ref(db, `groupMessages/${groupId}`);

    const unsubscribe = onValue(msgsRef, (snapshot) => {
      const data = snapshot.val();
      const user = auth.currentUser;

      if (!data) {
        setMessages([]);
        setInitialLoading(false);
        return;
      }

      const list = Object.keys(data)
        .map((key) => {
          const m = data[key];
          const mine = user && m.userId === user.uid;

          let time = "";
          if (m.createdAt) {
            const d = new Date(m.createdAt);
            const hh = d.getHours().toString().padStart(2, "0");
            const mm = d.getMinutes().toString().padStart(2, "0");
            time = `${hh}:${mm}`;
          }

          return {
            id: key,
            text: m.text || "",
            imageUrl: m.imageUrl || null,
            userId: m.userId || "",
            isMe: mine,
            time: time || "Now",
            author: m.userName || "Traveler",
            createdAt: m.createdAt || 0,
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt);

      setMessages(list);
      setInitialLoading(false);
    });

    return () => {
      off(msgsRef);
      unsubscribe();
    };
  }, [groupId, auth.currentUser]);

  const imageMessages = messages.filter((m) => m.imageUrl);
  const imageUris = imageMessages.map((m) => m.imageUrl);

  useEffect(() => {
    const urls = imageUris
      .filter((u) => typeof u === "string" && u.startsWith("http"))
      .slice(0, 15);
    if (urls.length) {
      ExpoImage.prefetch(urls).catch(() => {});
    }
  }, [imageUris]);

  const handleSend = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to send messages.");
      return;
    }
    if (!groupId) {
      alert("No group selected.");
      return;
    }

    const text = input.trim();
    if (!text) return;

    try {
      const db = getDatabase();
      const msgsRef = ref(db, `groupMessages/${groupId}`);
      await push(msgsRef, {
        text,
        imageUrl: null,
        userId: user.uid,
        userName: username,
        createdAt: Date.now(),
      });
      setInput("");
    } catch (err) {
      console.log("Error sending message:", err);
      alert("Could not send message.");
    }
  };

  const uploadImageAsync = async (uri, currentGroupId) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    if (!currentGroupId) throw new Error("No groupId");

    const storage = getStorage();
    const fileName = `${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
    const path = `chatImages/${currentGroupId}/${user.uid}/${fileName}`;
    const imgRef = storageRef(storage, path);

    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    await uploadBytes(imgRef, blob, { contentType: "image/jpeg" });
    return getDownloadURL(imgRef);
  };

  const handlePickImage = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to send images.");
        return;
      }
      if (!groupId) {
        alert("No group selected.");
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert("You need to allow gallery permissions.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (result.canceled) return;

      const selectedAssets = result.assets || [];
      if (!selectedAssets.length) {
        alert("No images selected.");
        return;
      }

      setUploading(true);
      const db = getDatabase();
      const msgsRef = ref(db, `groupMessages/${groupId}`);

      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        const downloadUrl = await uploadImageAsync(manipResult.uri, groupId);
        await push(msgsRef, {
          text: "",
          imageUrl: downloadUrl,
          userId: user.uid,
          userName: username,
          createdAt: Date.now() + i,
        });
      }
    } catch (err) {
      console.log("handlePickImage error:", err);
      alert("Could not pick/upload image: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item, index }) => {
    const previous = index > 0 ? messages[index - 1] : null;
    const showAuthor = !(previous && previous.author === item.author);
    const isMe = item.isMe;
    const canOpenProfile = !!item.author && !!item.userId && !isMe;

    const handleOpenProfile = () => {
      if (!canOpenProfile) return;
      navigation.navigate("OtherUserProfile", {
        userId: item.userId,
        userName: item.author,
      });
    };

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        {!isMe && (
          <TouchableOpacity style={styles.avatarContainer} onPress={handleOpenProfile}>
            <Text style={styles.avatarInitial}>
              {(item.author || "?").charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.messageContent, isMe && { alignItems: "flex-end" }]}>
          {showAuthor &&
            (canOpenProfile ? (
              <TouchableOpacity onPress={handleOpenProfile}>
                <Text style={styles.authorText}>{item.author || "Unknown"}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.authorText}>{item.author || "Unknown"}</Text>
            ))}

          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            {item.imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const idx = imageMessages.findIndex((m) => m.id === item.id);
                  setFullImageStartIndex(idx >= 0 ? idx : 0);
                  setFullImageVisible(true);
                }}
              >
                <ExpoImage
                  source={item.imageUrl}
                  style={styles.imageInBubble}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ) : (
              <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextOther}>
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
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{"<"} Back</Text>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={-20}
      >
        <View style={styles.messagesContainer}>
          {!groupId ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No group selected</Text>
              <Text style={styles.emptyText}>Go back to Messages and open a group chat.</Text>
            </View>
          ) : initialLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={ORANGE} />
              <Text style={styles.emptyText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Send the first message to your group.</Text>
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

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 6 }]}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handlePickImage}
            disabled={uploading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={styles.mediaButtonText}>+</Text>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor="#999"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!uploading}
          />

          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={uploading}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NAVY,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#888",
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
    width: "100%",
    flexDirection: "row",
    marginVertical: 4,
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFD9A3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginTop: 18,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: DARK_ORANGE,
  },
  messageContent: {
    maxWidth: "80%",
  },
  authorText: {
    fontSize: 12,
    fontWeight: "600",
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
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  bubbleTextMe: {
    color: "#fff",
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
    backgroundColor: "#eee",
  },
  timeText: {
    fontSize: 10,
    color: "#EEE",
    marginTop: 3,
    textAlign: "right",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NAVY,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    maxHeight: 90,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E4E4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
    marginRight: 8,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: ORANGE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  mediaButtonText: {
    fontSize: 28,
    color: "#444",
    marginTop: -2,
  },
});

export default PrivateMessagesScreen;
