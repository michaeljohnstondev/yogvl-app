import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

export default function VibeInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  multiline,
  onContentSizeChange,
  style,
  isCompleted, // New prop to indicate if field is completed
  onFocus,
  onBlur,
  autoComplete,
  textContentType,
  importantForAutofill,
  autoCorrect,
  autoCapitalize,
  spellCheck,
  dataDetectorTypes,
  maxLength,
  ...otherProps
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
      onFocus={onFocus}
      onBlur={onBlur}
      autoComplete={autoComplete}
      textContentType={textContentType}
      importantForAutofill={importantForAutofill}
      autoCorrect={autoCorrect}
      autoCapitalize={autoCapitalize}
      spellCheck={spellCheck}
      dataDetectorTypes={dataDetectorTypes}
      maxLength={maxLength}
      placeholderTextColor="#aaa"
      style={[
        styles.input,
        isCompleted && styles.completedInput, // Apply completed style if isCompleted is true
        style,
      ]}
      {...otherProps}
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
  completedInput: {
    borderColor: theme.colors.vibePurple,
  },
});
