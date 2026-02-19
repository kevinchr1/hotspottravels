import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  View,
  Alert,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

/**
 * Map screen:
 * - If user is in a group -> fetch group.city and show Cities/{city}/Markers
 * - Also fetch group schedule from groupSchedules/{groupId}
 * - Banner shows next upcoming activity based on schedule (startAt)
 * - If no upcoming activities -> show "All activities completed"
 * - Tap banner -> zoom to next activity
 * - Tap marker -> banner updates to that marker + zooms to it
 */

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const Map = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [markers, setMarkers] = useState([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const [cityKey, setCityKey] = useState('Copenhagen'); // default
  const [currentGroupName, setCurrentGroupName] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  // Schedule events: [{ id, markerId, startAt }]
  const [scheduleEvents, setScheduleEvents] = useState([]);

  // Banner selection
  const [selectedMarkerId, setSelectedMarkerId] = useState(null); // manual selection overrides "next"
  const auth = getAuth();

  // Temporary flag for Add Marker button
  const enableAddMarker = false;

  // Location permission + initial user location (once)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
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

        // Auto-center on user
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
            500
          );
        }
      } catch (err) {
        console.log('Error getting current position:', err);
      }
    })();
  }, []);

  // Load group + markers + schedule on focus (and keep listeners)
  useFocusEffect(
    React.useCallback(() => {
      const user = auth.currentUser;
      const db = getDatabase();

      let markersRef = null;
      let scheduleRef = null;
      let cancelled = false;

      const fetchData = async () => {
        let effectiveCity = 'Copenhagen';
        let groupName = null;
        let groupId = null;

        try {
          if (user) {
            const userRef = ref(db, 'users/' + user.uid);
            const userSnap = await get(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.val();
              groupId = userData.currentGroupId || null;

              if (groupId) {
                const groupRef = ref(db, 'groups/' + groupId);
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
          setCurrentGroupId(groupId);

          // Reset manual selection when switching group/city
          setSelectedMarkerId(null);

          // Listen to markers
          markersRef = ref(db, `Cities/${effectiveCity}/Markers`);
          onValue(markersRef, (snapshot) => {
            if (cancelled) return;
            const data = snapshot.val();
            if (data) {
              const markersArray = Object.keys(data).map((key) => ({
                ...data[key],
                id: key,
                latlng: {
                  latitude: parseFloat(data[key].latlng.latitude),
                  longitude: parseFloat(data[key].latlng.longitude),
                },
              }));
              setMarkers(markersArray);
            } else {
              setMarkers([]);
            }
          });

          // Listen to schedule only if in a group
          if (groupId) {
            scheduleRef = ref(db, `groupSchedules/${groupId}`);
            onValue(scheduleRef, (snapshot) => {
              if (cancelled) return;
              const data = snapshot.val();
              if (!data) {
                setScheduleEvents([]);
                return;
              }

              const events = Object.keys(data)
                .map((id) => {
                  const e = data[id] || {};
                  return {
                    id,
                    markerId: e.markerId || null,
                    startAt: typeof e.startAt === 'number' ? e.startAt : 0,
                  };
                })
                .filter((e) => e.markerId && e.startAt)
                .sort((a, b) => a.startAt - b.startAt);

              setScheduleEvents(events);
            });
          } else {
            setScheduleEvents([]);
          }
        } catch (err) {
          console.log('Map fetch error:', err);
        }
      };

      fetchData();

      return () => {
        cancelled = true;
        if (markersRef) off(markersRef);
        if (scheduleRef) off(scheduleRef);
      };
    }, [auth])
  );

  // Quick lookup: markerId -> marker
  const markerById = useMemo(() => {
    const map = {};
    for (const m of markers) map[m.id] = m;
    return map;
  }, [markers]);

  // Find next scheduled event (first event in the future)
  const nextScheduledEvent = useMemo(() => {
    if (!scheduleEvents.length) return null;
    const now = Date.now();
    const upcoming = scheduleEvents.find((e) => e.startAt > now);
    return upcoming || null;
  }, [scheduleEvents]);

  // Determine which marker to show in banner:
  // - If user has clicked a marker -> show that marker
  // - Else show next scheduled event marker (if any)
  const bannerMarker = useMemo(() => {
    if (selectedMarkerId && markerById[selectedMarkerId]) {
      return markerById[selectedMarkerId];
    }
    if (nextScheduledEvent?.markerId && markerById[nextScheduledEvent.markerId]) {
      return markerById[nextScheduledEvent.markerId];
    }
    return null;
  }, [selectedMarkerId, nextScheduledEvent, markerById]);

  // Determine banner time text:
  // - If selected marker corresponds to a schedule event -> show its time
  // - Else if showing next scheduled event -> show its time
  // - Else empty
  const bannerEvent = useMemo(() => {
    if (!scheduleEvents.length) return null;

    // Manual selection: try find event for that marker (closest upcoming, else first)
    if (selectedMarkerId) {
      const eventsForMarker = scheduleEvents.filter((e) => e.markerId === selectedMarkerId);
      if (!eventsForMarker.length) return null;

      const now = Date.now();
      const upcoming = eventsForMarker.find((e) => e.startAt > now);
      return upcoming || eventsForMarker[0];
    }

    return nextScheduledEvent;
  }, [scheduleEvents, selectedMarkerId, nextScheduledEvent]);

  const formatDateTime = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const wd = weekdays[d.getDay()];
    const m = months[d.getMonth()];
    const day = d.getDate();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');

    return `${wd}, ${m} ${day} · ${hh}:${mm}`;
  };

  const zoomToCoords = (coords) => {
    if (!coords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };
  useEffect(() => {
    const fm = route?.params?.focusMarker;
    if (!fm) return;
  
    // Hvis vi får markerId, så vent til markers er loaded og find den
    if (fm.markerId && markerById[fm.markerId]?.latlng) {
      setSelectedMarkerId(fm.markerId);
      zoomToCoords(markerById[fm.markerId].latlng);
      return;
    }
  
    // Hvis vi får coords direkte
    if (fm.latlng?.latitude && fm.latlng?.longitude) {
      setSelectedMarkerId(fm.markerId || null);
      zoomToCoords({
        latitude: Number(fm.latlng.latitude),
        longitude: Number(fm.latlng.longitude),
      });
    }
  }, [route?.params?.focusMarker, markerById]);

  // My location button
  const handleMyLocation = () => {
    if (userLocation && mapRef.current) {
      zoomToCoords(userLocation);
    } else {
      Alert.alert('Location not ready', 'We could not get your location yet.');
    }
  };

  // Tap banner:
  // - If showing a marker -> zoom to it
  // - If no upcoming activities -> do nothing
  const handleBannerPress = () => {
    if (!currentGroupId) return;
    if (!scheduleEvents.length) return;

    // If manual selected marker exists -> zoom to it
    if (bannerMarker?.latlng) {
      zoomToCoords(bannerMarker.latlng);
      return;
    }

    // If no banner marker, do nothing
  };

  const hasUpcoming = !!nextScheduledEvent;
  const hasSchedule = scheduleEvents.length > 0;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLogo}>
          <Image source={require('../assets/hotspotflame.png')} style={styles.headerLogoImage} />
        </View>
      </View>

      <View style={styles.contentWrapper}>
        {/* Banner */}
        <TouchableOpacity
          activeOpacity={currentGroupId && hasSchedule ? 0.85 : 1}
          onPress={currentGroupId && hasSchedule ? handleBannerPress : undefined}
          style={styles.activityCard}
        >
          {currentGroupName ? (
            <>
              {!hasSchedule ? (
                <>
                  <Text style={styles.activityLabel}>Your trip</Text>
                  <Text style={styles.activityTitle}>{currentGroupName}</Text>
                  <Text style={styles.activityMeta}>No activities added yet</Text>
                  <Text style={[styles.activityMeta, { marginTop: 6 }]}>
                    Add activities to this group to show the next event here.
                  </Text>
                </>
              ) : hasUpcoming || selectedMarkerId ? (
                <>
                  <Text style={styles.activityLabel}>
                    {selectedMarkerId ? 'Selected activity' : 'Next up'}
                  </Text>

                  <Text style={styles.activityTitle}>
                    {bannerMarker?.title || currentGroupName}
                  </Text>

                  {bannerEvent?.startAt ? (
                    <Text style={styles.activityMeta}>{formatDateTime(bannerEvent.startAt)}</Text>
                  ) : (
                    <Text style={styles.activityMeta}>No scheduled time</Text>
                  )}

                  {bannerMarker?.address ? (
                    <Text style={styles.activityMeta}>{bannerMarker.address}</Text>
                  ) : (
                    <Text style={styles.activityMeta}>City: {cityKey}</Text>
                  )}

                  <Text style={[styles.activityHint, { marginTop: 8 }]}>
                    Tap to zoom to the location
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.activityLabel}>Your trip</Text>
                  <Text style={styles.activityTitle}>{currentGroupName}</Text>
                  <Text style={styles.activityMeta}>All activities completed</Text>
                  <Text style={[styles.activityMeta, { marginTop: 6 }]}>
                    You’re done for now. Enjoy the rest of the trip.
                  </Text>
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.activityLabel}>No activity group</Text>
              <Text style={styles.activityTitle}>You are not in a Hotspot group</Text>
              <Text style={styles.activityMeta}>
                Join a trip from your profile to see your next activity here.
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Search + filter row (still placeholder) */}
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

        {/* Map */}
        <View style={styles.mapCard}>
          {locationGranted ? (
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: 55.676098,
                  longitude: 12.568337,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass
                showsScale
              >
                {markers.map((marker) => {
                  const isSelected = marker.id === selectedMarkerId;
                  return (
                    <Marker
                      key={marker.id}
                      coordinate={marker.latlng}
                      anchor={{ x: 0.5, y: 1 }}
                      onPress={() => {
                        setSelectedMarkerId(marker.id);
                        zoomToCoords(marker.latlng);
                      }}
                    >
                      <Image
                        source={require('../assets/hotspotflame.png')}
                        style={{
                          width: isSelected ? 30 : 25,
                          height: isSelected ? 42 : 35,
                          resizeMode: 'contain',
                        }}
                      />

<Callout
  tooltip
  onPress={() => navigation.navigate('View_marker', { marker })}
>
  <View style={styles.calloutWrap}>
    <View style={styles.calloutCard}>
      <Text style={styles.calloutTitle} numberOfLines={1}>{marker.title}</Text>
      <Text style={styles.calloutMeta} numberOfLines={1}>{marker.type}</Text>

      {!!marker.description && (
        <Text style={styles.calloutDesc} numberOfLines={2}>{marker.description}</Text>
      )}

      <View style={styles.calloutCta}>
        <Text style={styles.calloutCtaText}>See more</Text>
      </View>
    </View>

    {/* lille “pil” så den stadig peger pænt på markeren */}
    <View style={styles.calloutArrow} />
  </View>
</Callout>
                    </Marker>
                  );
                })}
              </MapView>

              {/* My location */}
              <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
                <Text style={styles.myLocationText}>◎</Text>
              </TouchableOpacity>

              {/* Add marker (disabled for now) */}
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

const FilterChip = ({ label, onPress }) => {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
};

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
  activityHint: {
    fontSize: 12,
    color: ORANGE,
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
    fontSize: 16,
  },
  type: {
    fontStyle: 'italic',
  },
  description: {
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#7AE3BB',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
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
  calloutWrap: { alignItems: 'center' },
calloutCard: {
  width: 240,
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 12,
  borderWidth: 1,
  borderColor: '#EDEDED',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 4,
},
calloutTitle: { fontSize: 15, fontWeight: '700', color: NAVY },
calloutMeta: { marginTop: 4, fontSize: 12, fontWeight: '600', color: ORANGE },
calloutDesc: { marginTop: 6, fontSize: 12, color: '#4B5563', lineHeight: 16 },
calloutCta: {
  marginTop: 10,
  backgroundColor: ORANGE,
  borderRadius: 10,
  paddingVertical: 10,
  alignItems: 'center',
},
calloutCtaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
calloutArrow: {
  marginTop: -1,
  width: 12,
  height: 12,
  backgroundColor: '#fff',
  transform: [{ rotate: '45deg' }],
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderColor: '#EDEDED',
},
});

export default Map;