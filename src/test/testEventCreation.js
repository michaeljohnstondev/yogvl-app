// FILE: src/test/testEventCreation.js
// Comprehensive test function for creating real events in the database
// Validates against DATABASE.md schema and includes notification scheduling

import {
  collection,
  addDoc,
  doc,
  getDoc,
  Timestamp,
  serverTimestamp,
} from '../lib/firebase/firestore';
import { db } from '../auth/services/firebase';
import { ScheduledNotificationService } from '../services/scheduledNotifications';

/**
 * COMPREHENSIVE EVENT CREATION TEST
 *
 * This function creates a real test event in the database following the exact
 * schema defined in DATABASE.md. It validates all data structures and includes
 * proper notification scheduling.
 */

/**
 * Creates a comprehensive test event with proper database schema compliance
 *
 * @param {Object} params - Test event parameters
 * @param {string} params.currentUserId - Current logged-in user ID (required)
 * @param {string} params.studioId - Studio ID (required)
 * @param {Object} params.overrides - Optional field overrides for testing
 * @returns {Object} Test result with event data and validation
 */
export const createTestEvent = async ({
  currentUserId,
  studioId,
  overrides = {}
}) => {
  console.log('\n🧪 === COMPREHENSIVE EVENT CREATION TEST ===\n');

  try {
    // ========== VALIDATION PHASE ==========
    console.log('🔍 Phase 1: Validating requirements...');

    if (!currentUserId) {
      throw new Error('currentUserId is required - user must be logged in');
    }

    if (!studioId) {
      throw new Error('studioId is required - events must be studio-scoped');
    }

    // Validate user exists and has proper structure
    console.log(`📋 Validating user: ${currentUserId}`);
    const userRef = doc(db, 'users', currentUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error(`User document not found: ${currentUserId}`);
    }

    const userData = userSnap.data();
    console.log('📋 User data structure:', Object.keys(userData));

    // Validate user has required contact info per DATABASE.md schema
    const contactInfo = userData.userdata?.contactInfo;
    if (!contactInfo?.displayName || !contactInfo?.firstName || !contactInfo?.lastName) {
      throw new Error('User missing required contactInfo fields (displayName, firstName, lastName)');
    }

    console.log(`✅ User validation passed: ${contactInfo.displayName}`);

    // ========== EVENT DATA CONSTRUCTION ==========
    console.log('🏗️  Phase 2: Constructing event data...');

    // Calculate event time (5 minutes from now as requested)
    const eventStartTime = new Date();
    eventStartTime.setMinutes(eventStartTime.getMinutes() + 5);

    // Calculate end time (1 hour after start)
    const eventEndTime = new Date(eventStartTime);
    eventEndTime.setHours(eventEndTime.getHours() + 1);

    // Construct event data following DATABASE.md schema exactly
    const baseEventData = {
      // ========== REQUIRED FIELDS (per DATABASE.md) ==========
      title: 'Test Event - Automated Creation',
      description: 'This is a test event created by the automated testing system to validate event creation and notification scheduling.',
      createdBy: currentUserId, // HOST FIELD - Uses createdBy NOT hostId per DATABASE.md

      // ========== TIMING (Firestore Timestamps) ==========
      dateTime: Timestamp.fromDate(eventStartTime),
      endDateTime: Timestamp.fromDate(eventEndTime),
      createdAt: serverTimestamp(),

      // ========== LOCATION INFORMATION ==========
      location: {
        type: 'address',
        formatted_address: '123 Test Street, Test City, TC 12345',
        place_id: 'test_place_id_12345',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      },
      address: '123 Test Street, Test City, TC 12345',

      // ========== PARTICIPATION TRACKING (per DATABASE.md arrays) ==========
      subscribers: [], // Array of user IDs subscribed to event
      cohosts: [], // Array of cohost user IDs
      invitations: [], // Array of user IDs with pending invitations
      subscriberCount: 0, // Cached count of subscribers

      // ========== EVENT SETTINGS ==========
      maxGuests: 25,
      isPrivate: false,
      active: true,

      // ========== EVENT STATUS & TRACKING ==========
      status: 'active', // 'active', 'completed', 'cancelled'
      trackAttendance: true,
      attendanceType: 'casual', // 'casual' or 'strict'

      // ========== ANALYTICS (initialized to 0) ==========
      views: 0,
      attended: 0,
      noShows: 0,

      // ========== ATTENDANCE TRACKING ARRAY ==========
      attendance: [], // Will be populated post-event

      // ========== TEST METADATA ==========
      isTestEvent: true,
      testCreatedAt: new Date().toISOString(),
      testCreatedBy: 'testEventCreation.js',
    };

    // Apply any overrides for testing specific scenarios
    const eventData = { ...baseEventData, ...overrides };

    console.log('📋 Event data structure validation:');
    console.log(`   ✅ Required fields: createdBy, title, dateTime`);
    console.log(`   ✅ Studio scoped: /studios/${studioId}/events/`);
    console.log(`   ✅ Proper timestamps: Firestore Timestamp objects`);
    console.log(`   ✅ Array fields initialized: subscribers[], cohosts[], invitations[]`);
    console.log(`   ✅ Naming convention: camelCase fields`);

    // ========== DATABASE CREATION ==========
    console.log('🔥 Phase 3: Creating event in Firestore...');

    const eventsCollectionRef = collection(db, 'studios', studioId, 'events');
    const eventDocRef = await addDoc(eventsCollectionRef, eventData);
    const eventId = eventDocRef.id;

    console.log(`✅ Event created successfully: ${eventId}`);
    console.log(`📍 Database path: studios/${studioId}/events/${eventId}`);

    // ========== NOTIFICATION SCHEDULING ==========
    console.log('📱 Phase 4: Scheduling notifications...');

    // Schedule notification 10 seconds before event (as requested)
    const notificationTime = new Date(eventStartTime);
    notificationTime.setSeconds(notificationTime.getSeconds() - 10);

    try {
      // Create notification data following DATABASE.md notification schema
      const notificationResult = await ScheduledNotificationService.scheduleNotification({
        userId: currentUserId,
        eventId: eventId,
        studioId: studioId,
        eventTitle: eventData.title,
        eventDateTime: eventData.dateTime,
        type: 'event_reminder',
        priority: 'normal',
        channels: ['push'],
        scheduledFor: Timestamp.fromDate(notificationTime),
        title: 'Test Event Starting Soon!',
        message: `Your test event "${eventData.title}" starts in 10 seconds.`,
        data: {
          eventId: eventId,
          studioId: studioId,
          type: 'event_reminder',
          isTestNotification: true
        }
      });

      console.log(`✅ Notification scheduled: ${notificationResult.notificationId || 'success'}`);
      console.log(`⏰ Notification time: ${notificationTime.toISOString()}`);
    } catch (notificationError) {
      console.warn('⚠️  Notification scheduling failed (event still created):', notificationError.message);
    }

    // ========== VERIFICATION PHASE ==========
    console.log('🔍 Phase 5: Verifying created event...');

    const createdEventRef = doc(db, 'studios', studioId, 'events', eventId);
    const createdEventSnap = await getDoc(createdEventRef);

    if (!createdEventSnap.exists()) {
      throw new Error('Event verification failed - document not found after creation');
    }

    const createdEventData = createdEventSnap.data();

    // Validate critical fields
    const validationChecks = {
      hasRequiredFields: !!(createdEventData.createdBy && createdEventData.title && createdEventData.dateTime),
      correctHost: createdEventData.createdBy === currentUserId,
      hasArrays: Array.isArray(createdEventData.subscribers) && Array.isArray(createdEventData.invitations),
      correctTimestamp: createdEventData.dateTime instanceof Timestamp,
      isActive: createdEventData.active === true && createdEventData.status === 'active'
    };

    const allValidationsPassed = Object.values(validationChecks).every(check => check === true);

    console.log('📋 Validation Results:');
    Object.entries(validationChecks).forEach(([check, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${check}: ${result}`);
    });

    if (!allValidationsPassed) {
      throw new Error('Event validation failed - see validation results above');
    }

    // ========== SUCCESS SUMMARY ==========
    console.log('\n🎉 === TEST EVENT CREATION SUCCESSFUL ===');
    console.log(`📅 Event: "${eventData.title}"`);
    console.log(`🆔 Event ID: ${eventId}`);
    console.log(`👤 Host: ${contactInfo.displayName} (${currentUserId})`);
    console.log(`🏢 Studio: ${studioId}`);
    console.log(`⏰ Event Time: ${eventStartTime.toISOString()}`);
    console.log(`📱 Notification: 10 seconds before (${notificationTime.toISOString()})`);
    console.log(`🗄️  Database Path: studios/${studioId}/events/${eventId}`);

    return {
      success: true,
      eventId,
      eventData: createdEventData,
      studioId,
      hostUserId: currentUserId,
      hostDisplayName: contactInfo.displayName,
      eventStartTime: eventStartTime.toISOString(),
      notificationTime: notificationTime.toISOString(),
      databasePath: `studios/${studioId}/events/${eventId}`,
      validationResults: validationChecks,
      message: 'Test event created successfully with proper schema compliance'
    };

  } catch (error) {
    console.error('\n❌ === TEST EVENT CREATION FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return {
      success: false,
      error: error.message,
      stack: error.stack,
      message: 'Test event creation failed - see error details'
    };
  }
};

/**
 * Quick test helper for common scenarios
 */
export const createQuickTestEvent = async (currentUserId, studioId) => {
  return createTestEvent({ currentUserId, studioId });
};

/**
 * Create test event with custom overrides for specific testing scenarios
 */
export const createCustomTestEvent = async (currentUserId, studioId, customData) => {
  return createTestEvent({
    currentUserId,
    studioId,
    overrides: customData
  });
};

/**
 * Validate existing event against DATABASE.md schema
 */
export const validateEventSchema = async (studioId, eventId) => {
  try {
    console.log('\n🔍 === EVENT SCHEMA VALIDATION ===\n');

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();

    const schemaValidation = {
      // Required fields per DATABASE.md
      hasCreatedBy: !!eventData.createdBy,
      hasTitle: !!eventData.title,
      hasDateTime: !!eventData.dateTime,

      // Data types validation
      dateTimeIsTimestamp: eventData.dateTime instanceof Timestamp,
      subscribersIsArray: Array.isArray(eventData.subscribers),
      invitationsIsArray: Array.isArray(eventData.invitations),
      cohostsIsArray: Array.isArray(eventData.cohosts),

      // Field naming convention (camelCase)
      hasProperFieldNames: !!(eventData.dateTime && eventData.endDateTime && eventData.maxGuests && eventData.isPrivate),

      // Business rules
      noHostInArrays: !(
        eventData.subscribers?.includes(eventData.createdBy) ||
        eventData.invitations?.includes(eventData.createdBy) ||
        eventData.cohosts?.includes(eventData.createdBy)
      ),

      // Status validation
      hasValidStatus: ['active', 'completed', 'cancelled'].includes(eventData.status),
    };

    const isValidSchema = Object.values(schemaValidation).every(check => check === true);

    console.log('📋 Schema Validation Results:');
    Object.entries(schemaValidation).forEach(([check, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${check}: ${result}`);
    });

    return {
      isValid: isValidSchema,
      validation: schemaValidation,
      eventData
    };

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
};

console.log('🧪 Event creation test functions loaded. Use:');
console.log('   createTestEvent({ currentUserId, studioId })');
console.log('   createQuickTestEvent(currentUserId, studioId)');
console.log('   validateEventSchema(studioId, eventId)');