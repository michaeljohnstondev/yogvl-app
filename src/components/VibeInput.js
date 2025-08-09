import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import theme from '../themes/themes';

export default function VibeInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  multiline,
  onContentSizeChange,
  style,
}) {
  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      onContentSizeChange={onContentSizeChange}
      placeholderTextColor="#aaa"
      style={[styles.input, style]} // 👈 make sure to merge styles here
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.sizes.borderRadius,
    padding: theme.sizes.inputPadding,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
  },
});
