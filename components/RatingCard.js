import React from 'react';
import { Text, StyleSheet, View, Image } from 'react-native';

/**
 * Denne komponent bruges viser en rating.
 */

const RatingCard = ({ rating }) => {
  return (
    <View style={styles.card}>
        <Image source={require('../assets/star.png')} style={{width:40, height: 30}} />
        <Text style={{color: 'lightgreen', fontSize: 24, textAlign:'center'}}>{rating}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        height: 40,
        width:80,
        position: 'absolute',
        bottom: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'black',
        shadowOpacity: 0.26,
    },
});

export default RatingCard;