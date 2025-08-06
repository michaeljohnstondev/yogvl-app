import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import VibeInput from '../components/VibeInput';
import VibeButton from '../components/VibeButton';
import VibeButtonPlain from '../components/VibeButtonPlain';
import ReliabilityWarning from '../components/ReliabilityWarning';
import EventTipsModal, { useEventTips } from '../components/EventTipsModal';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import {
  validateEventForm,
  formatEventForStorage,
  validateEventDateTime,
} from '../utils/eventFormValidation';
import { getUserEventPermissions, isPastEvent } from '../utils/eventUtils';

export default function EditEventScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { currentUserId, userData } = useAuth();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [maxGuests, setMaxGuests] = useState('');
  const [pickerMode, setPickerMode] = useState(null);
  const [dateSelected, setDateSelected] = useState(true); // Always true for edit
  const [timeSelected, setTimeSelected] = useState(true); // Always true for edit
  const [eventTimeZone, setEventTimeZone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [event, setEvent] = useState(null);

  // Tips modal management
  const { showTips, closeTips, showTipsManually } = useEventTips('edit');

  const validateEventTime = (skipPastCheck = false) => {
    // Use the extracted utility with custom logic for editing
    const basicValidation = validateEventDateTime(date, time);

    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Additional edit-specific validation
    if (!skipPastCheck && event) {
      const timeZone =
        eventTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eventDateTime = DateTime.fromObject(
        {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: time.getHours(),
          minute: time.getMinutes(),
        },
        { zone: timeZone }
      );

      const now = DateTime.now().setZone(timeZone);
      const originalEventTime = event.eventTimestamp
        ? DateTime.fromJSDate(event.eventTimestamp.toDate()).setZone(timeZone)
        : DateTime.fromISO(event.utcDateTime).setZone(timeZone);

      // If original event was in future, don't allow moving to past
      if (
        originalEventTime > now &&
        eventDateTime <= now.minus({ minutes: 5 })
      ) {
        return {
          isValid: false,
          message:
            'Cannot move a future event to the past. Please select a future date and time.',
        };
      }
    }

    return { isValid: true };
  };

  useFocusEffect(
    useCallback(() => {
      const loadEvent = async () => {
        try {
          setLoading(true);
          const ref = doc(db, 'events', eventId);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            const eventData = { id: snap.id, ...snap.data() };
            setEvent(eventData);

            // Populate form fields
            setTitle(eventData.title || '');
            setLocation(eventData.location || '');
            setDetails(eventData.desc || '');
            setMaxGuests(eventData.maxGuests?.toString() || '');
            setEventTimeZone(eventData.eventTimeZone || 'America/New_York');

            // Handle the date/time structure
            if (eventData.originalDate && eventData.originalTime) {
              setDate(new Date(eventData.originalDate));
              const [hour, minute] = eventData.originalTime.split(':');
              const timeObj = new Date();
              timeObj.setHours(parseInt(hour), parseInt(minute));
              setTime(timeObj);
            } else if (eventData.utcDateTime) {
              // Fallback to utcDateTime if originalDate/originalTime don't exist
              const utcDate = new Date(eventData.utcDateTime);
              setDate(utcDate);
              setTime(utcDate);
            }
          } else {
            Alert.alert('Error', 'Event not found.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
          }
        } catch (err) {
          console.error('Failed to fetch event:', err);
          Alert.alert('Error', 'Failed to load event.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } finally {
          setLoading(false);
        }
      };

      loadEvent();
    }, [eventId])
  );

  // Get user permissions using utility
  const permissions = getUserEventPermissions(currentUserId, userData, event);

  // Check permissions after event loads
  useEffect(() => {
    if (event && !loading && !permissions.canEdit) {
      Alert.alert('Access Denied', 'You can only edit events you created.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [event, loading, permissions.canEdit]);

  const handleUpdate = async () => {
    if (!permissions.canEdit) {
      Alert.alert('Error', 'You do not have permission to edit this event.');
      return;
    }

    // Use extracted form validation
    const formData = {
      title,
      location,
      dateSelected,
      timeSelected,
      maxGuests,
      date,
      time,
    };

    const validation = validateEventForm(formData);
    if (!validation.isValid) {
      Alert.alert('Error', validation.message);
      return;
    }

    // Additional edit-specific validation
    const timeValidation = validateEventTime();
    if (!timeValidation.isValid) {
      Alert.alert('Invalid Date/Time', timeValidation.message);
      return;
    }

    // Check if reducing max guests below current subscriber count
    const newMaxGuests = maxGuests ? parseInt(maxGuests) : null;
    const currentSubscriberCount = event.subscriberCount || 0;

    if (newMaxGuests && newMaxGuests < currentSubscriberCount) {
      Alert.alert(
        'Warning',
        `This event currently has ${currentSubscriberCount} subscribers, but you're setting the limit to ${newMaxGuests}. This may cause issues.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => performUpdate() },
        ]
      );
      return;
    }

    performUpdate();
  };

  const performUpdate = async () => {
    setUpdating(true);

    try {
      // Use extracted formatting utility (modified for edit)
      const eventData = formatEventForStorage(
        { title, location, details, date, time, maxGuests },
        currentUserId
      );

      // Track what changed for future notifications
      const changes = [];
      const originalEvent = event;

      if (originalEvent.title !== eventData.title) {
        changes.push('title');
      }
      if (originalEvent.location !== eventData.location) {
        changes.push('location');
      }
      if (originalEvent.desc !== eventData.desc) {
        changes.push('details');
      }
      if (originalEvent.maxGuests !== eventData.maxGuests) {
        changes.push('capacity');
      }

      // Check if date/time changed
      const originalDateTime = originalEvent.utcDateTime;
      const newDateTime = eventData.utcDateTime;
      if (originalDateTime !== newDateTime) {
        changes.push('datetime');
      }

      // Only track changes if there are actual changes
      const hasChanges = changes.length > 0;
      const subscribersToNotify = hasChanges
        ? (originalEvent.subscribers || []).filter((id) => id !== currentUserId)
        : [];

      // Update with edit-specific fields
      const updateData = {
        title: eventData.title,
        location: eventData.location,
        desc: eventData.desc,
        originalDate: eventData.originalDate,
        originalTime: eventData.originalTime,
        utcDateTime: eventData.utcDateTime,
        eventTimestamp: Timestamp.fromDate(eventData.eventTimestamp),
        eventTimeZone: eventData.eventTimeZone,
        maxGuests: eventData.maxGuests,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserId, // Track who made the update
      };

      // Add change tracking if there are changes
      if (hasChanges) {
        updateData.lastChanges = changes;
        updateData.lastChangeTimestamp = Timestamp.now();
        updateData.subscribersToNotify = subscribersToNotify;
        updateData.changesRequireNotification = true;

        console.log('Event changes detected:', {
          changes,
          subscribersToNotify: subscribersToNotify.length,
          eventId,
        });
      }

      await updateDoc(doc(db, 'events', eventId), updateData);

      // Show success message with change info
      const changeMessage = hasChanges
        ? `Event updated successfully! ${subscribersToNotify.length} attendees will be notified of changes.`
        : 'Event updated successfully!';

      Alert.alert('Success!', changeMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to update event:', err);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!permissions.canDelete) {
      Alert.alert('Error', 'You do not have permission to delete this event.');
      return;
    }

    const subscriberCount = event.subscriberCount || 0;
    const warningMessage =
      subscriberCount > 1
        ? `This event has ${subscriberCount} subscribers who will lose access. This action cannot be undone.`
        : 'This action cannot be undone.';

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? ${warningMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    setDeleting(true);

    try {
      await deleteDoc(doc(db, 'events', eventId));
      Alert.alert('Deleted', 'Event has been deleted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to delete event:', err);
      Alert.alert('Error', 'Failed to delete event. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!permissions.canEdit) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>You cannot edit this event</Text>
        <Text style={styles.errorSubtext}>
          Only the event creator or admins can make changes
        </Text>
        <VibeButton
          label="GO BACK"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  const isEventPast = isPastEvent(event);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Edit Event</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={showTipsManually}
            activeOpacity={0.7}
          >
            <Text style={styles.helpButtonText}>💡</Text>
          </TouchableOpacity>
        </View>

        {/* Reliability Warning */}
        <ReliabilityWarning userData={userData} context="edit" />

        {isEventPast && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ This event has already ended
            </Text>
          </View>
        )}

        {/* Tips Modal */}
        <EventTipsModal type="edit" visible={showTips} onClose={closeTips} />

        <Text style={styles.label}>Event Name *</Text>
        <VibeInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter event name"
          maxLength={100}
        />

        <Text style={styles.label}>When *</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={date.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              onPress={() => setPickerMode('date')}
            />
          </View>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={time.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
              onPress={() => setPickerMode('time')}
            />
          </View>
        </View>

        {pickerMode && (
          <DateTimePickerModal
            isVisible={true}
            mode={pickerMode}
            date={pickerMode === 'date' ? date : time}
            onConfirm={(selected) => {
              if (pickerMode === 'date') setDate(selected);
              else setTime(selected);
              setPickerMode(null);
            }}
            onCancel={() => setPickerMode(null)}
          />
        )}

        <Text style={styles.label}>Location *</Text>
        <VibeInput
          value={location}
          onChangeText={setLocation}
          placeholder="Enter event location"
          maxLength={200}
        />

        <Text style={styles.label}>Max Guests (optional)</Text>
        <VibeInput
          value={maxGuests}
          onChangeText={setMaxGuests}
          keyboardType="numeric"
          maxLength={4}
        />
        {event?.subscriberCount > 0 && (
          <Text style={styles.helperText}>
            Currently {event.subscriberCount} people subscribed
          </Text>
        )}

        <Text style={styles.label}>Details</Text>
        <VibeInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder="Add event details..."
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          maxLength={500}
        />

        <View style={styles.buttonContainer}>
          <VibeButton
            label={updating ? 'UPDATING...' : 'UPDATE EVENT'}
            onPress={handleUpdate}
            variant="filled"
            disabled={updating || deleting}
            style={[
              styles.updateButton,
              (updating || deleting) && styles.disabledButton,
            ]}
          />

          <VibeButton
            label={deleting ? 'DELETING...' : 'DELETE EVENT'}
            onPress={handleDelete}
            variant="outline"
            disabled={updating || deleting}
            style={[
              styles.deleteButton,
              (updating || deleting) && styles.disabledButton,
            ]}
          />
        </View>

        <Text style={styles.helpText}>
          * Required fields{'\n'}
          {event?.createdAt &&
            `Created ${event.createdAt.toDate().toLocaleDateString()}`}
          {event?.updatedAt &&
            ` • Last updated ${event.updatedAt.toDate().toLocaleDateString()}`}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#000',
  },
  scrollContent: { paddingBottom: 100 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  helpButtonText: {
    fontSize: 18,
  },
  label: {
    marginTop: 20,
    marginBottom: 5,
    fontWeight: '600',
    color: '#fff',
    fontSize: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
  buttonContainer: {
    marginTop: 25,
  },
  updateButton: {
    marginBottom: 8,
  },
  deleteButton: {
    borderColor: '#ff6b6b',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  warningBanner: {
    backgroundColor: '#ff6b6b20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  warningText: {
    color: '#ff6b6b',
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
