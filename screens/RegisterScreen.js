import React, { useState } from 'react'; // Importerer React og useState hook
import { View, TextInput, Button, StyleSheet, Alert, Text } from 'react-native'; // Importerer nødvendige komponenter fra React Native
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'; // Importerer Firebase autentificering
import { getDatabase, ref, set } from 'firebase/database'; // Importerer Firebase database funktioner
import Colors from '../constants/Colors';
import { Image } from 'react-native';
import BlueButton from '../components/BlueButton';
import KeyboardScreen from '../components/KeyboardScreen';

/**
 * RegisterScreen er en skærm, der giver brugeren mulighed for at registrere sig.
 * Skærmen indeholder inputfelter til brugernavn, email og adgangskode.
 * Når brugeren trykker på knappen "Opret Konto", forsøges der at oprette en ny bruger.
 * Hvis brugeren ikke udfylder alle felter, vises en fejlmeddelelse.
 * Hvis brugeren oprettes korrekt, vises en succesmeddelelse.
 */

const RegisterScreen = ({ navigation }) => {
  // State til at holde værdier for brugernavn, email og adgangskode
  const [username, setUsername] = useState(''); // Brugernavn state
  const [email, setEmail] = useState(''); // Email state
  const [password, setPassword] = useState(''); // Adgangskode state

  // Funktion til at håndtere registrering af bruger
  const handleRegister = async () => {
    const auth = getAuth(); // Henter autentificeringsinstansen

    try {
      // Opretter en ny bruger med email og adgangskode
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // Henter brugerens ID

      // Gem brugerdata i Firebase
      const db = getDatabase(); // Henter databaseinstansen
      await set(ref(db, 'users/' + userId), { // Refererer til brugerens data
        username: username, // Gemmer brugernavnet
        reviewPoints: 0, // Initialiserer reviewPoints til 0
        badges: [], // Initialiserer badges som en tom liste
      });

      // Viser en succesmeddelelse og navigerer til login
      Alert.alert("Registrering succesfuld!", "Du kan nu logge ind.");
    } catch (error) {
      // Viser en fejlmeddelelse, hvis registreringen mislykkes
      Alert.alert("Fejl", error.message);
    }
  };

  return (
    <KeyboardScreen contentContainerStyle={styles.container}>
    <View style={styles.container}>
    <View style={styles.imageWrapper}>
  <Image 
    source={require('../assets/hotspotflame.png')}
    style={styles.image}
  />
</View>
      <Text style={styles.title}>Sign up</Text>
      <TextInput
        style={styles.input} // Stil til inputfelt
        placeholder="Username" // Pladsholder tekst
        value={username} // Værdi af inputfeltet
        onChangeText={setUsername} // Opdaterer brugernavn state ved ændringer
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input} // Stil til inputfelt
        placeholder="Email" // Pladsholder tekst
        value={email} // Værdi af inputfeltet
        onChangeText={setEmail} // Opdaterer email state ved ændringer
        keyboardType="email-address" // Tastaturtype til email
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input} // Stil til inputfelt
        placeholder="Password" // Pladsholder tekst
        value={password} // Værdi af inputfeltet
        onChangeText={setPassword} // Opdaterer adgangskode state ved ændringer
        secureTextEntry // Gør at adgangskoden vises som prikker
        placeholderTextColor="#888"
      />
      <BlueButton text="Opret Konto" action={handleRegister} />


      <View style={styles.spacing} /> 

      <Button title="Tilbage til Login" onPress={() => navigation.navigate('Login')} /> 
    </View>
    </KeyboardScreen>
  );
};

// Styling af komponenter
const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
      flex: 1,
      padding: 20,
      backgroundColor: Colors.primary, // Lys blå baggrund for en blødere effekt
      justifyContent: 'center', // Centrere indholdet
    },
    title: {
      fontSize: 36, // Større skriftstørrelse for titlen
      fontWeight: 'bold', // Fed skrift
      marginBottom: 30, // Plads under titlen
      textAlign: 'left', // Centrerer titlen
    },
    input: {
      height: 50, // Højere inputfelter for bedre brugervenlighed
      borderColor: 'gray', // Borderfarve
      borderWidth: 1, // Borderbredde
      borderRadius: 10, // Rundede hjørner
      marginBottom: 20, // Afstand under inputfeltet
      paddingHorizontal: 15, // Indvendig afstand til venstre og højre
      backgroundColor: '#fff', // Hvid baggrund for inputfelterne
    },
    spacing: {
      height: 20, // Justerbar afstand mellem knapper
    },
    imageWrapper: {
      alignItems: 'center',     // Centrerer billedet horisontalt
      marginTop: 20,            // Giver luft fra toppen
      marginBottom: 40,         // Giver luft ned mod input felterne
    },
    
    image: {
      width: 260,
      height: 260,
      resizeMode: 'contain',    // Forhindrer cropping top/bund
    },
  });

// Eksporterer RegisterScreen komponenten
export default RegisterScreen;
