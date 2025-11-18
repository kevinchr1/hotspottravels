import React, { useEffect, useState } from 'react';
import { Text, View, Alert, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDatabase, ref, onValue, off } from "firebase/database";
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

/**
 * Map er en skærm, der viser ent kort som tager udgangspunkt i København.
 * Skærmen henter markører fra databasen og viser dem på kortet.
 * Markørerne er klikbare og navigerer brugeren til View_marker med markøren som prop.
 * Brugeren kan tilføje en ny markør ved at trykke på en floating button i nederste højre hjørne.
 * Brugeren skal give tilladelse til at bruge lokationsinformation.
 * Hvis brugeren ikke giver tilladelse, vises en fejlmeddelelse.
 */

const Map = (props) => {
  const navigation = useNavigation();
  const [markers, setMarkers] = useState([]);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    //Der bedes om tilladelse til at bruge lokalitets information.
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission to access location was denied");
        return;
      }
      setLocationGranted(true);
    })();

    //Her hentes markører fra databasen.
    const db = getDatabase();
    const markersRef = ref(db, 'Cities/Copenhagen/Markers');
    onValue(markersRef, (snapshot) => {
      const data = snapshot.val();
      //Det objekt som kommer fra databasen omdannes til et array af markører. Derudover konverteres lat/lng fra strings til floats, dette er nødvendigt for android kompatibilitet.
      if (data) {
        const markersArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key, // Include the key as an ID for each marker
          latlng: {
            latitude: parseFloat(data[key].latlng.latitude),  // Ensure latitude is a float
            longitude: parseFloat(data[key].latlng.longitude) // Ensure longitude is a float
          }
        }));
        setMarkers(markersArray);
      }
    });

    return () => {
      off(markersRef);
    };
  }, []);

  return (
    <View style={styles.mapContainer}>
      {/* Hvid header med logo og orange kant i bunden */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLogo}>
          <Image
            source={require('../assets/hotspotflame.png')}
            style={styles.headerLogoImage}
          />
        </View>
      </View>

      {locationGranted ? (
        <>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 55.676098,
              longitude: 12.568337,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421
            }}
            showsUserLocation
            showsMyLocationButton
            showsCompass
            showsScale
          >
            {markers.map((marker) => (
              <Marker
              key={marker.id}
              coordinate={marker.latlng}
              anchor={{ x: 0.5, y: 1 }}   // gør at billedet sidder rigtigt
            >
              <Image 
                source={require('../assets/marker.png')} 
                style={{ width: 40, height: 40, resizeMode: 'contain' }} 
              />
                <Callout onPress={() => navigation.navigate('View_marker', { marker })}>
                  <View style={styles.callout}>
                    <Text style={styles.title}>{marker.title}</Text>
                    <Text style={styles.type}>{marker.type}</Text>
                    <Text style={styles.description}>{marker.description}</Text>
                    <View style={styles.button}>
                      <Text>See more</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {/* Button in the lower-right corner */}
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => navigation.navigate('Add Marker')}
          >
            <Text style={styles.floatingButtonText}>+</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text>Location permissions are required to show user location</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff', // Hvid baggrund bag headeren
  },
  headerContainer: {
    backgroundColor: '#fff',   // Helt hvid bag logo
    paddingTop: 55,            // afstand fra notch/top (tilpas 30–50 efter smag)
    paddingBottom: 10,         // lidt luft omkring logo
    alignItems: 'center',      // centrerer alt indhold horisontalt
    borderBottomWidth: 4,      // selve den orange linje
    borderBottomColor: '#FFA500', // orange kant fra side til side
  },
  headerLogo: {
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 52,                 // større logo
    height: 52,
    resizeMode: 'contain',
  },
  map: {
    flex: 1,
  },
  callout: {
    width: 200,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16
  },
  type: {
    fontStyle: 'italic'
  },
  description: {
    fontSize: 12,
    marginTop: 5
  },
  button: {
    backgroundColor: '#7AE3BB',
    padding: 10,
    borderRadius: 5,
    marginTop: 5
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    width: 60,
    height: 58,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  floatingButtonText: {
    fontSize: 30,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Map;