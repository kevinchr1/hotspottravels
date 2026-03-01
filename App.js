import React, { useState, useEffect } from 'react';
import { StyleSheet, Image, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';

import { getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

import Colors from './constants/Colors';

// Screens
import Map from './screens/map';
import AdminPanel from "./screens/AdminPanel";
import Add_edit_marker from './screens/Add_edit_marker';
import View_marker from './screens/View_marker';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import ForumScreen from './screens/ForumScreen';
import PrivateMessagesScreen from './screens/PrivateMessagesScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import LegalScreen from './screens/LegalScreen';
import AdminCreateGroup from "./screens/AdminCreateGroup";
import AdminDestinations from "./screens/AdminDestinations";
import AdminManageGroups from "./screens/AdminManageGroups";
import AdminManageDestinations from "./screens/AdminManageDestinations";
import ManageGroupDetails from "./screens/ManageGroupDetails";
import OtherUserProfile from "./screens/OtherUserProfile";
import AdminReportsScreen from "./screens/AdminReportsScreen";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAFy_5IqdOwBZPnel-nOuJaaJ61TyjI9Ms",
  authDomain: "hotspot-8eff0.firebaseapp.com",
  databaseURL: "https://hotspot-8eff0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hotspot-8eff0",
  storageBucket: "hotspot-8eff0.firebasestorage.app",
  messagingSenderId: "746177310995",
  appId: "1:746177310995:web:08504894fc91398115eae6"
};

if (getApps().length < 1) {
  const app = initializeApp(firebaseConfig);
  getDatabase(app);
  console.log('Firebase On!');
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const NAVY = '#1E3250';
const ORANGE_DARK = '#E69500';
const TAB_MAP_ICON = require('./assets/maplogo.png');
const TAB_ACTIVITIES_ICON = require('./assets/activitylogo.png');
const TAB_CHAT_ICON = require('./assets/chatlogo.png');
const TAB_PROFILE_ICON = require('./assets/userlogo.png');
const APP_ASSETS = [
  TAB_MAP_ICON,
  TAB_ACTIVITIES_ICON,
  TAB_CHAT_ICON,
  TAB_PROFILE_ICON,
  require('./assets/hotspotflame.png'),
  require('./assets/hotspotlogo.png'),
];

/* ---------- TAB ICON COMPONENT ---------- */
const TabItem = ({ focused, source, size }) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        source={source}
        style={{
          width: focused ? size + 2 : size,
          height: focused ? size + 2 : size,
          resizeMode: 'contain',
          opacity: focused ? 1 : 0.55,
        }}
      />
      <View
        style={{
          marginTop: 6,
          height: 3,
          width: 22,
          borderRadius: 2,
          backgroundColor: focused ? ORANGE_DARK : 'transparent',
        }}
      />
    </View>
  );
};

/* ---------- AUTH STACK ---------- */
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={RegisterScreen} />
  </Stack.Navigator>
);

/* ---------- APP TABS ---------- */
const AppTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        height: 90,
        paddingBottom: 10,
        paddingTop: 8,
        backgroundColor: Colors.primary,
        borderTopWidth: 0,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        marginTop: 4,
        color: NAVY,
      },
      tabBarActiveTintColor: NAVY,
      tabBarInactiveTintColor: NAVY,
    }}
  >
    <Tab.Screen
      name="Map"
      component={Map}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabItem
            focused={focused}
            source={TAB_MAP_ICON}
            size={45}
          />
        ),
      }}
    />

    <Tab.Screen
      name="Activities"
      component={ActivitiesScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabItem
            focused={focused}
            source={TAB_ACTIVITIES_ICON}
            size={36}
          />
        ),
      }}
    />

    <Tab.Screen
      name="Messages"
      component={ForumScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabItem
            focused={focused}
            source={TAB_CHAT_ICON}
            size={36}
          />
        ),
      }}
    />

    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabItem
            focused={focused}
            source={TAB_PROFILE_ICON}
            size={45}
          />
        ),
      }}
    />
  </Tab.Navigator>
);

/* ---------- MAIN STACK ---------- */
const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={AppTabs} />
    <Stack.Screen name="View_marker" component={View_marker} />
    <Stack.Screen name="Add Marker" component={Add_edit_marker} />
    <Stack.Screen name="Private messages" component={PrivateMessagesScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Legal" component={LegalScreen} />
    <Stack.Screen name="AdminPanel" component={AdminPanel} />
    <Stack.Screen name="AdminCreateGroup" component={AdminCreateGroup} />
    <Stack.Screen name="AdminDestinations" component={AdminDestinations} />
    <Stack.Screen name="AdminManageGroups" component={AdminManageGroups} />
    <Stack.Screen name="AdminManageDestinations" component={AdminManageDestinations} />
    <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
    <Stack.Screen name="ManageGroupDetails" component={ManageGroupDetails} />
    <Stack.Screen name="OtherUserProfile" component={OtherUserProfile} />
  </Stack.Navigator>
);

/* ---------- APP ROOT ---------- */
export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Asset.loadAsync(APP_ASSETS);
      } catch (_e) {
        // If preload fails, continue app boot and load lazily.
      } finally {
        if (mounted) setAssetsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!authReady || !assetsReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.bootScreen}>
          <ActivityIndicator color={ORANGE_DARK} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {user ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
