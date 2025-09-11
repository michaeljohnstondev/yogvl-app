import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  limit,
  orderBy,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { Logger } from '../lib/logger';

export class ReliabilityService {
  
  // Reliability tier thresholds
  static RELIABILITY_TIERS = {
    EXCELLENT: { min: 90, label: 'Excellent', color: '#00FF96', emoji: '🌟' },
    GOOD: { min: 75, label: 'Good', color: '#00C6FF', emoji: '✅' },
    FAIR: { min: 60, label: 'Fair', color: '#FF9800', emoji: '⚠️' },
    POOR: { min: 40, label: 'Poor', color: '#FF6B6B', emoji: '❌' },
    UNRELIABLE: { min: 0, label: 'Unreliable', color: '#F44336', emoji: '🚫' },
  };

  /**
   * Calculate comprehensive user reliability score
   * @param {string} userId - User ID
   * @param {string} studioId - Studio ID (required for querying events)
   * @returns {Promise<Object>} Reliability data with score, tier, and metrics
   */
  static async calculateUserReliability(userId, studioId = null) {
    try {
      if (!studioId) {
        // Try to get user's studio from their profile
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          studioId = userData?.userdata?.studioId || userData?.studioId;
        }
        
        if (!studioId) {
          Logger.warn('ReliabilityService', 'No studio ID found for user, using fallback data', { userId });
          // Return default reliability data for users without studio context
          return this.getDefaultReliabilityData();
        }
      }

      // Query studio-specific events collection
      const eventsRef = collection(db, 'studios', studioId, 'events');
      const q = query(
        eventsRef,
        where('subscribers', 'array-contains', userId),
        orderBy('eventTimestamp', 'desc'),
        limit(100)
      );
      
      const eventsSnapshot = await getDocs(q);
      
      let totalRSVPs = 0;
      let totalAttended = 0;
      let totalNoShows = 0;
      let recentEvents = 0;
      let recentAttended = 0;
      let lastMinuteCancellations = 0;
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const events = [];

      Logger.debug('ReliabilityService', 'Processing events for reliability calculation', { 
        eventCount: eventsSnapshot.docs.length,
        userId,
        studioId
      });

      // Check each event for this user's participation
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();
        const eventDate = eventData.eventTimestamp?.toDate() || new Date(0);
        
        // Skip future events
        if (eventDate > now) continue;

        // Check if this is a solo event (host only) - exclude from metrics
        const isSoloEvent = eventData.subscribers?.length === 1 && 
                           eventData.subscribers[0] === eventData.createdBy;
        
        if (isSoloEvent) {
          Logger.debug('ReliabilityService', 'Skipping solo event from metrics', { eventId });
          continue; // Skip solo events entirely
        }

        totalRSVPs++;
        
        // Check if it's a recent event (last 30 days)
        const isRecent = eventDate >= thirtyDaysAgo;
        if (isRecent) {
          recentEvents++;
        }

        // Get attendance data from the event's attendance array
        const attendance = eventData.attendance || [];
        const userAttendance = attendance.find(a => a.userId === userId);
        
        if (userAttendance && !userAttendance.isSoloEvent) {
          if (userAttendance.attended) {
            totalAttended++;
            if (isRecent) recentAttended++;
          } else {
            totalNoShows++;
          }
          
          events.push({
            eventId,
            eventDate,
            attended: userAttendance.attended,
            noShow: !userAttendance.attended,
            // Don't store event titles to reduce memory usage
          });
        }

        // Check for last-minute cancellations (left event within 24 hours)
        if (eventData.cancellations?.includes(userId)) {
          const cancellationTime = eventData.cancellationTimes?.[userId];
          if (cancellationTime) {
            const timeDiff = eventDate.getTime() - cancellationTime.toDate().getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            if (hoursDiff <= 24) {
              lastMinuteCancellations++;
            }
          }
        }
      }

      // Calculate base reliability score
      let reliabilityScore = 100;
      
      if (totalRSVPs > 0) {
        const attendanceRate = (totalAttended / totalRSVPs) * 100;
        const noShowPenalty = (totalNoShows / totalRSVPs) * 100;
        const lastMinutePenalty = (lastMinuteCancellations / totalRSVPs) * 50;
        
        reliabilityScore = Math.max(0, attendanceRate - (noShowPenalty * 1.5) - lastMinutePenalty);
      }

      // Weight recent performance more heavily (70% recent, 30% historical)
      if (recentEvents > 0 && totalRSVPs > recentEvents) {
        const recentRate = (recentAttended / recentEvents) * 100;
        const historicalRate = reliabilityScore;
        reliabilityScore = (recentRate * 0.7) + (historicalRate * 0.3);
      }

