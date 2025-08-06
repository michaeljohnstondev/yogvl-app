import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import theme from '../themes/themes';

export default function ContactInfoScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;
  console.log('Current user in ContactInfo:', user);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setPhoneNumber(data.phoneNumber || '');
        } else {
          // No existing user data, so show empty form
          setFirstName('');
          setLastName('');
          setPhoneNumber('');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        Alert.alert('Error', 'Failed to load your info.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      Alert.alert(
        'Missing info',
        'Please enter your first name, last name, and phone number.'
      );
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No user found. Please try logging in again.');
      return;
    }

    setSaving(true);
    try {
      // Update user document with contact info AND set completion flag
      await setDoc(
        doc(db, 'users', user.uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: user.email,
          uid: user.uid,
          hasCompletedContactInfo: true, // This is key for your Navigation flow!
        },
        { merge: true } // Merge with existing data
      );

      console.log('Contact info saved successfully');

      // Don't manually navigate - the Navigation component will automatically
      // detect hasCompletedContactInfo: true and switch to the main app stack
    } catch (err) {
      console.error('Error saving contact info:', err);
      Alert.alert('Error', 'Failed to save your info. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={theme.colors.alertButton} />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      <Text style={[styles.title, theme.shadows.textGlow]}>
        Complete Your Profile
      </Text>
      <Text style={styles.subtitle}>Help others find and connect with you</Text>

      <Text style={styles.label}>First Name</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Enter your first name"
        placeholderTextColor={theme.colors.textSecondary}
      />

      <Text style={styles.label}>Last Name</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Enter your last name"
        placeholderTextColor={theme.colors.textSecondary}
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Enter your phone number"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="phone-pad"
        autoComplete="tel"
      />

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={handleSubmit}
        disabled={saving}
      >
        <LinearGradient
          colors={theme.colors.buttonGradient}
          style={[styles.button, saving && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving...' : 'Complete Profile'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.textPrimary,
    padding: theme.sizes.inputPadding,
    marginBottom: 20,
    borderRadius: theme.sizes.borderRadius,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    borderRadius: theme.sizes.buttonRadius,
    overflow: 'hidden',
  },
  button: {
    padding: 15,
    borderRadius: theme.sizes.buttonRadius,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
});
