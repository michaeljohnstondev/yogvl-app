// components/EventTipsModal.js - MANUAL TRIGGER VERSION
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import VibeButton from './VibeButton';
import { useAuth } from '../AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const { height: screenHeight } = Dimensions.get('window');

const EventTipsModal = ({
  type = 'create',
  visible,
  onClose,
  forceShow = false,
}) => {
  const { currentUserId, userData } = useAuth();

  const getTipsContent = () => {
    switch (type) {
      case 'create':
        return {
          title: 'Event Tips',
          subtitle: '',
          tips: [
            {
              icon: '📍',
              title: 'Be Location Specific',
              detail:
                'Include the full address, building name, or specific meeting spot. Help people find you easily!',
            },
            {
              icon: '📝',
              title: 'Clear Event Details',
              detail:
                'Explain what to expect, what to bring, dress code, or any special requirements.',
            },
            {
              icon: '👥',
              title: 'Set Realistic Limits',
              detail:
                'Consider your space and capacity. Better to have a full, intimate event than an empty large one.',
            },
            {
              icon: '✅',
              title: 'Show Up & Engage',
              detail:
                'Attend your own events! Be responsive to questions and follow up with attendees.',
            },
          ],
        };

      case 'edit':
        return {
          title: 'Event Editing Tips',
          subtitle: '',
          tips: [
            {
              icon: '📢',
              title: 'Communicate Changes',
              detail:
                'Major changes should be announced to current attendees outside the app too.',
            },
            {
              icon: '⏰',
              title: 'Avoid Last-Minute Changes',
              detail:
                "Don't change date/time close to the event start. People may have made plans.",
            },
            {
              icon: '📄',
              title: 'Update Details',
              detail:
                'Add new information that attendees might need, like parking info or schedule changes.',
            },
          ],
        };

      case 'first-time':
        return {
          title: 'Welcome to Events!',
          subtitle: '',
          tips: [
            {
              icon: '🌟',
              title: 'Start Small',
              detail:
                "Your first event doesn't need to be huge. Focus on creating a quality experience.",
            },
            {
              icon: '📸',
              title: 'Share Afterward',
              detail:
                'Consider sharing photos or updates after the event to build community engagement.',
            },
            {
              icon: '💬',
              title: 'Get Feedback',
              detail:
                'Ask attendees what they enjoyed and what could be improved for future events.',
            },
            {
              icon: '🚀',
              title: 'Keep Creating',
              detail:
                'Each event teaches you something. Keep experimenting and building community!',
            },
          ],
        };

      default:
        return { title: 'Tips', subtitle: '', tips: [] };
    }
  };

  const handleDismiss = async (dontShowAgain = false) => {
    if (dontShowAgain && currentUserId && !forceShow) {
      try {
        const userRef = doc(db, 'users', currentUserId);
        const dismissedTips = userData?.dismissedTips || [];

        if (!dismissedTips.includes(type)) {
          await updateDoc(userRef, {
            dismissedTips: [...dismissedTips, type],
            lastActivity: new Date(),
          });
        }
      } catch (error) {
        console.error('Error saving tip dismissal:', error);
      }
    }

    onClose();
  };

  if (!visible) return null;

  const content = getTipsContent();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => handleDismiss(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>💡 {content.title}</Text>
              {content.subtitle ? (
                <Text style={styles.subtitle}>{content.subtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleDismiss(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tips List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {content.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipIcon}>{tip.icon}</Text>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                </View>
                <Text style={styles.tipDetail}>{tip.detail}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Simplified hook - only manual trigger
export const useEventTips = (type) => {
  const [showTips, setShowTips] = useState(false);

  const closeTips = () => setShowTips(false);
  const showTipsManually = () => setShowTips(true);

  return {
    showTips,
    closeTips,
    showTipsManually,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    height: '95%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tipItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 26,
    marginRight: 16,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  tipDetail: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
});

export default EventTipsModal;
