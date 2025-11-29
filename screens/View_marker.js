import React, { useEffect, useState } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  Image,
  TouchableOpacity,
} from 'react-native';
import Colors from '../constants/Colors';
import RatingCard from '../components/RatingCard';

/**
 * View_marker er en skærm, der viser information om en aktivitet.
 * Skærmen modtager en aktivitet som prop og viser information om aktiviteten.
 * Den viser titel, kategori, adresse, beskrivelse – og evt. pris og rating,
 * hvis de findes på markøren.
 */

const View_marker = ({ route, navigation }) => {
  const [marker, setMarker] = useState('');

  useEffect(() => {
    setMarker(route.params.marker);

    /* Fjern data, når vi går væk fra screenen */
    return () => {
      setMarker('');
    };
  }, [route.params.marker]);

  if (marker === '') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingWrapper}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasCost = !!marker.cost;
  const hasRating = marker.rating !== undefined && marker.rating !== null && marker.rating !== '';

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header med tilbage-knap og titel */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {marker.title || 'Activity'}
          </Text>
          {marker.type ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {marker.type}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top-banner / billede */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require('../assets/image.png')}
            style={styles.bannerImage}
          />

          {/* Pris badge – kun hvis cost findes */}
          {hasCost && (
            <View style={styles.costBadge}>
              <Text style={styles.costBadgeText}>{marker.cost}</Text>
            </View>
          )}

          {/* Rating – kun hvis rating findes */}
          {hasRating && (
            <View style={styles.ratingWrapper}>
              <RatingCard rating={marker.rating} />
            </View>
          )}
        </View>

        {/* Hovedkort med info */}
        <View style={styles.card}>
          {/* Titel */}
          {marker.title ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Title</Text>
              <Text style={styles.sectionText}>{marker.title}</Text>
            </View>
          ) : null}

          {/* Type / kategori */}
          {marker.type ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
              <Text style={styles.sectionText}>{marker.type}</Text>
            </View>
          ) : null}

          {/* Adresse */}
          {marker.address ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Address</Text>
              <Text style={styles.sectionText}>{marker.address}</Text>
            </View>
          ) : null}

          {/* Beskrivelse */}
          {marker.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={[styles.sectionText, styles.descriptionText]}>
                {marker.description}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const NAVY = '#1E3250';
const ORANGE = '#FFA500';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: NAVY,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: NAVY,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 50, // cirka samme bredde som back-knappen for balance
  },
  scrollContent: {
    paddingBottom: 24,
  },
  bannerWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  costBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: ORANGE,
  },
  costBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  ratingWrapper: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 15,
    color: NAVY,
  },
  descriptionText: {
    lineHeight: 20,
  },
});

export default View_marker;