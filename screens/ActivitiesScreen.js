import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, onValue, off } from 'firebase/database';
import Colors from '../constants/Colors';

/**
 * ActivitiesScreen
 * - Uses currentGroup (from users/{uid}.currentGroupId)
 * - Loads group data from groups/{groupId}
 * - Loads activities from Cities/{city}/Markers
 * - Live updates via onValue
 * - UI matches the “nice” template with:
 *   - White header with logo + orange border
 *   - Trip card at top
 *   - Activity cards in a list
 *   - Empty states when no group / no activities
 */

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const ActivitiesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [activities, setActivities] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const auth = getAuth();
      const user = auth.currentUser;
      const db = getDatabase();

      let activitiesRef = null;
      let cancelled = false;

      const fetchData = async () => {
        if (!user) {
          if (cancelled) return;
          setCurrentGroup(null);
          setActivities([]);
          setLoading(false);
          return;
        }

        setLoading(true);

        try {
          // 1) Get currentGroupId from user profile
          const userRef = ref(db, 'users/' + user.uid);
          const userSnap = await get(userRef);

          if (!userSnap.exists()) {
            if (cancelled) return;
            setCurrentGroup(null);
            setActivities([]);
            setLoading(false);
            return;
          }

          const userData = userSnap.val();
          const currentGroupId = userData.currentGroupId;

          // No group → empty state
          if (!currentGroupId) {
            if (cancelled) return;
            setCurrentGroup(null);
            setActivities([]);
            setLoading(false);
            return;
          }

          // 2) Load group data
          const groupRef = ref(db, 'groups/' + currentGroupId);
          const groupSnap = await get(groupRef);

          if (!groupSnap.exists()) {
            if (cancelled) return;
            setCurrentGroup(null);
            setActivities([]);
            setLoading(false);
            return;
          }

          const groupData = groupSnap.val();
          const city = groupData.city || 'Copenhagen';

          if (cancelled) return;

          setCurrentGroup({
            id: currentGroupId,
            ...groupData,
          });

          // 3) Listen live on activities in Cities/{city}/Markers
          activitiesRef = ref(db, `Cities/${city}/Markers`);

          onValue(activitiesRef, (snapshot) => {
            if (cancelled) return;

            const data = snapshot.val();
            if (data) {
              const activitiesArray = Object.keys(data).map((key) => ({
                ...data[key],
                id: key,
                latlng: data[key]?.latlng
                  ? {
                      latitude: Number(data[key].latlng.latitude),
                      longitude: Number(data[key].latlng.longitude),
                    }
                  : null,
              }));
              setActivities(activitiesArray);
            } else {
              setActivities([]);
            }
            setLoading(false);
          });
        } catch (error) {
          console.log('ActivitiesScreen error:', error);
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      fetchData();

      // Cleanup when screen loses focus
      return () => {
        cancelled = true;
        if (activitiesRef) {
          off(activitiesRef);
        }
      };
    }, [])
  );

  const handleGoToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleViewOnMap = (activity) => {
    navigation.navigate('Map', {
      focusMarker: {
        markerId: activity.id,
        latlng: activity.latlng,
      },
    });
  };

  const handleViewDetails = (activity) => {
    navigation.navigate('View_marker', { marker: activity });
  };

  return (
    <View style={styles.screen}>
      {/* Header with logo and orange line (same style as Map/Profile) */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLogo}>
          <Image
            source={require('../assets/hotspotflame.png')}
            style={styles.headerLogoImage}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentWrapper}
      >
        {/* Trip overview card – dynamic from currentGroup */}
        {currentGroup ? (
          <View style={styles.tripCard}>
            <Text style={styles.tripLabel}>Current trip</Text>
            <Text style={styles.tripTitle}>
              {currentGroup.name || 'Your Hotspot trip'}
            </Text>

            <Text style={styles.tripMeta}>
              {currentGroup.startDate && currentGroup.endDate
                ? `${currentGroup.startDate} – ${currentGroup.endDate}${
                    currentGroup.city ? ` · ${currentGroup.city}` : ''
                  }`
                : currentGroup.city
                ? currentGroup.city
                : 'Trip dates will be added later'}
            </Text>

            <TouchableOpacity
              style={styles.tripButton}
              onPress={() =>
                Alert.alert(
                  'Coming soon',
                  'Trip details will be added later.'
                )
              }
            >
              <Text style={styles.tripButtonText}>View trip details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // No current group → show “No active trip”
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active trip</Text>
            <Text style={styles.emptyText}>
              You are currently not part of a Hotspot group. Join a trip from
              your profile page to see your activity schedule here.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToProfile}
            >
              <Text style={styles.primaryButtonText}>Go to profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* If no group, we stop here */}
        {!currentGroup && null}

        {/* If there is a group, show loading / empty / activities */}
        {currentGroup && (
          <>
            {loading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Loading activities...</Text>
                <Text style={styles.emptyText}>
                  Please wait while we load your trip schedule.
                </Text>
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No activities yet</Text>
                <Text style={styles.emptyText}>
                  Your trip does not have any activities loaded yet. Ask your
                  trip host to add the schedule in Hotspot Travels.
                </Text>
              </View>
            ) : (
              <View style={styles.activitiesList}>
                <Text style={styles.sectionTitle}>Your activities</Text>

                {activities.map((activity) => {
                  const title = activity.title || 'Hotspot activity';
                  const typeLabel = activity.type || 'Activity';
                  const address = activity.address || 'Location to be announced';
                  const description =
                    activity.description || 'Details will be added later';
                  const priceLine = activity.cost
                    ? `Price level: ${activity.cost}`
                    : null;

                  return (
                    <View key={activity.id} style={styles.activityCard}>
                      {/* Image placeholder – later you can map a real image field */}
                      <View style={styles.activityImagePlaceholder}>
                        <Text style={styles.activityImagePlaceholderText}>
                          Activity
                        </Text>
                      </View>

                      <View style={styles.activityContent}>
                        {/* Small top label – using type as “day label” style */}
                        <Text style={styles.activityDay}>{typeLabel}</Text>

                        {/* Title */}
                        <Text style={styles.activityTitle}>{title}</Text>

                        {/* “Time range” line – reused for price if available */}
                        {priceLine && (
                          <Text style={styles.activityTime}>{priceLine}</Text>
                        )}

                        {/* Location line */}
                        <Text style={styles.activityLocation}>{address}</Text>

                        {/* Description line */}
                        <Text style={styles.activityType}>{description}</Text>

                        <View style={styles.activityButtonsRow}>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => handleViewOnMap(activity)}
                          >
                            <Text style={styles.secondaryButtonText}>
                              View on map
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleViewDetails(activity)}
                          >
                            <Text style={styles.primaryButtonText}>
                              Details
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
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
  scroll: {
    flex: 1,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tripLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NAVY,
    marginTop: 4,
  },
  tripMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  tripButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tripButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,           // ny
    marginBottom: 14,         // ny (giver luft til knappen)
  },
  activitiesList: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    flexDirection: 'row',
  },
  activityImagePlaceholder: {
    width: 90,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityImagePlaceholderText: {
    fontSize: 11,
    color: '#999',
  },
  activityContent: {
    flex: 1,
    padding: 12,
  },
  activityDay: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  activityLocation: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  activityType: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  activityButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  secondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    marginTop: 6,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: NAVY,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,      // var 6
    borderRadius: 8,         // var 8
    backgroundColor: ORANGE,
    marginTop: 6,             // ny
  },
  
  primaryButtonText: {
    fontSize: 13,             // var 12 (læsbar CTA)
    color: '#fff',
    fontWeight: '600',
  },
});

export default ActivitiesScreen;