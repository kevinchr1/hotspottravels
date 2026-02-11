// screens/EditProfileScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getAuth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  deleteUser,
} from 'firebase/auth';

import {
  getDatabase,
  ref as dbRef,
  onValue,
  update,
  remove,
} from 'firebase/database';

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

import Colors from '../constants/Colors';
import KeyboardScreen from '../components/KeyboardScreen';
import BlueButton from '../components/BlueButton';

const EditProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Not logged in', 'You must be logged in to edit your profile.');
      navigation.goBack();
      return;
    }

    const db = getDatabase();
    const userRef = dbRef(db, 'users/' + user.uid);

    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.username) setUsername(data.username);
      if (data?.photoURL) setPhotoURL(data.photoURL);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigation]);

  // Gemmer kun username i Realtime Database
  const saveUsername = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Validation', 'Username cannot be empty.');
      return;
    }

    try {
      const db = getDatabase();
      const userRef = dbRef(db, 'users/' + user.uid);

      await update(userRef, { username: username.trim() });

      Alert.alert('Saved', 'Your username has been updated.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Vælg billede fra galleri og upload til Firebase Storage
  const pickAndUploadImage = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    // Spørg om tilladelse til billeder
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // kvadratisk crop
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    try {
      const asset = result.assets[0];
      const uri = asset.uri;

      const storage = getStorage();
      const ext = (asset?.fileName?.split('.').pop() || 'jpg').toLowerCase();
      const fileRef = storageRef(storage, `profilePictures/${user.uid}/avatar.jpg`);      // Convert uri -> blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload til Storage
      await uploadBytes(fileRef, blob);

      // Hent download URL
      const url = await getDownloadURL(fileRef);

      // Gem i Auth-profil og i Realtime DB
      await updateProfile(user, { photoURL: url });

      const db = getDatabase();
      const userRef = dbRef(db, 'users/' + user.uid);
      await update(userRef, { photoURL: url });

      setPhotoURL(url);
      Alert.alert('Saved', 'Profile picture updated!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Skift password (med reauth)
  const updateUserPassword = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert('Missing info', 'Please fill out all password fields.');
      return;
    }

    if (newPass.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    if (newPass !== confirmPass) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPass);

      Alert.alert('Success', 'Password updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Incorrect password', 'The current password you entered is wrong.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Session expired', 'Please log in again to change your password.');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  // Slet konto (Auth + DB + evt. profilbillede)
  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    try {
      const uid = user.uid;
      const db = getDatabase();
      const storage = getStorage();

      // Forsøg at slette profilbillede (må gerne fejle stille)
      const picRef = storageRef(storage, `profilePictures/${uid}/avatar.jpg`);      try {
        await deleteObject(picRef);
      } catch (e) {
        // Ignorer hvis filen ikke findes
      }

      // Slet user-data i Realtime DB
      await remove(dbRef(db, 'users/' + uid));

      // Slet selve brugeren i Auth
      await deleteUser(user);

      Alert.alert('Account deleted', 'Your account has been removed.');
      // auth listener i App.js vil automatisk sende dig tilbage til login
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Session expired', 'Please log in again and then try deleting your account.');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header (samme vibe som Settings) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>
  
        <View style={styles.headerCenter}>
          <Image
            source={require('../assets/hotspotflame.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>Edit profile</Text>
        </View>
  
        <View style={styles.headerRightSpacer} />
      </View>
  
      <KeyboardScreen contentContainerStyle={styles.content}>
        {/* Profile card */}
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <>
              <View style={styles.avatarWrapper}>
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
  
                <TouchableOpacity onPress={pickAndUploadImage}>
                  <Text style={styles.changePhotoText}>Change profile picture</Text>
                </TouchableOpacity>
              </View>
  
              <Text style={styles.sectionTitle}>Profile info</Text>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Your name"
              />
              <BlueButton text="Save username" action={saveUsername} />
            </>
          )}
        </View>
  
        {/* Password card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change password</Text>
  
          <Text style={styles.label}>Current password</Text>
          <TextInput
            style={styles.input}
            value={currentPass}
            onChangeText={setCurrentPass}
            placeholder="Current password"
            secureTextEntry
          />
  
          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={newPass}
            onChangeText={setNewPass}
            placeholder="New password"
            secureTextEntry
          />
  
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            style={styles.input}
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Confirm new password"
            secureTextEntry
          />
  
          <BlueButton text="Update password" action={updateUserPassword} />
        </View>
  
        {/* Danger zone card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Danger zone</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardScreen>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.primary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1E3250',
  },
  loadingText: {
    fontSize: 14,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
    color: '#1E3250',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 8,
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  changePhotoText: {
    color: '#1E3250',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'lightgray',
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffb3b3',
    backgroundColor: '#ffe6e6',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#cc0000',
    fontWeight: '700',
  },
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
    borderBottomColor: '#FFA500',
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
    width: 70,
  },
  backText: {
    fontSize: 14,
    color: '#1E3250',
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
    color: '#1E3250',
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
});

export default EditProfileScreen;