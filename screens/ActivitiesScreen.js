import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

/**
 * ActivitiesScreen viser en liste over aktiviteter for brugerens nuværende tur.
 * Lige nu bruges dummy-data til at vise UI. Senere kan dette nemt kobles til
 * rigtige data fra fx Firebase og en aktiv gruppe.
 */

// Dummy-aktiviteter til visning af UI
const exampleActivities = [
  {
    id: '1',
    title: 'Welcome drinks at Beach Bar',
    dayLabel: 'Today',
    timeRange: '20:30 – 22:30',
    location: 'Barceloneta Beach',
    type: 'Social · Drinks',
    // Tilpas denne til din egen image-source senere
    image: null,
  },
  {
    id: '2',
    title: 'Guided Old Town Walk',
    dayLabel: 'Tomorrow',
    timeRange: '11:00 – 13:00',
    location: 'Gothic Quarter',
    type: 'Culture · Walking tour',
    image: null,
  },
  {
    id: '3',
    title: 'Tapas & Wine Evening',
    dayLabel: 'Tomorrow',
    timeRange: '19:30 – 22:00',
    location: 'La Rambla area',
    type: 'Food · Social',
    image: null,
  },
];

const ActivitiesScreen = () => {
  const insets = useSafeAreaInsets();

  // På sigt kan dette styres af gruppelogik:
  // fx isInGroup = currentGroupId !== null og activities hentet derfra.
  const [activities] = useState(exampleActivities);
  const isInGroup = true; // Sæt til false for at se "not in group" tom tilstand

  const handleViewOnMap = (activity) => {
    Alert.alert(
      'Coming soon',
      'Later this button can open the map and zoom to this activity location.'
    );
  };

  const handleViewDetails = (activity) => {
    Alert.alert(
      'Coming soon',
      'Later this button can open a detailed activity page.'
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header med logo og orange linje (samme stil som Map/Profile) */}
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
        {/* Trip overview card (dummy indtil gruppelogik er klar) */}
        <View style={styles.tripCard}>
          <Text style={styles.tripLabel}>Current trip</Text>
          <Text style={styles.tripTitle}>Barcelona Getaway 2025</Text>
          <Text style={styles.tripMeta}>12–16 May · 4 days · 23 travelers</Text>

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

        {/* Hvis bruger ikke er i en gruppe */}
        {!isInGroup && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active trip</Text>
            <Text style={styles.emptyText}>
              You are currently not part of a Hotspot group. 
              Join a trip from your profile page to see your activity schedule here.
            </Text>
          </View>
        )}

        {/* Hvis bruger er i en gruppe men der ingen aktiviteter */}
        {isInGroup && activities.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No activities yet</Text>
            <Text style={styles.emptyText}>
              Your trip does not have any activities loaded yet. 
              Ask your trip host to add the schedule in Hotspot Travels.
            </Text>
          </View>
        )}

        {/* Liste over aktiviteter */}
        {isInGroup && activities.length > 0 && (
          <View style={styles.activitiesList}>
            <Text style={styles.sectionTitle}>Your activities</Text>

            {activities.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                {/* Billede-sektion (kan senere bruge rigtige billeder fra dine assets) */}
                {activity.image ? (
                  <Image 
                    source={activity.image} 
                    style={styles.activityImage} 
                  />
                ) : (
                  <View style={styles.activityImagePlaceholder}>
                    <Text style={styles.activityImagePlaceholderText}>
                      Activity
                    </Text>
                  </View>
                )}

                <View style={styles.activityContent}>
                  <Text style={styles.activityDay}>{activity.dayLabel}</Text>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityTime}>{activity.timeRange}</Text>
                  <Text style={styles.activityLocation}>{activity.location}</Text>
                  <Text style={styles.activityType}>{activity.type}</Text>

                  <View style={styles.activityButtonsRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleViewOnMap(activity)}
                    >
                      <Text style={styles.secondaryButtonText}>View on map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => handleViewDetails(activity)}
                    >
                      <Text style={styles.primaryButtonText}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
    padding: 16,
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
  activityImage: {
    width: 90,
    height: '100%',
    resizeMode: 'cover',
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
  },
  secondaryButtonText: {
    fontSize: 12,
    color: NAVY,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: ORANGE,
  },
  primaryButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ActivitiesScreen;