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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * View_marker er en skærm, der viser information om en aktivitet.
 * Skærmen modtager en aktivitet som prop og viser information om aktiviteten.
 * Den viser titel, kategori, adresse, beskrivelse – og evt. pris og rating,
 * hvis de findes på markøren.
 */

const View_marker = ({ route, navigation }) => {
  const [marker, setMarker] = useState('');
  const insets = useSafeAreaInsets();

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


  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
  
        <Image
          source={require('../assets/hotspotflame.png')}
          style={styles.headerLogo}
        />
  
        <View style={{ width: 60 }} />
      </View>
  
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner image */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require('../assets/image.png')}
            style={styles.bannerImage}
          />
        </View>
  
        {/* Content (mindre “bokset”, mere luft) */}
        <View style={styles.content}>
          <Text style={styles.typeLabel}>{marker.type || 'Activity'}</Text>
          <Text style={styles.title}>{marker.title || 'Activity'}</Text>
  
          {marker.address ? (
            <Text style={styles.address}>{marker.address}</Text>
          ) : null}
  
          {marker.description ? (
            <Text style={styles.description}>{marker.description}</Text>
          ) : (
            <Text style={styles.muted}>No description added yet.</Text>
          )}
  
          {/* Mulighed for flere detaljer senere (viser kun hvis data findes) */}
          {(marker.duration || marker.meetupPoint || marker.notes) ? (
            <View style={styles.detailsBlock}>
              <Text style={styles.detailsTitle}>More details</Text>
  
              {!!marker.duration && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{marker.duration}</Text>
                </View>
              )}
  
              {!!marker.meetupPoint && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Meetup</Text>
                  <Text style={styles.detailValue}>{marker.meetupPoint}</Text>
                </View>
              )}
  
              {!!marker.notes && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{marker.notes}</Text>
                </View>
              )}
            </View>
          ) : null}
  
          {/* Buttons */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                // Hvis din Tab hedder "Map" (som du viste), så brug "Map" her:
                navigation.navigate('Map', {
                  focusMarker: {
                    markerId: marker.id,
                    latlng: marker.latlng,
                  },
                });
              }}
            >
              <Text style={styles.primaryButtonText}>View on map</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  backButton: {
    width: 60,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
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
    paddingBottom: 26,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  bannerWrapper: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerImage: {
    width: '100%',
    height: 210,
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
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 18,
    paddingBottom: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  headerLogoImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  headerLogo: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  bannerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bannerLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginTop: 4,
  },
  bannerMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  mutedText: {
    fontSize: 13,
    color: '#777',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  detailsBlock: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 10,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    color: NAVY,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
  },
  secondaryButtonText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '700',
  },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ORANGE,
  },
  primaryButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '800',
  },
  typeLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    marginTop: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  description: {
    fontSize: 15,
    color: '#3f3f3f',
    lineHeight: 21,
    marginTop: 12,
  },
  muted: {
    fontSize: 14,
    color: '#777',
    marginTop: 12,
  },
});

export default View_marker;