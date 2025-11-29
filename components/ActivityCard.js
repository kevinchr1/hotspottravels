import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

/**
 * ActivityCard er en komponent, der viser en aktivitet i form af en kasse med udvalgte informationer om aktiviteten.
 * Den modtager en prop, activity, som er et objekt med informationer om aktiviteten.
 * Når brugeren trykker på kassen, navigeres brugeren til View_marker med aktiviteten som prop. 
 */

const ActivityCard = ({ activity }) => {
    const navigation = useNavigation();
    //Her gemmes aktiviteten i variablen marker, det skal den for at kunne sendes videre til View_marker.
    const marker = activity;
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('View_marker', {marker})}>
        <Image source={require('../assets/hotspotflame.png')} style={styles.image} />
        <View style={styles.textContainer}>
              <Text style={styles.title}>{activity.title}</Text>
          <View style={styles.details}>
              <Text style={styles.type}>{activity.type}</Text>
              <Text style={styles.rating}>Rating: {activity.rating}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    shadowColor: 'black',
    shadowOpacity: 0.26,
    borderRadius: 10,
    marginVertical: 10, // Space over og under kortet
    flexDirection: 'row', // Billede og tekst er vandret justeret
    alignItems: 'center',
    padding: 10,
    width: '95%',
    alignSelf: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  textContainer: {
    flex: 1, // Fylder resten af pladsen ved siden af billedet
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    flexWrap: 'wrap', // Teksten brydes, hvis den er for lang
  },
  details: {
    flexDirection: 'row',
    width: '100%',
  },
  type: {
    textAlign: 'left', // Justeret til venstre
    flexWrap: 'wrap', // Teksten brydes, hvis den er for lang
    width: '50%',
  },
  rating: {
    flex: 1, // Fylder én kolonne
    textAlign: 'right', // Justeret til højre
    color: '#59B214',
    width: '50%',
  },
});

export default ActivityCard;
