import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Denne komponent bruges til at vise en blå knap.
 * Knappen tager imod to props: text og action.
 * text er den tekst, der skal vises på knappen.
 * action er den funktion, der skal udføres, når knappen trykkes.
 */

const BlueButton = ({ text, action }) => {
  return (
    <TouchableOpacity onPress={action} style={styles.button}>
        <Text style={{color: 'white', textAlign: 'center', fontWeight: 'bold'}}>{text}</Text>
      </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
    button: {
      backgroundColor: Colors.buttonColor,
      padding: 10,
      borderRadius: 10,
      marginBottom: 20,
      width: '100%',
    },
  });
export default BlueButton;