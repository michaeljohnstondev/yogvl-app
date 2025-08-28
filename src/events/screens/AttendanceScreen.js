import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import { AttendanceService } from '../../services/AttendanceService';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { useAuth } from '../../auth/AuthContext';
import AttendanceStats from '../../components/ui/AttendanceStats';
import AttendanceCard from '../../components/ui/AttendanceCard';
import VibeButton from '../../components/ui/VibeButton';
import theme from '../../theme/themes';

export default function AttendanceScreen({ route, navigation }) {
  const { eventId, studioId } = route.params;
  const { currentUserId } = useAuth();
  const vibeAlert = useVibeAlert();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [rsvpUsers, setRsvpUsers] = useState([]);
  const [canMarkAttendance, setCanMarkAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [eventId]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      // Check if user can mark attendance (is host)  
      const canMark = await AttendanceService.canMarkAttendance(studioId, eventId, currentUserId);
      setCanMarkAttendance(canMark);

      if (!canMark) {
        vibeAlert.error('Access Denied', 'Only event hosts can manage attendance.');
        navigation.goBack();
        return;
      }

      // Load event data from studio-specific collection
      
      const eventDoc = await getDoc(doc(db, 'studios', studioId, 'events', eventId));
      if (!eventDoc.exists()) {
        vibeAlert.error('Error', 'Event not found.');
        navigation.goBack();
        return;
      }

      const eventData = { id: eventDoc.id, studioId, ...eventDoc.data() };
      setEvent(eventData);

      // Load RSVP users
      const subscribers = eventData.subscribers || [];
      const userPromises = subscribers.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return { id: userId, ...userDoc.data() };
        }
        return { id: userId, email: 'Unknown User' };
      });

      const users = await Promise.all(userPromises);
      setRsvpUsers(users);

      // Load attendance data
      const attendance = await AttendanceService.getEventAttendance(studioId, eventId);
      setAttendanceData(attendance.attendanceData);
      setAttendanceStats(attendance.stats);

    } catch (error) {
      vibeAlert.error('Error', 'Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttended = async (userId) => {
    try {
      setSaving(true);
      await AttendanceService.markAttended(eventId, userId, currentUserId);
      vibeAlert.success('Success', 'User marked as attended.');
      await loadAttendanceData(); // Refresh data
    } catch (error) {
      vibeAlert.error('Error', 'Failed to mark attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNoShow = async (userId) => {
    try {
      setSaving(true);
      await AttendanceService.markNoShow(eventId, userId, currentUserId);
      vibeAlert.warning('Marked', 'User marked as no-show.');
      await loadAttendanceData(); // Refresh data
    } catch (error) {
      vibeAlert.error('Error', 'Failed to mark no-show.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkMarkAttended = () => {
    Alert.alert(
      'Mark All Attended',
      'Mark all pending RSVPs as attended? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const pendingUsers = rsvpUsers.filter(user => {
                const attendance = attendanceData.find(a => a.userId === user.id);
                return !attendance?.attended && !attendance?.noShow;
              });

              const bulkList = pendingUsers.map(user => ({ userId: user.id, attended: true }));
              await AttendanceService.bulkMarkAttendance(eventId, bulkList, currentUserId);
              
              vibeAlert.success('Success', `Marked ${pendingUsers.length} users as attended.`);
              await loadAttendanceData();
            } catch (error) {
              vibeAlert.error('Error', 'Failed to bulk mark attendance.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const getUserAttendanceStatus = (userId) => {
    return attendanceData.find(a => a.userId === userId);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Attendance Manager</Text>
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event?.title}</Text>
          <Text style={styles.eventDate}>
            {event?.eventTimestamp?.toDate().toLocaleDateString()} at{' '}
            {event?.eventTimestamp?.toDate().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Attendance Stats */}
        <AttendanceStats stats={attendanceStats} />

        {/* Bulk Actions */}
        {attendanceStats.pendingCount > 0 && (
          <View style={styles.bulkActions}>
            <VibeButton
              label={`Mark All ${attendanceStats.pendingCount} as Attended`}
              onPress={handleBulkMarkAttended}
              variant="outline"
              disabled={saving}
              style={styles.bulkButton}
            />
          </View>
        )}

        {/* Attendance List */}
        <View style={styles.attendanceList}>
          <Text style={styles.sectionTitle}>
            RSVPs ({rsvpUsers.length})
          </Text>
          
          {rsvpUsers.map((user) => (
            <AttendanceCard
              key={user.id}
              user={user}
              attendanceStatus={getUserAttendanceStatus(user.id)}
              onMarkAttended={handleMarkAttended}
              onMarkNoShow={handleMarkNoShow}
              disabled={saving}
            />
          ))}

          {rsvpUsers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No RSVPs yet</Text>
              <Text style={styles.emptySubtext}>
                Users will appear here when they RSVP to your event
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textPrimary,
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  eventInfo: {
    padding: 20,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bulkActions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  bulkButton: {
    backgroundColor: 'rgba(0, 255, 150, 0.1)',
    borderColor: theme.colors.vibeGreen,
  },
  attendanceList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});