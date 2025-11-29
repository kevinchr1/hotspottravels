import React, { useState, useEffect } from 'react'; // Til brug af hooks som useState og useEffect
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getApps, initializeApp } from "firebase/app"; 
import {NavigationContainer} from "@react-navigation/native";
import {createStackNavigator} from "@react-navigation/stack";
import { Image } from 'react-native';
import Colors from './constants/Colors';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Firebase authentication
import { getDatabase } from 'firebase/database'; // Firebase Realtime Database
import { SafeAreaProvider } from 'react-native-safe-area-context';


//Her importeres vores screens
import Map from "./screens/map";
import Add_edit_marker from './screens/Add_edit_marker';
import View_marker from './screens/View_marker';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import ForumScreen from './screens/ForumScreen';
import PrivateMessagesScreen from './screens/PrivateMessagesScreen';

const firebaseConfig = {
  apiKey: "AIzaSyAFy_5IqdOwBZPnel-nOuJaaJ61TyjI9Ms",
  authDomain: "hotspot-8eff0.firebaseapp.com",
  databaseURL: "https://hotspot-8eff0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hotspot-8eff0",
  storageBucket: "hotspot-8eff0.appspot.com",
  messagingSenderId: "746177310995",
  appId: "1:746177310995:web:08504894fc91398115eae6"
};


if (getApps().length < 1) {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  console.log("Firebase On!");
}

/**
 * App er vores hovedkomponent, der styrer navigationen i appen.
 * Komponenten indeholder en state variabel, der holder styr på brugerens login-status.
 * Der er to navigationer: en for brugere der er logget ind og en for brugere der ikke er.
 * Hvis brugeren er logget ind, vises en bundnavigation med fire faner.
 * Hvis brugeren ikke er logget ind, vises en stak med to skærme: Login og Signup.
 */


export default function App() {
  const [user, setUser] = useState(null); // Opretter en state variabel for brugerens login-status

  // Tjekker om brugeren er logget ind
  useEffect(() => {
    const auth = getAuth(); // Henter Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { // Lyt efter ændringer i brugerens login-status
      setUser(currentUser); // Opdater state med den aktuelle bruger
    });

    return unsubscribe; // Ryd op i listeneren når komponenten unmountes
  }, []);


  const Stack = createStackNavigator();
  const Tab = createBottomTabNavigator();
  // Logged-Out Navigation
  const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={RegisterScreen} />
    </Stack.Navigator>
  );

  // Logged-In Navigation with Tabs
  const AppTabs = () => (
    <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,              // sæt til false hvis du vil fjerne tekst
      tabBarStyle: {
        height: 90,                       // højere bar = mere luft
        paddingBottom: 10,
        paddingTop: 8,
        backgroundColor: Colors.primary,
      },
      tabBarLabelStyle: {
        marginTop: 10,        // giver luft OVER teksten (mellem ikon og label)
        fontSize: 10,
      },
      tabBarActiveTintColor: "black",
      tabBarInactiveTintColor: "black",
      tabBarActiveBackgroundColor: Colors.activeNavigation,
      tabBarInactiveBackgroundColor: Colors.primary,
    }}
    >
      <Tab.Screen
        name="Map"
        component={Map}
        options={{
          tabBarIcon: () => (
            <Image
              source={require('./assets/maplogo.png')}
              style={{ width: 45, height: 45, resizeMode: 'contain'  }}
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{
          tabBarIcon: () => (
            <Image
              source={require('./assets/activitylogo.png')}
              style={{ width: 40, height: 40, resizeMode: 'contain'  }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Messeges"
        component={ForumScreen}
        options={{
          tabBarIcon: () => (
            <Image
              source={require('./assets/chatlogo.png')}
              style={{ width: 40, height: 40, resizeMode: 'contain'  }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: () => (
            <Image
              source={require('./assets/userlogo.png')}
              style={{ width: 45, height: 45, resizeMode: 'contain'  }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );

  // Stack for additional screens outside the Bottom Tabs
  const MainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen name="View_marker" component={View_marker} />
      <Stack.Screen name="Add Marker" component={Add_edit_marker} />
      <Stack.Screen name="Private messages" component={PrivateMessagesScreen} />
    </Stack.Navigator>
  );

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
