import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import { AttendanceService } from '../../services/AttendanceService';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { useAuth } from '../../auth/AuthContext';
import AttendanceStats from '../../components/ui/events/AttendanceStats';
import AttendanceCard from '../../components/ui/events/AttendanceCard';
import { VibeButton, CloseButton } from '../../components/ui';
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
  const [showBadgeContext, setShowBadgeContext] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [eventId]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      // Check if user can mark attendance (is host or admin)
      // First get current user data to check admin status
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      const userData = userDoc.exists() ? userDoc.data() : null;

      const canMark = await AttendanceService.canMarkAttendance(
        studioId,
        eventId,
        currentUserId,
        userData
      );
      setCanMarkAttendance(canMark);

      if (!canMark) {
        vibeAlert.error(
          'Access Denied',
          'Only event hosts can manage attendance.'
        );
        navigation.goBack();
        return;
      }

      // Load event data from studio-specific collection

      const eventDoc = await getDoc(
        doc(db, 'studios', studioId, 'events', eventId)
      );
      if (!eventDoc.exists()) {
        vibeAlert.error('Error', 'Event not found.');
        navigation.goBack();
        return;
      }

      const eventData = { id: eventDoc.id, studioId, ...eventDoc.data() };
      setEvent(eventData);

      // Check if this is a solo event
      const isSoloEvent =
        eventData.subscribers?.length === 1 &&
        eventData.subscribers[0] === eventData.createdBy;

      if (isSoloEvent) {
        console.log(
          'Solo event detected - attendance metrics will not be recorded'
        );
      }

      // Load RSVP users
      const subscribers = eventData.subscribers || [];
      const userPromises = subscribers.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Extract contact info for easier access in AttendanceCard
          const contactInfo = userData.userdata?.contactInfo || {};
          return {
            id: userId,
            ...userData,
            // Flatten contact info for AttendanceCard compatibility
            firstName: contactInfo.firstName,
            lastName: contactInfo.lastName,
            email: contactInfo.email,
            displayName: contactInfo.displayName,
          };
        }
        return { id: userId, email: 'Unknown User' };
      });

      const users = await Promise.all(userPromises);
      setRsvpUsers(users);

      // Load attendance data
      const attendance = await AttendanceService.getEventAttendance(
        studioId,
        eventId
      );
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
      await AttendanceService.markAttended(
        studioId,
        eventId,
        userId,
        currentUserId
      );
      await loadAttendanceData(); // Refresh data
    } catch (error) {
      console.error('[AttendanceScreen] handleMarkAttended error:', error);
      vibeAlert.error('Error', 'Failed to mark attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkNoShow = async (userId) => {
    try {
      setSaving(true);
      await AttendanceService.markNoShow(
        studioId,
        eventId,
        userId,
        currentUserId
      );
      await loadAttendanceData(); // Refresh data
    } catch (error) {
      vibeAlert.error('Error', 'Failed to mark no-show.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      setSaving(true);

      // Optimistically update local state first
      let newAttendanceData;
      setAttendanceData(prevData => {
        const newData = [...prevData];
        const existingIndex = newData.findIndex(a => a.userId === userId);

        if (newStatus === 'pending') {
          // Remove attendance record for pending
          if (existingIndex >= 0) {
            newData.splice(existingIndex, 1);
          }
        } else {
          // Create or update attendance record
          const attendanceRecord = {
            userId,
            attended: newStatus === 'attended',
            isHost: event?.createdBy === userId,
            markedBy: currentUserId,
            markedAt: new Date(),
            isSoloEvent: event ? AttendanceService.isSoloEvent(event) : false,
          };

          if (existingIndex >= 0) {
            newData[existingIndex] = attendanceRecord;
          } else {
            newData.push(attendanceRecord);
          }
        }
        newAttendanceData = newData;
        return newData;
      });

      // Update stats optimistically using the new data
      setAttendanceStats(prevStats => {
        const newAttendedCount = newAttendanceData.filter(a => a.attended).length;
        const newNoShowCount = newAttendanceData.filter(a => !a.attended).length;
        const totalRsvp = event?.subscribers?.length || 0;

        return {
          ...prevStats,
          attendedCount: newAttendedCount,
          noShowCount: newNoShowCount,
          pendingCount: Math.max(0, totalRsvp - (newAttendedCount + newNoShowCount)),
          attendanceRate: totalRsvp > 0 ? (newAttendedCount / totalRsvp) * 100 : 0,
        };
      });

      // Perform backend update
      switch (newStatus) {
        case 'attended':
          await AttendanceService.markAttended(studioId, eventId, userId, currentUserId);
          break;
        case 'noShow':
          await AttendanceService.markNoShow(studioId, eventId, userId, currentUserId);
          break;
        case 'pending':
          await AttendanceService.clearAttendance(studioId, eventId, userId);
          break;
        default:
          throw new Error(`Unknown status: ${newStatus}`);
      }

    } catch (error) {
      console.error('[AttendanceScreen] handleStatusChange error:', error);
      vibeAlert.error('Error', 'Failed to update attendance status.');
      // Revert optimistic update on error
      await loadAttendanceData();
    } finally {
      setSaving(false);
    }
  };

  const handleBulkMarkAttended = async () => {
    try {
      setSaving(true);
      const pendingUsers = rsvpUsers.filter((user) => {
        const attendance = attendanceData.find(
          (a) => a.userId === user.id
        );
        // Only include users with no attendance record (truly pending)
        return !attendance;
      });

      if (pendingUsers.length === 0) {
        return; // No pending users to mark
      }

      // Optimistically update all pending users
      setAttendanceData(prevData => {
        const newData = [...prevData];

        pendingUsers.forEach(user => {
          const attendanceRecord = {
            userId: user.id,
            attended: true,
            isHost: event?.createdBy === user.id,
            markedBy: currentUserId,
            markedAt: new Date(),
            isSoloEvent: event ? AttendanceService.isSoloEvent(event) : false,
          };
          newData.push(attendanceRecord);
        });

        return newData;
      });

      // Update stats optimistically
      setAttendanceStats(prevStats => {
        const newAttendedCount = (prevStats.attendedCount || 0) + pendingUsers.length;
        const totalRsvp = event?.subscribers?.length || 0;
        const newPendingCount = Math.max(0, totalRsvp - newAttendedCount - (prevStats.noShowCount || 0));

        return {
          ...prevStats,
          attendedCount: newAttendedCount,
          pendingCount: newPendingCount,
          attendanceRate: totalRsvp > 0 ? (newAttendedCount / totalRsvp) * 100 : 0,
        };
      });

      // Perform backend updates
      console.log(`[AttendanceScreen] Starting bulk mark for ${pendingUsers.length} users:`, pendingUsers.map(u => u.id));

      const promises = pendingUsers.map((user) =>
        AttendanceService.markAttended(studioId, eventId, user.id, currentUserId)
          .then(result => {
            console.log(`[AttendanceScreen] Successfully marked ${user.id} as attended:`, result);
            return { userId: user.id, success: true, result };
          })
          .catch(error => {
            console.error(`[AttendanceScreen] Failed to mark ${user.id} as attended:`, error);
            return { userId: user.id, success: false, error };
          })
      );

      const results = await Promise.all(promises);

      // Log results summary
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`[AttendanceScreen] Bulk mark results: ${successful.length} succeeded, ${failed.length} failed`);

      if (failed.length > 0) {
        console.error('[AttendanceScreen] Failed operations:', failed);
        throw new Error(`${failed.length} operations failed`);
      }
    } catch (error) {
      vibeAlert.error('Error', 'Failed to bulk mark attendance.');
      // Revert optimistic update on error
      await loadAttendanceData();
    } finally {
      setSaving(false);
    }
  };

  const getUserAttendanceStatus = (userId) => {
    return attendanceData.find((a) => a.userId === userId);
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <CloseButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Attendance Manager</Text>
        </View>

        {/* Event Type Badge */}
        <View style={styles.eventInfo}>
          <View style={styles.eventTypeContainer}>
            <TouchableOpacity
              style={[
                styles.eventTypeBadge,
                {
                  backgroundColor:
                    event?.attendanceType === 'strict'
                      ? 'rgba(253, 126, 20, 0.1)'
                      : 'rgba(0, 198, 255, 0.1)',
                  borderColor:
                    event?.attendanceType === 'strict' ? '#fd7e14' : '#00C6FF',
                },
              ]}
              onPressIn={() => setShowBadgeContext(true)}
              onPressOut={() => setShowBadgeContext(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.eventTypeBadgeText}>
                {event?.attendanceType === 'strict'
                  ? '🎯 Strict Event'
                  : '🌊 Casual Event'}
              </Text>
            </TouchableOpacity>

            {/* Only show context for casual events when pressed */}
            {event?.attendanceType === 'casual' && showBadgeContext && (
              <Text style={styles.eventTypeContext}>
                No-shows are tracked but won't affect reliability
              </Text>
            )}

            {/* Always show context for strict events */}
            {event?.attendanceType === 'strict' && (
              <Text style={styles.eventTypeContext}>
                No-shows will affect user reliability scores
              </Text>
            )}

            {/* Solo event warning */}
            {event?.subscribers?.length === 1 &&
              event.subscribers[0] === event.createdBy && (
                <View style={styles.soloEventWarning}>
                  <Text style={styles.soloEventWarningText}>
                    📊 Solo Event - No metrics recorded
                  </Text>
                </View>
              )}
          </View>
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
          <Text style={styles.sectionTitle}>RSVPs ({rsvpUsers.length})</Text>

          {rsvpUsers.map((user) => (
            <AttendanceCard
              key={user.id}
              user={user}
              attendanceStatus={getUserAttendanceStatus(user.id)}
              onMarkAttended={handleMarkAttended}
              onMarkNoShow={handleMarkNoShow}
              onStatusChange={handleStatusChange}
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
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  eventTypeContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  eventTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  eventTypeBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  eventTypeContext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 280,
  },
  soloEventWarning: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFA500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  soloEventWarningText: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: theme.fonts.main,
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
