import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import VibeInput from '../../components/ui/VibeInput';
import VibeButton from '../../components/ui/VibeButton';
import VibeLoadingScreen from '../../components/ui/VibeLoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getDefaultUserSettings, getDefaultUserMetrics } from '../../services/defaultUserSettings';
import theme from '../../theme/themes';

export default function ContactInfoScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const vibeAlert = useVibeAlert();

  const user = auth.currentUser;

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
          const contactInfo = data.userdata?.contactInfo || {};
          setFirstName(contactInfo.firstName || '');
          setLastName(contactInfo.lastName || '');
          setPhoneNumber(contactInfo.phoneNumber || '');
        } else {
          // No existing user data, so show empty form
          setFirstName('');
          setLastName('');
          setPhoneNumber('');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        vibeAlert.error('Error', 'Failed to load your info.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async () => {
    if (!firstName || (typeof firstName !== 'string') || !firstName.trim() || 
        !lastName || (typeof lastName !== 'string') || !lastName.trim() || 
        !phoneNumber || (typeof phoneNumber !== 'string') || !phoneNumber.trim()) {
      vibeAlert.warning(
        'Missing info',
        'Please enter your first name, last name, and phone number.'
      );
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      vibeAlert.warning('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    if (!user) {
      vibeAlert.error('Error', 'No user found. Please try logging in again.');
      return;
    }

    setSaving(true);
    try {
      // Get existing user data to preserve any settings that might already exist
      const docRef = doc(db, 'users', user.uid);
      const snap = await getDoc(docRef);
      const existingData = snap.exists() ? snap.data() : {};
      
      // Save contact info to user profile in userdata structure
      await setDoc(
        doc(db, 'users', user.uid),
        {
          userdata: {
            contactInfo: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phoneNumber: phoneNumber.trim(),
              email: user.email,
              displayName: `${firstName.trim()} ${lastName.trim()}`,
            },
            metadata: {
              createdAt: existingData?.userdata?.metadata?.createdAt || new Date(),
              updatedAt: new Date(),
            },
            settings: existingData?.userdata?.settings || getDefaultUserSettings(),
            metrics: existingData?.userdata?.metrics || getDefaultUserMetrics(),
          },
          uid: user.uid,
        },
        { merge: true }
      );

      console.log('Contact info saved successfully');

      // Check for and link any phone invitations to this user
      try {
        const { linkPhoneInvitationsToUser } = await import('../../events/services/invitations');
        const linkResult = await linkPhoneInvitationsToUser(phoneNumber.trim(), user.uid);
        
        if (linkResult.linkedCount > 0) {
          console.log(`Linked ${linkResult.linkedCount} phone invitations to user`);
        }

        // Also check for and auto-subscribe to events they were invited to by phone
        try {
          const { autoSubscribeToInvitedEvents } = await import('../../services/phoneAccessService');
          const autoSubResult = await autoSubscribeToInvitedEvents(user.uid, phoneNumber.trim());
          
          if (autoSubResult.subscribedEvents.length > 0) {
            console.log(`Auto-subscribed to ${autoSubResult.subscribedEvents.length} events based on phone`);
            
            const totalFound = linkResult.linkedCount + autoSubResult.subscribedEvents.length;
            vibeAlert.success(
              'Events Found!',
              `Welcome! We found ${totalFound} event${totalFound > 1 ? 's' : ''} you were invited to. Check them out!`
            );
          } else if (linkResult.linkedCount > 0) {
            vibeAlert.success(
              'Invitations Found!',
              `We found ${linkResult.linkedCount} event invitation${linkResult.linkedCount > 1 ? 's' : ''} for your phone number. Check your notifications!`
            );
          }
        } catch (autoSubError) {
          console.warn('Error auto-subscribing to invited events:', autoSubError);
          // Still show invitation linking message if that worked
          if (linkResult.linkedCount > 0) {
            vibeAlert.success(
              'Invitations Found!',
              `We found ${linkResult.linkedCount} event invitation${linkResult.linkedCount > 1 ? 's' : ''} for your phone number. Check your notifications!`
            );
          }
        }
      } catch (inviteError) {
        console.warn('Error linking phone invitations:', inviteError);
        // Don't fail signup if invitation linking fails
      }

      // Don't manually navigate - the Navigation component will automatically
      // detect completed contact info and switch to the next required screen
    } catch (err) {
      console.error('Error saving contact info:', err);
      vibeAlert.error('Error', 'Failed to save your info. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <VibeLoadingScreen 
        loadingText="Loading your profile..."
        showBranding={false}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={[styles.title, theme.shadows.textGlow]}>
            Complete Your Profile
          </Text>
          <Text style={styles.subtitle}>Help others find and connect with you</Text>

          <Text style={styles.label}>First Name</Text>
          <VibeInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            autoComplete="given-name"
            isCompleted={!!firstName?.trim()}
            maxLength={50}
            style={styles.input}
          />

          <Text style={styles.label}>Last Name</Text>
          <VibeInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            autoComplete="family-name"
            isCompleted={!!lastName?.trim()}
            maxLength={50}
            style={styles.input}
          />

          <Text style={styles.label}>Phone Number</Text>
          <VibeInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            isCompleted={!!phoneNumber?.trim()}
            maxLength={20}
            style={styles.input}
          />

          <VibeButton
            label={saving ? 'Saving...' : 'Complete Profile'}
            onPress={handleSubmit}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
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
    width: '100%',
    marginBottom: 20,
  },
});
