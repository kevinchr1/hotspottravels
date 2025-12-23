import React, { useEffect, useState, useRef } from 'react';
import { 
  Text, 
  View, 
  Alert, 
  Image, 
  TouchableOpacity, 
  StyleSheet,
  TextInput 
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDatabase, ref, onValue, off, get } from "firebase/database";
import { getAuth } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

/**
 * Map er en skærm, der viser et kort:
 * - Hvis bruger er i en gruppe → vi henter group.city og viser Cities/{city}/Markers
 * - Hvis ikke i gruppe → fallback til Cities/Copenhagen/Markers
 * Markører er klikbare og navigerer til View_marker.
 * Brugeren kan centrere kortet på egen lokation (“My location”).
 */

const Map = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [markers, setMarkers] = useState([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [cityKey, setCityKey] = useState('Copenhagen'); // default
  const [currentGroupName, setCurrentGroupName] = useState(null);

  const auth = getAuth();

  // Flag til midlertidigt at slå "Add Marker"-knappen fra.
  // Sæt til true igen når brugere må tilføje spots.
  const enableAddMarker = false;

  // Lokationstilladelse + hent brugerens lokation (kører kun én gang)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission to access location was denied");
        return;
      }
      setLocationGranted(true);

      try {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(coords);

        // Centrer automatisk på brugerens lokation
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              ...coords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            500
          );
        }
      } catch (err) {
        console.log("Error getting current position:", err);
      }
    })();
  }, []);

  // Hent gruppe + markers hver gang Map får fokus
  useFocusEffect(
    React.useCallback(() => {
      const user = auth.currentUser;
      const db = getDatabase();
      let markersRef = null;
      let cancelled = false;

      const fetchData = async () => {
        // default fallback
        let effectiveCity = 'Copenhagen';
        let groupName = null;

        try {
          if (user) {
            const userRef = ref(db, 'users/' + user.uid);
            const userSnap = await get(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.val();
              const currentGroupId = userData.currentGroupId;

              if (currentGroupId) {
                const groupRef = ref(db, 'groups/' + currentGroupId);
                const groupSnap = await get(groupRef);

                if (groupSnap.exists()) {
                  const groupData = groupSnap.val();
                  effectiveCity = groupData.city || 'Copenhagen';
                  groupName = groupData.name || null;
                }
              }
            }
          }

          if (cancelled) return;

          setCityKey(effectiveCity);
          setCurrentGroupName(groupName);

          // Lyt på Cities/{city}/Markers
          markersRef = ref(db, `Cities/${effectiveCity}/Markers`);
          onValue(markersRef, (snapshot) => {
            if (cancelled) return;
            const data = snapshot.val();
            if (data) {
              const markersArray = Object.keys(data).map(key => ({
                ...data[key],
                id: key,
                latlng: {
                  latitude: parseFloat(data[key].latlng.latitude),
                  longitude: parseFloat(data[key].latlng.longitude)
                }
              }));
              setMarkers(markersArray);
            } else {
              setMarkers([]);
            }
          });
        } catch (err) {
          console.log("Map fetch error:", err);
        }
      };

      fetchData();

      return () => {
        cancelled = true;
        if (markersRef) off(markersRef);
      };
    }, [auth])
  );

  // "My location" knap handler
  const handleMyLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    } else {
      Alert.alert("Location not ready", "We could not get your location yet.");
    }
  };

  return (
    <View style={styles.screen}>
      {/* Hvid header med logo og orange kant i bunden (samme stil som Profile) */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLogo}>
          <Image
            source={require('../assets/hotspotflame.png')}
            style={styles.headerLogoImage}
          />
        </View>
      </View>

      <View style={styles.contentWrapper}>
        {/* Next activity banner – kan senere kobles til gruppens schedule */}
        <View style={styles.activityCard}>
  {currentGroupName ? (
    <>
      <Text style={styles.activityLabel}>Your trip</Text>
      <Text style={styles.activityTitle}>{currentGroupName}</Text>
      <Text style={styles.activityMeta}>City: {cityKey}</Text>
      <TouchableOpacity 
        style={styles.activityButton}
        onPress={() =>
          Alert.alert("Coming soon", "Trip schedule will be added later.")
        }
      >
        <Text style={styles.activityButtonText}>View schedule</Text>
      </TouchableOpacity>
    </>
  ) : (
    <>
      <Text style={styles.activityLabel}>No activity group</Text>
      <Text style={styles.activityTitle}>You are not in a Hotspot group</Text>
      <Text style={styles.activityMeta}>
        Join a trip from your profile to see your schedule here.
      </Text>
    </>
  )}
</View>

        {/* Search + filter row */}
        <View style={styles.searchAndFilters}>
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search places or activities"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.filtersRow}>
            <FilterChip label="All" />
            <FilterChip label="Food & Drinks" />
            <FilterChip label="Activities" />
            <FilterChip label="Must see" />
          </View>
        </View>

        {/* Map i card med afrundede hjørner */}
        <View style={styles.mapCard}>
          {locationGranted ? (
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  // fallback – vi centrerer alligevel på userLocation når vi har den
                  latitude: 55.676098,
                  longitude: 12.568337,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421
                }}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass
                showsScale
              >
                {markers.map((marker) => (
                  <Marker
                    key={marker.id}
                    coordinate={marker.latlng}
                    anchor={{ x: 0.5, y: 1 }}   // pin-spidsen nederst
                  >
                    <Image 
                      source={require('../assets/hotspotflame.png')}
                      style={{ width: 25, height: 35, resizeMode: 'contain' }}
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

              {/* My location knap (øverst til højre i map card) */}
              <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
                <Text style={styles.myLocationText}>◎</Text>
              </TouchableOpacity>

              {/* Add marker knap (midlertidigt skjult via enableAddMarker) */}
              {enableAddMarker && (
                <TouchableOpacity
                  style={styles.floatingButton}
                  onPress={() => navigation.navigate('Add Marker')}
                >
                  <Text style={styles.floatingButtonText}>+</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.locationErrorWrapper}>
              <Text style={styles.locationErrorText}>
                Location permissions are required to show user location.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * FilterChip er en lille genbrugskomponent til filterknapperne.
 * Der er endnu ingen funktionalitet, men onPress kan nemt tilføjes senere.
 */
const FilterChip = ({ label, onPress }) => {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
};

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  headerLogo: {
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activityLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
    marginTop: 4,
  },
  activityMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  activityButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchAndFilters: {
    marginBottom: 10,
  },
  searchWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  searchInput: {
    height: 36,
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  chipText: {
    fontSize: 12,
    color: NAVY,
    fontWeight: '500',
  },
  mapCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  myLocationButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  myLocationText: {
    fontSize: 18,
    color: NAVY,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: ORANGE,
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
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
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
  locationErrorWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  locationErrorText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});

export default Map;