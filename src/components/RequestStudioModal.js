import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import theme from '../theme/themes';
import { StudioRequestService } from '../services/StudioRequestService';
import { useAuth } from '../auth/AuthContext';

const RequestStudioModal = ({ 
  visible, 
  onClose, 
  initialCity = '', 
  initialState = '',
  onRequestSubmitted 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    cityName: initialCity,
    stateName: initialState,
    country: 'USA',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.cityName.trim() || !formData.stateName.trim()) {
      Alert.alert('Missing Information', 'Please provide both city and state/province.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to request a studio.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await StudioRequestService.requestNewStudio(
        formData.cityName.trim(),
        formData.stateName.trim(),
        formData.country.trim(),
        formData.reason.trim(),
        user.uid
      );

      if (result.success) {
        Alert.alert(
          'Request Submitted!',
          result.message,
          [{ text: 'OK', onPress: () => {
            onClose();
            if (onRequestSubmitted) onRequestSubmitted(result);
          }}]
        );
      } else {
        Alert.alert('Request Status', result.message);
        if (result.type === 'studio_exists' || result.type === 'request_exists') {
          onClose();
        }
      }
    } catch (error) {
      console.error('[RequestStudioModal] Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit studio request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      cityName: '',
      stateName: '',
      country: 'USA',
      reason: '',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Request New Studio</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            Can't find your city? Request a new studio location and we'll review it for approval.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={formData.cityName}
              onChangeText={(value) => handleInputChange('cityName', value)}
              placeholder="Enter city name"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>State/Province *</Text>
            <TextInput
              style={styles.input}
              value={formData.stateName}
              onChangeText={(value) => handleInputChange('stateName', value)}
              placeholder="Enter state or province"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
              maxLength={3}
            />
            <Text style={styles.hint}>Use abbreviation (e.g., SC, CA, ON)</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={formData.country}
              onChangeText={(value) => handleInputChange('country', value)}
              placeholder="Enter country"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.reason}
              onChangeText={(value) => handleInputChange('reason', value)}
              placeholder="Why do you need a studio in this location?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 25,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 35,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitButton: {
    backgroundColor: theme.colors.vibeBlue,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default RequestStudioModal;