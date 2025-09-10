// FILE: utils/templateTransforms.js

/**
 * Fields that should be excluded when saving as template
 * Note: Invitation fields (selectedGuestUsers, selectedCohostUsers, etc.) are NOT excluded
 * so they get saved as part of the template for complete restoration
 */
const EXCLUDED_TEMPLATE_FIELDS = [
  'date',
  'time',
  'dateSelected',
  'timeSelected',
  'rsvpDeadline', // Exclude the calculated timestamp, but keep rsvpDeadlineType
  'rsvpDeadlineSelected',
  'createdAt',
  'updatedAt',
  'hostId',
  'eventId',
];

/**
 * Convert form data to template format for saving
 */
export const formToTemplate = (formData, templateName, options = {}) => {
  const { includeDates = false, customExclusions = [] } = options;

  // Create exclusion list
  const exclusions = includeDates
    ? [...customExclusions]
    : [...EXCLUDED_TEMPLATE_FIELDS, ...customExclusions];

  // Filter out excluded fields
  const templateData = Object.keys(formData).reduce((template, key) => {
    if (!exclusions.includes(key) && formData[key] !== undefined) {
      template[key] = formData[key];
    }
    return template;
  }, {});

  return {
    name: templateName,
    ...templateData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Convert template to form data format
 */
export const templateToForm = (template, options = {}) => {
  const { preserveExisting = false, currentFormData = {} } = options;

  // Start with current form if preserving, otherwise empty object
  const baseForm = preserveExisting ? { ...currentFormData } : {};

  // Extract payload (actual form data) from template
  const payload = template.payload || template;
  
  // Apply template payload data, excluding metadata
  const { name, createdAt, updatedAt, id, userId, ...templateFields } = payload;

  // Convert Firestore timestamps to JavaScript Date objects
  const convertedFields = {};
  Object.keys(templateFields).forEach(key => {
    const value = templateFields[key];
    // Check if value is a Firestore timestamp
    if (value && typeof value === 'object' && value.toDate) {
      convertedFields[key] = value.toDate();
    } else {
      convertedFields[key] = value;
    }
  });

  return {
    ...baseForm,
    ...convertedFields,
  };
};

/**
 * Validate template data before saving
 */
export const validateTemplateData = (templateData) => {
  const errors = [];

  // Check required fields
  if (!templateData.name || templateData.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (templateData.name && templateData.name.length > 50) {
    errors.push('Template name must be 50 characters or less');
  }

  if (!templateData.title || templateData.title.trim().length === 0) {
    errors.push('Event title is required for template');
  }

  // Check for suspicious data
  if (templateData.date || templateData.time) {
    errors.push('Templates should not include specific dates/times');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Convert past event to template format
 */
export const pastEventToTemplate = (pastEvent) => {
  // Fields to exclude when converting past event to template
  const pastEventExclusions = [
    'id',
    'eventTimestamp',
    'utcDateTime',
    'eventTimeZone',
    'createdAt',
    'updatedAt',
    'createdBy',
    'hostId',
    'subscribers',
    'subscriberCount',
    'attendeeCount',
    'status',
    'comments',
    'attendees',
    'noShows',
    'attendanceVerified',
    'eventDate', // Legacy field
    'eventTime', // Legacy field
  ];

  // Create template data from past event
  const templateData = Object.keys(pastEvent).reduce((template, key) => {
    if (!pastEventExclusions.includes(key) && pastEvent[key] !== undefined) {
      template[key] = pastEvent[key];
    }
    return template;
  }, {});

  // Generate a default template name based on the event
  const eventDate = pastEvent.eventTimestamp ? 
    new Date(pastEvent.eventTimestamp.seconds * 1000).toLocaleDateString() :
    new Date(pastEvent.utcDateTime).toLocaleDateString();
  
  const templateName = `${pastEvent.title} (${eventDate})`;

  return {
    name: templateName,
    payload: templateData,
    createdAt: new Date().toISOString(),
    isFromPastEvent: true,
  };
};

/**
 * Generate a preview string for template display
 */
export const generateTemplatePreview = (template) => {
  const parts = [];

  if (template.title) parts.push(template.title);
  if (template.location) parts.push(template.location);
  if (template.maxGuests) parts.push(`${template.maxGuests} guests`);
  if (template.hasFee && template.entryFee) parts.push(`$${template.entryFee}`);

  return parts.join(' • ') || 'Template';
};