      // Apply bonuses and penalties
      const bonuses = this.calculateBonuses(totalRSVPs, totalAttended, events);
      const penalties = this.calculatePenalties(totalNoShows, lastMinuteCancellations);
      
      reliabilityScore = Math.max(0, Math.min(100, reliabilityScore + bonuses - penalties));

      // Get reliability tier
      const tier = this.getReliabilityTier(reliabilityScore);

      // Calculate streak data
      const streaks = this.calculateStreaks(events);

      return {
        reliabilityScore: Math.round(reliabilityScore),
        tier,
        metrics: {
          totalRSVPs,
          totalAttended,
          totalNoShows,
          lastMinuteCancellations,
          recentEvents,
          recentAttended,
          attendanceRate: totalRSVPs > 0 ? Math.round((totalAttended / totalRSVPs) * 100) : 100,
          recentAttendanceRate: recentEvents > 0 ? Math.round((recentAttended / recentEvents) * 100) : 100,
        },
        streaks,
        lastUpdated: serverTimestamp(),
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get default reliability data for users without event history
   * @returns {Object} Default reliability data
   */
  static getDefaultReliabilityData() {
    return {
      reliabilityScore: 100, // New users get benefit of doubt
      tier: { label: 'New User', color: '#00C6FF', emoji: '🆕' },
      metrics: {
        totalRSVPs: 0,
        totalAttended: 0,
        totalNoShows: 0,
        lastMinuteCancellations: 0,
        recentEvents: 0,
        recentAttended: 0,
        attendanceRate: 100,
        recentAttendanceRate: 100,
      },
      streaks: {
        currentAttendanceStreak: 0,
        longestAttendanceStreak: 0,
        currentNoShowStreak: 0,
      },
      lastUpdated: serverTimestamp(),
    };
  }

  /**
   * Calculate bonus points for good behavior
   */
  static calculateBonuses(totalRSVPs, totalAttended, events) {
    let bonuses = 0;
    
    // Long-term reliability bonus (10+ events with 90%+ attendance)
    if (totalRSVPs >= 10 && (totalAttended / totalRSVPs) >= 0.9) {
      bonuses += 5;
    }
    
    // Perfect attendance streaks
    const streaks = this.calculateStreaks(events);
    if (streaks.currentAttendanceStreak >= 5) {
      bonuses += Math.min(10, streaks.currentAttendanceStreak - 4); // Max 10 bonus points
    }
    
    // Consistent participation (attended at least 1 event per month for 3+ months)
    const monthlyParticipation = this.calculateMonthlyParticipation(events);
    if (monthlyParticipation >= 3) {
      bonuses += 3;
    }
    
    return bonuses;
  }

  /**
   * Calculate penalty points for bad behavior
   */
  static calculatePenalties(totalNoShows, lastMinuteCancellations) {
    let penalties = 0;
    
    // No-show penalties (escalating)
    if (totalNoShows > 0) {
      penalties += totalNoShows * 5; // 5 points per no-show
      if (totalNoShows >= 3) penalties += 10; // Additional penalty for frequent no-shows
    }
    
    // Last-minute cancellation penalties
    if (lastMinuteCancellations > 0) {
      penalties += lastMinuteCancellations * 3; // 3 points per last-minute cancellation
    }
    
    return penalties;
  }

  /**
   * Calculate attendance streaks
   */
  static calculateStreaks(events) {
    const sortedEvents = events
      .filter(e => e.attended !== undefined) // Only events with attendance data
      .sort((a, b) => b.eventDate - a.eventDate); // Most recent first
    
    let currentAttendanceStreak = 0;
    let longestAttendanceStreak = 0;
    let currentNoShowStreak = 0;
    let tempAttendanceStreak = 0;
    
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      
      if (event.attended) {
        if (i === currentAttendanceStreak) {
          currentAttendanceStreak++;
        }
        tempAttendanceStreak++;
        currentNoShowStreak = 0;
      } else {
        if (i === currentNoShowStreak) {
          currentNoShowStreak++;
        }
        longestAttendanceStreak = Math.max(longestAttendanceStreak, tempAttendanceStreak);
        tempAttendanceStreak = 0;
        currentAttendanceStreak = 0;
      }
    }
    
    longestAttendanceStreak = Math.max(longestAttendanceStreak, tempAttendanceStreak);
    
    return {
      currentAttendanceStreak,
      longestAttendanceStreak,
      currentNoShowStreak,
    };
  }

