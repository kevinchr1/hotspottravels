import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// InputComponent tager props til håndtering af beskeder og billeder
const InputComponent = ({ newMessage, onChangeMessage, onSendMessage, onSendImage }) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Skriv en besked..."
        value={newMessage}          // Viser den aktuelle besked
        onChangeText={onChangeMessage} // Opdaterer beskeden ved ændring
      />
      <TouchableOpacity style={styles.button} onPress={onSendMessage}>
        <MaterialIcons name="send" size={30} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onSendImage}>
        <MaterialIcons name="camera-alt" size={30} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    padding: 10,
    marginRight: 10,
    borderRadius: 25,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default InputComponent;
