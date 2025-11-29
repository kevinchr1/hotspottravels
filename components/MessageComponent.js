import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// MessageComponent viser enten en tekstbesked eller et billede (eller begge dele), baseret på de props der sendes ind.
const MessageComponent = ({ text, messageUser, currentUser }) => {
  const isCurrentUser = messageUser === currentUser;
  return (
    <View style={[styles.messageContainer, isCurrentUser && styles.currentUserMessage]}>
      {text && <Text>{text}</Text>}
    </View>
  );
};

// Styles til layout af besked og billede
const styles = StyleSheet.create({
  messageContainer: {
    alignSelf: 'flex-start',
    padding: 10,
    margin: 5,
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    borderRadius: 10,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 5,
    borderRadius: 10,                
  },
  currentUserMessage: {
    backgroundColor: '#d0e8ff', // Blue background for current user's messages
    alignSelf: 'flex-end',
  },
});

export default MessageComponent;
