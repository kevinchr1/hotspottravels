import React, { useEffect, useState } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  Alert 
} from 'react-native';
import { getDatabase, ref, push } from "firebase/database";
import Colors from '../constants/Colors';
import * as Location from 'expo-location';
import BlueButton from '../components/BlueButton';
import { Picker } from '@react-native-picker/picker';
import KeyboardScreen from '../components/KeyboardScreen';

/**
 * Add_edit_marker er en skærm, der giver brugeren mulighed for at oprette et nyt review.
 * Skærmen indeholder inputfelter til at udfylde informationer omkring det nye review
 * (titel, kategori, adresse og beskrivelse).
 * Når brugeren trykker på knappen "Save marker", gemmes det nye review i databasen.
 * Hvis brugeren ikke udfylder alle felter, vises en fejlmeddelelse.
 * Hvis adressen ikke kan findes, vises en fejlmeddelelse.
 * Hvis markøren gemmes korrekt, vises en succesmeddelelse.
 */

const Add_edit_marker = ({ navigation, route }) => {
  const db = getDatabase();

  const initialState = {
    latlng: {
      latitude: 0,
      longitude: 0,
    },
    title: '',
    type: '',
    description: '',
    address: '',
  };

  const [newMarker, setNewMarker] = useState(initialState);

  useEffect(() => {
    return () => {
      setNewMarker(initialState);
    };
  }, []);

  const changeTextInput = (key, value) => {
    setNewMarker({ ...newMarker, [key]: value });
  };

  // Denne funktion bruges til at omdanne en adresse til koordinater.
  const geoCode = async () => {
    try {
      const geocodedLocation = await Location.geocodeAsync(newMarker.address);
      console.log('Geocoded location:', geocodedLocation);

      if (geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];
        return { latitude, longitude }; // Returner nye koordinater
      } else {
        Alert.alert('Address not found');
        return null; // Indikerer fejl
      }
    } catch (error) {
      console.log('Geocoding error:', error);
      Alert.alert('Error while looking up address');
      return null;
    }
  };

  // Denne funktion bruges til at gemme en markør
  const saveMarker = async () => {
    const { title, type, description, address } = newMarker;

    // Simpel validering: alle felter skal udfyldes
    if (title === '' || type === '' || description === '' || address === '') {
      Alert.alert('Please fill out all fields');
      return;
    }

    // Her geoCoder vi adressen til latlng
    const newLatLng = await geoCode(); // Hent nye koordinater
    if (!newLatLng) {
      // Hvis geocoding fejlede, har vi allerede vist en Alert i geoCode
      return;
    }

    const { latitude, longitude } = newLatLng;

    // Marker opdateres med de nyfundne koordinater
    setNewMarker((prev) => ({
      ...prev,
      latlng: { latitude, longitude },
    }));

    // Ekstra sikkerhed: hvis der ikke er fundet koordinater
    if (latitude === 0 && longitude === 0) {
      Alert.alert('Address not found');
      return;
    }

    const markerRef = ref(db, 'Cities/Copenhagen/Markers');

    const newMarkerRef = {
      title,
      type,
      description, // Beskrivelse (tidligere "review")
      latlng: { latitude, longitude },
      address,
    };

    await push(markerRef, newMarkerRef)
      .then(() => {
        Alert.alert('Marker added');
        setNewMarker(initialState);
      })
      .catch((error) => {
        Alert.alert('Error adding marker', error.message);
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardScreen contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.titleText}>Add hotspot</Text>

          <TextInput
            style={styles.input}
            value={newMarker.title}
            placeholder="Title"
            onChangeText={(e) => changeTextInput('title', e)}
          />

          <View style={styles.pickerWrapper}>
            <Picker
              style={styles.picker}
              onValueChange={(itemValue) => changeTextInput('type', itemValue)}
              selectedValue={newMarker.type}
            >
              <Picker.Item label="Select category..." value="" />
              <Picker.Item label="Restaurant" value="Restaurant" />
              <Picker.Item label="Club" value="Club" />
              <Picker.Item label="Bar" value="Bar" />
              <Picker.Item label="Cafe" value="Cafe" />
              <Picker.Item label="Activity" value="Activity" />
              <Picker.Item label="Tourist attraction" value="Tourist Attraction" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Address"
            value={newMarker.address}
            onChangeText={(e) => changeTextInput('address', e)}
          />

          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Description"
            value={newMarker.description}
            onChangeText={(e) => changeTextInput('description', e)}
            multiline
          />

          <BlueButton text="Save marker" action={saveMarker} />
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary, // Matcher resten af appen
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1E3250',
  },
  input: {
    height: 44,
    width: '100%',
    borderColor: 'lightgray',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top', // Gør multiline mere naturlig
  },
  pickerWrapper: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'lightgray',
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
});

export default Add_edit_marker;