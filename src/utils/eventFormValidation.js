/**
 * Format event data for database storage
 * @param {Object} formData - Form data
 * @param {string} currentUserId - Current user ID
 * @returns {Object} Formatted event data
 */
export const formatEventForStorage = (formData, currentUserId) => {
  const {
    title,
    location,
    details,
    date,
    time,
    maxGuests,
    hasFee,
    entryFee,
    feeDescription,
  } = formData;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const combined = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: time.getHours(),
      minute: time.getMinutes(),
    },
    { zone: timeZone }
  );

  const utcDateTime = combined.toUTC().toISO();

  return {
    title: title.trim(),
    location: location.trim(),
    desc: details.trim(),
    utcDateTime: utcDateTime,
    eventTimestamp: new Date(utcDateTime),
    eventTimeZone: timeZone,
    originalDate: combined.toFormat('yyyy-MM-dd'),
    originalTime: combined.toFormat('HH:mm'),
    maxGuests: maxGuests ? parseInt(maxGuests) : null,
    hasFee: hasFee ?? false,
    entryFee: entryFee || '',
    feeDescription: feeDescription || '',
    createdBy: currentUserId,

    // Host fields for comment role system
    hostId: currentUserId, // Primary host
    hosts: [currentUserId], // Host array (expandable for multiple hosts)

    subscribers: [currentUserId],
    subscriberCount: 1,
    attendeeCount: 0,
    noShowCount: 0,
    status: 'upcoming',
  };
};
// Optional: Helper functions for managing hosts (if you need them later)

/**
 * Add a co-host to an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to add as co-host
 */
export const addCoHost = async (eventId, userId) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found');

    const currentHosts = eventSnap.data().hosts || [];
    if (!currentHosts.includes(userId)) {
      await updateDoc(eventRef, {
        hosts: [...currentHosts, userId],
      });
    }
  } catch (error) {
    console.error('Error adding co-host:', error);
    throw error;
  }
};

/**
 * Remove a co-host from an event (cannot remove primary host)
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to remove as co-host
 */
export const removeCoHost = async (eventId, userId) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found');

    const eventData = eventSnap.data();

    // Don't allow removing the primary host
    if (eventData.hostId === userId) {
      throw new Error('Cannot remove primary host');
    }

    const updatedHosts = (eventData.hosts || []).filter(
      (hostId) => hostId !== userId
    );

    await updateDoc(eventRef, {
      hosts: updatedHosts,
    });
  } catch (error) {
    console.error('Error removing co-host:', error);
    throw error;
  }
};

/**
 * Check if a user is a host of an event
 * @param {Object} eventData - Event data object
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is a host
 */
export const isEventHost = (eventData, userId) => {
  if (!eventData || !userId) return false;

  return (
    eventData.hostId === userId ||
    (eventData.hosts && eventData.hosts.includes(userId))
  );
};