  /**
   * Calculate monthly participation consistency
   */
  static calculateMonthlyParticipation(events) {
    const monthlyCount = {};
    
    events.forEach(event => {
      if (event.attended) {
        const monthKey = event.eventDate.getFullYear() + '-' + event.eventDate.getMonth();
        monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
      }
    });
    
    return Object.keys(monthlyCount).length;
  }

  /**
   * Get reliability tier based on score
   */
  static getReliabilityTier(score) {
    const tiers = Object.values(this.RELIABILITY_TIERS);
    for (const tier of tiers) {
      if (score >= tier.min) {
        return tier;
      }
    }
    return this.RELIABILITY_TIERS.UNRELIABLE;
  }

  /**
   * Update user's reliability in their profile
   * @param {string} userId - User ID
   * @param {boolean} forceUpdate - Force update even if recently calculated
   * @param {string} studioId - Studio ID (optional, will be fetched if not provided)
   * @returns {Promise<Object>} Updated reliability data
   */
  static async updateUserReliability(userId, forceUpdate = false, studioId = null) {
    try {
      // Check if we need to update (avoid excessive recalculation)
      if (!forceUpdate) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const reliabilityData = userData?.userdata?.metrics?.reliability;
          const lastUpdate = reliabilityData?.lastUpdated?.toDate();
          
          if (lastUpdate) {
            const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
            
            // Only update if it's been more than 1 hour since last calculation
            if (hoursSinceUpdate < 1) {
              Logger.debug('ReliabilityService', 'Using cached reliability data', { 
                hoursSinceUpdate: Math.round(hoursSinceUpdate * 100) / 100 
              });
              
              return {
                reliabilityScore: reliabilityData.score || 100,
                tier: this.getReliabilityTier(reliabilityData.score || 100),
                metrics: reliabilityData.metrics || {},
                streaks: reliabilityData.streaks || {},
                lastUpdated: reliabilityData.lastUpdated,
                fromCache: true
              };
            }
          }
        }
      }

