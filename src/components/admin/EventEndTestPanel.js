import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import VibeButton from '../ui/VibeButton';
import VibeInput from '../ui/VibeInput';
import { EventEndNotificationService } from '../../services/EventEndNotificationService';
import { EventMigrationService } from '../../services/EventMigrationService';
import { useAuth } from '../../auth/AuthContext';
import theme from '../../theme/themes';

/**
 * Admin panel for testing event end notifications
 * This is for development/testing purposes
 */
export default function EventEndTestPanel() {
  const { isAuthenticated } = useAuth();
  const [eventId, setEventId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleManualCheck = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Must be authenticated to run checks');
      return;
    }

    setIsLoading(true);
    try {
      const result = await EventEndNotificationService.checkAndNotifyEventEnds();
      setLastResult(result);
      
      Alert.alert(
        'Check Complete',
        `Checked ${result.checkedEvents} events, sent ${result.sentNotifications} notifications`
      );
    } catch (error) {
      console.error('Manual check error:', error);
      Alert.alert('Error', 'Failed to run manual check: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerForEvent = async () => {
    if (!eventId.trim()) {
      Alert.alert('Error', 'Please enter an event ID');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Error', 'Must be authenticated to trigger notifications');
      return;
    }

    setIsLoading(true);
    try {
      const result = await EventEndNotificationService.triggerAttendanceNotification(eventId.trim());
      
      if (result.success) {
        Alert.alert('Success', 'Attendance notification sent successfully!');
        setEventId('');
      } else {
        Alert.alert('Error', result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Trigger notification error:', error);
      Alert.alert('Error', 'Failed to trigger notification: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMigrations = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Must be authenticated to run migrations');
      return;
    }

    setIsLoading(true);
    try {
      const result = await EventMigrationService.runAllMigrations();
      
      Alert.alert(
        'Migration Complete',
        `Updated ${result.attendanceTracking.updatedEvents} of ${result.attendanceTracking.totalEvents} events with attendance tracking`
      );
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert('Error', 'Failed to run migrations: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Must be authenticated to use admin panel</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event End Notification Test Panel</Text>
      <Text style={styles.subtitle}>For development/testing purposes</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Check</Text>
        <Text style={styles.description}>
          Run a manual check for recently ended events
        </Text>
        <VibeButton
          label={isLoading ? 'Checking...' : 'Run Manual Check'}
          onPress={handleManualCheck}
          disabled={isLoading}
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trigger for Specific Event</Text>
        <Text style={styles.description}>
          Manually trigger attendance notification for a specific event
        </Text>
        <VibeInput
          placeholder="Enter Event ID"
          value={eventId}
          onChangeText={setEventId}
          style={styles.input}
        />
        <VibeButton
          label={isLoading ? 'Sending...' : 'Send Attendance Notification'}
          onPress={handleTriggerForEvent}
          disabled={isLoading || !eventId.trim()}
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Migrations</Text>
        <Text style={styles.description}>
          Run database migrations to update existing events with new fields
        </Text>
        <VibeButton
          label={isLoading ? 'Running...' : 'Run Event Migrations'}
          onPress={handleRunMigrations}
          disabled={isLoading}
          style={styles.button}
        />
      </View>

      {lastResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Check Result</Text>
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              Checked Events: {lastResult.checkedEvents}
            </Text>
            <Text style={styles.resultText}>
              Sent Notifications: {lastResult.sentNotifications}
            </Text>
            {lastResult.notifications && lastResult.notifications.length > 0 && (
              <View style={styles.notificationsList}>
                <Text style={styles.resultText}>Notifications sent for:</Text>
                {lastResult.notifications.map((notif, index) => (
                  <Text key={index} style={styles.eventTitle}>
                    • {notif.eventTitle}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 30,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  sectionTitle: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  button: {
    marginTop: 10,
  },
  input: {
    marginBottom: 15,
  },
  resultContainer: {
    marginTop: 10,
  },
  resultText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginBottom: 5,
  },
  notificationsList: {
    marginTop: 10,
  },
  eventTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 3,
  },
  errorText: {
    color: theme.colors.vibeRed,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});