import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Colors from '../constants/Colors';

const KeyboardScreen = ({
  children,
  scroll = true,
  keyboardOffset = 0,           // du har fundet ud af 0 fungerer bedst for dig
  contentContainerStyle,
  style,
  backgroundColor = Colors.primary,
}) => {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.container, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, contentContainerStyle]}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
});

export default KeyboardScreen;