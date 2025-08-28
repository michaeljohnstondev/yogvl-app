// FILE: components/ui/InviteCodeInput.js - Invite Code Input Component

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import theme from '../../theme/themes';

const InviteCodeInput = ({ 
  onCodeSubmit, 
  loading = false, 
  placeholder = "Enter invite code (e.g., BVS-XY7K9)",
  buttonText = "Join Event",
  style 
}) => {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode && onCodeSubmit) {
      onCodeSubmit(trimmedCode);
    }
  };

  const formatCode = (input) => {
    // Auto-format as user types: BVS-XXXXX
    let formatted = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (formatted.length > 3 && !formatted.startsWith('BVS')) {
      formatted = 'BVS' + formatted.substring(3);
    }
    
    if (formatted.length > 3) {
      formatted = formatted.substring(0, 3) + '-' + formatted.substring(3, 8);
    }
    
    return formatted;
  };

  const handleCodeChange = (text) => {
    const formattedCode = formatCode(text);
    setCode(formattedCode);
  };

  const isValidCode = code.length >= 8 && code.includes('-'); // BVS-XXXXX format

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Have an invite code?</Text>
      
      <TextInput
        style={[
          styles.input,
          !isValidCode && code.length > 0 && styles.inputInvalid
        ]}
        value={code}
        onChangeText={handleCodeChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9} // BVS-XXXXX = 9 characters
        editable={!loading}
      />
      
      <TouchableOpacity
        style={[
          styles.button,
          (!isValidCode || loading) && styles.buttonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!isValidCode || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.background} />
        ) : (
          <Text style={styles.buttonText}>{buttonText}</Text>
        )}
      </TouchableOpacity>
      
      {code.length > 0 && !isValidCode && (
        <Text style={styles.errorText}>
          Code should be in format: BVS-XXXXX
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.cardBackground,
    marginBottom: 12,
  },
  inputInvalid: {
    borderColor: theme.colors.error,
  },
  button: {
    backgroundColor: theme.colors.vibeBlue,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default InviteCodeInput;