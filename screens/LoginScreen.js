import React, { useState } from 'react'; // Importerer React og useState hook
import {  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  Button} from 'react-native'; // Importerer nødvendige komponenter fra React Native
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'; // Importerer Firebase autentificeringsfunktioner
import { Image } from 'react-native';
import Colors from '../constants/Colors';
import BlueButton from '../components/BlueButton';
import KeyboardScreen from '../components/KeyboardScreen';

/**
 * LoginScreen er en skærm, der giver brugeren mulighed for at logge ind.
 * Skærmen indeholder inputfelter til email og adgangskode.
 * Når brugeren trykker på knappen "Login", forsøges der at logge brugeren ind.
 */

const LoginScreen = ({ navigation }) => {
  // State til at holde email, adgangskode og eventuelle fejlmeddelelser
  const [email, setEmail] = useState(''); // State til email
  const [password, setPassword] = useState(''); // State til adgangskode
  const [error, setError] = useState(null); // State til fejlmeddelelser

  // Funktion til at håndtere login
  const handleLogin = () => {
    const auth = getAuth(); // Henter autentificeringsinstansen
    signInWithEmailAndPassword(auth, email, password) // Forsøger at logge brugeren ind
      .then((userCredential) => {
        console.log("User logged in successfully!"); // Log meddelelse ved succesfuld login
      })
      .catch((error) => {
        setError(error.message); // Sætter fejlmeddelelsen, hvis login fejler
      });
  };

  return (
    <KeyboardScreen contentContainerStyle={styles.container}>
<View style={styles.imageWrapper}>
  <Image 
    source={require('../assets/hotspotlogo.png')} 
    style={styles.image}
  />
</View>

    {/*<Text style={styles.title}>LOG IND</Text>*/}

    <TextInput
      placeholder="Email" // Pladsholder tekst for email-input
      value={email} // Værdi af email-input
      onChangeText={setEmail} // Opdaterer email state ved ændringer
      style={styles.input} // Anvender stil til inputfeltet
      placeholderTextColor="#888"
    />

    <TextInput
      placeholder="Password" // Pladsholder tekst for adgangskode-input
      value={password} // Værdi af adgangskode-input
      onChangeText={setPassword} // Opdaterer adgangskode state ved ændringer
      secureTextEntry // Gør, at adgangskoden vises som prikker
      style={styles.input} // Anvender stil til inputfeltet
      placeholderTextColor="#888"
    />

    <BlueButton text="Login" action={handleLogin} />

    {error && <Text style={styles.error}>{error}</Text>} 

    <View style={styles.spacing} />

    <Text style={{textAlign: 'center'}}>Don't have an account?</Text>

    <Button title="Sign up" onPress={() => navigation.navigate('Signup')} /> 
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
      height: 40, // Højere inputfelter for bedre brugervenlighed
      borderColor: 'lightgray', // Borderfarve
      borderWidth: 1, // Borderbredde
      borderRadius: 10, // Rundede hjørner
      marginBottom: 20, // Afstand under inputfeltet
      paddingHorizontal: 15, // Indvendig afstand til venstre og højre
      backgroundColor: '#fff', // Hvid baggrund for inputfelterne
    },
    error: {
      color: 'red', // Rød farve til fejlmeddelelser
      marginTop: 10, // Plads over fejlmeddelelser
      textAlign: 'center', // Centrerer fejlmeddelelsen
    },
    spacing: {
      height: 20, // Justerbar afstand mellem knapper
    },
    imageWrapper: {
      alignItems: 'center',   // Centrerer billedet horisontalt
      marginBottom: 40,       // Løfter billedet ved at skabe afstand til inputs
      marginTop: 20,          // Giver lidt luft fra toppen
    },
    
    image: {
      width: 280, 
      height: 280,
      resizeMode: 'contain',
    },
  });

// Eksporterer LoginScreen komponenten
export default LoginScreen;