      Logger.time('ReliabilityCalculation');
      const reliabilityData = await this.calculateUserReliability(userId, studioId);
      Logger.timeEnd('ReliabilityCalculation');
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'userdata.metrics.reliability': {
          score: reliabilityData.reliabilityScore,
          tier: reliabilityData.tier.label,
          metrics: reliabilityData.metrics,
          streaks: reliabilityData.streaks,
          lastUpdated: reliabilityData.lastUpdated,
        }
      });

      Logger.service('ReliabilityService', 'Updated user reliability', reliabilityData.reliabilityScore);

      return reliabilityData;
    } catch (error) {
      Logger.error('ReliabilityService', 'Failed to update user reliability', error);
      throw error;
    }
  }

  /**
   * Get reliability warning for user based on their score
   * @param {Object} reliabilityData - User's reliability data
   * @returns {Object|null} Warning data or null if no warning needed
   */
  static getReliabilityWarning(reliabilityData) {
    const { reliabilityScore, metrics, streaks } = reliabilityData;
    
    // Critical warnings
    if (reliabilityScore < 40) {
      return {
        level: 'critical',
        title: 'Reliability Risk',
        message: 'This user has a poor attendance record. Consider if this event is a good fit.',
        color: '#F44336',
      };
    }
    
    // High no-show streak warning
    if (streaks.currentNoShowStreak >= 2) {
      return {
        level: 'warning',
        title: 'Recent No-Shows',
        message: `User has ${streaks.currentNoShowStreak} consecutive no-shows.`,
        color: '#FF9800',
      };
    }
    
    // Low recent attendance
    if (metrics.recentEvents >= 3 && metrics.recentAttendanceRate < 60) {
      return {
        level: 'caution',
        title: 'Low Recent Attendance',
        message: `Only ${metrics.recentAttendanceRate}% attendance in recent events.`,
        color: '#FF9800',
      };
    }
    
    return null;
  }

  /**
   * Convert reliability score to star rating (1-5 stars with decimal support)
   * @param {number} score - Reliability score (0-100)
   * @returns {number} Star rating (1-5, rounded to 1 decimal place)
   */
  static scoreToStars(score) {
    // Convert 0-100 score to 1-5 stars with linear mapping
    // Map 0-100 to 1-5: ((score / 100) * 4) + 1
    let stars = ((score / 100) * 4) + 1;
    
    // Ensure we stay within 1-5 range and round to 1 decimal place
    stars = Math.max(1, Math.min(5, stars));
    return Math.round(stars * 10) / 10;
  }

  /**
   * Format star rating display
   * @param {number} stars - Number of stars (1-5, with decimals)
   * @returns {string} Formatted star display
   */
  static formatStarDisplay(stars) {
    const fullStars = '⭐'.repeat(Math.floor(stars));
    const decimal = stars % 1;
    const hasPartialStar = decimal > 0;
    const halfStar = hasPartialStar ? '✨' : ''; // Use half star for any decimal
    const totalFilledStars = Math.floor(stars) + (hasPartialStar ? 1 : 0);
    const emptyStars = '☆'.repeat(Math.max(0, 5 - totalFilledStars));
    
    return `${fullStars}${halfStar}${emptyStars}`;
  }

  /**
   * Get user reliability display data
   * @param {Object} userData - User document data
   * @returns {Object} Display-ready reliability data
   */
  static getUserReliabilityDisplay(userData) {
    const reliabilityData = userData?.userdata?.metrics?.reliability || {};
    const metrics = reliabilityData.metrics || {};
    
    // Don't give perfect score to users with no event history
    // Show "New Host" for users without sufficient event history
    const hasEventHistory = (metrics.totalRSVPs || 0) >= 3; // Require at least 3 events
    const isNewUser = !hasEventHistory;
    
    if (isNewUser) {
      // Special display for new hosts
      return {
        score: null, // No numeric score yet
        stars: null, // No star rating yet
        tier: { label: 'New Host', color: '#00C6FF', emoji: '🆕' }, // Custom tier for new hosts
        metrics,
        streaks: {
          currentAttendanceStreak: 0,
          longestAttendanceStreak: 0,
          currentNoShowStreak: 0
        },
        isNewUser: true,
        warning: null, // No warnings for new users
        displayText: `🆕 New Host`,
        shortDisplayText: `New`,
      };
    }
    
    // Existing users with event history
    const score = reliabilityData.score || 70; // Default to "Good" if no score calculated yet
    const tier = this.getReliabilityTier(score);
    const streaks = reliabilityData.streaks || {
      currentAttendanceStreak: 0,
      longestAttendanceStreak: 0,
      currentNoShowStreak: 0
    };
    
    // Convert score to stars and format display
    const stars = this.scoreToStars(score);
    const starDisplay = this.formatStarDisplay(stars);
    
    return {
      score,
      stars,
      tier,
      metrics,
      streaks,
      isNewUser: false,
      warning: this.getReliabilityWarning({ reliabilityScore: score, metrics, streaks }),
      displayText: `${starDisplay} ${stars}/5 ${tier.label}`,
      shortDisplayText: `${stars}/5`,
    };
  }

  // ========== MIGRATED USER METRICS FUNCTIONS ==========
  // These functions were moved from events/lib/userMetrics.js to centralize
  // all reliability and metrics logic in one service

  /**
   * Updates user metrics when they attend an event
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {string} attendanceType - Event attendance type ('strict', 'casual', 'open')
   */
  static async updateEventAttendance(userId, eventId, attendanceType = 'casual') {
    try {
      Logger.debug('ReliabilityService', 'Updating attendance metrics', { userId, eventId, attendanceType });
      const userRef = doc(db, 'users', userId);

      const updateData = {
        'userdata.metrics.events.attended': increment(1),
        'userdata.metrics.events.attendedEvents': arrayUnion(eventId),
        'userdata.metrics.events.lastEventAttended': serverTimestamp(),
        'userdata.metrics.events.lastActivity': serverTimestamp(),
      };
      
      await updateDoc(userRef, updateData);
      Logger.debug('ReliabilityService', 'Successfully updated attendance metrics', { userId });
      return { success: true };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating attendance metrics', error);
      return { success: false, error };
    }
  }

  /**
   * Updates user metrics when they have a no-show
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {string} attendanceType - Event attendance type
   */
  static async updateNoShow(userId, eventId, attendanceType = 'strict') {
    try {
      Logger.debug('ReliabilityService', 'Updating no-show metrics', { userId, eventId, attendanceType });
      const userRef = doc(db, 'users', userId);

      const updateData = {
        'userdata.metrics.events.noShows': increment(1),
        'userdata.metrics.events.noShowEvents': arrayUnion(eventId),
        'userdata.metrics.events.lastActivity': serverTimestamp(),
      };

      // Only impact reliability for strict events
      if (attendanceType === 'strict') {
        updateData['userdata.metrics.reliability.lastImpact'] = serverTimestamp();
        updateData['userdata.metrics.reliability.strictNoShows'] = increment(1);
      }

      await updateDoc(userRef, updateData);
      Logger.debug('ReliabilityService', 'Successfully updated no-show metrics', { userId });
      return { success: true };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating no-show metrics', error);
      return { success: false, error };
    }
  }

  /**
   * Updates user metrics when they subscribe to an event
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   */
  static async updateEventSubscription(userId, eventId) {
    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'userdata.metrics.events.subscribedEvents': arrayUnion(eventId),
        'userdata.metrics.events.joined': increment(1),
        'userdata.metrics.events.lastActivity': serverTimestamp(),
      });

      Logger.debug('ReliabilityService', 'Updated subscription metrics', { userId });
      return { success: true };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating subscription metrics', error);
      
      // If the structure doesn't exist, initialize it
      try {
        Logger.debug('ReliabilityService', 'Initializing metrics structure', { userId });
        await updateDoc(userRef, {
          'userdata.metrics.events.created': 0,
          'userdata.metrics.events.joined': 1,
          'userdata.metrics.events.attended': 0,
          'userdata.metrics.events.noShows': 0,
          'userdata.metrics.events.subscribedEvents': [eventId],
          'userdata.metrics.events.attendedEvents': [],
          'userdata.metrics.events.noShowEvents': [],
          'userdata.metrics.events.lastActivity': serverTimestamp(),
        });
        Logger.debug('ReliabilityService', 'Initialized and updated subscription metrics', { userId });
        return { success: true };
      } catch (retryError) {
        Logger.error('ReliabilityService', 'Error initializing metrics structure', retryError);
        return { success: false, error: retryError };
      }
    }
  }

  /**
   * Updates user metrics when they unsubscribe from an event
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   */
  static async updateEventUnsubscription(userId, eventId) {
    try {
      Logger.debug('ReliabilityService', 'Updating unsubscription metrics', { userId, eventId });
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'userdata.metrics.events.subscribedEvents': arrayRemove(eventId),
        'userdata.metrics.events.joined': increment(-1),
        'userdata.metrics.events.lastActivity': serverTimestamp(),
      });

      Logger.debug('ReliabilityService', 'Successfully updated unsubscription metrics', { userId });
      return { success: true };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating unsubscription metrics', error);
      return { success: false, error };
    }
  }

  /**
   * Updates user metrics when they create an event
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {string} studioId - Studio ID
   */
  static async updateEventCreationMetrics(userId, eventId, studioId) {
    try {
      Logger.debug('ReliabilityService', 'Updating creation metrics', { userId, eventId, studioId });
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'userdata.metrics.events.created': increment(1),
        'userdata.metrics.events.lastEventCreated': serverTimestamp(),
        'userdata.metrics.events.lastActivity': serverTimestamp(),
      });

      Logger.debug('ReliabilityService', 'Successfully updated creation metrics', { userId });
      return { success: true };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating creation metrics', error);
      return { success: false, error };
    }
  }

  /**
   * Updates user metrics when they delete an event
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   */
  static async updateEventDeletionMetrics(userId, eventId) {
    try {
      Logger.debug('ReliabilityService', 'Updating deletion metrics', { userId, eventId });
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'userdata.metrics.events.created': increment(-1),
        'userdata.metrics.events.lastActivity': serverTimestamp(),
      });

      Logger.debug('ReliabilityService', 'Successfully updated deletion metrics', { userId });
      return { success: true };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating deletion metrics', error);
      return { success: false, error };
    }
  }

  /**
   * Updates host's average attendees metric
   * @param {string} hostId - Host user ID
   * @param {number} attendeeCount - Number of attendees
   */
  static async updateHostAverageAttendees(hostId, attendeeCount) {
    try {
      Logger.debug('ReliabilityService', 'Updating host average attendees', { hostId, attendeeCount });
      const userRef = doc(db, 'users', hostId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const hostMetrics = userData?.userdata?.metrics?.hosting || {};
        
        const currentAverage = hostMetrics.averageAttendees || 0;
        const eventsHosted = hostMetrics.eventsCompleted || 0;
        
        // Calculate new average
        const newAverage = eventsHosted > 0 
          ? ((currentAverage * eventsHosted) + attendeeCount) / (eventsHosted + 1)
          : attendeeCount;

        await updateDoc(userRef, {
          'userdata.metrics.hosting.averageAttendees': newAverage,
          'userdata.metrics.hosting.eventsCompleted': increment(1),
          'userdata.metrics.hosting.totalAttendees': increment(attendeeCount),
          'userdata.metrics.hosting.lastEventCompleted': serverTimestamp(),
        });

        Logger.debug('ReliabilityService', 'Successfully updated host metrics', { hostId, newAverage });
        return { success: true, newAverage };
      }
      
      return { success: false, error: 'User not found' };
    } catch (error) {
      Logger.error('ReliabilityService', 'Error updating host metrics', error);
      return { success: false, error };
    }
  }
}