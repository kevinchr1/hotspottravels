import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useState } from 'react';

/** 
 * Denne komponent bruges til at vælge prisklassen for en aktivitet.
 * Den giver tre muligheder: $, $$ og $$$.
 * Når en prisklasse vælges, opdateres den valgte prisklasse i parent-komponenten.
 * Derudover gives den valgte mulighed en grøn baggrundsfarve for at indikere, at den er valgt.
 */

const CostSelect = ({ action }) => {
    const [selected, setSelected] = useState(null); // Tracker den valgte prisklasse

    const handlePress = (value) => {
        setSelected(value); // opdaterer den valgte prisklasse
        action('cost',value); // kalder action med den valgte prisklasse
    };

    return (
        <View style={styles.container}>
          {['$', '$$', '$$$'].map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handlePress(option)}
              style={[
                styles.button,
                selected === option && styles.selectedButton,
              ]}
            >
              <Text>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
    );
};
    
const styles = StyleSheet.create({
  button: {
    backgroundColor: 'white',
    height: 30,
    shadowColor: 'black',
    shadowOpacity: 0.26,
    borderRadius: 15,
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#B4E7B6',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
});
    
export default CostSelect;