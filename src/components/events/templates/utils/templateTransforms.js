// FILE: utils/templateTransforms.js

/**
 * Fields that should be excluded when saving as template
 */
const EXCLUDED_TEMPLATE_FIELDS = [
  'date',
  'time',
  'dateSelected',
  'timeSelected',
  'rsvpDeadline',
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

  // Apply template data, excluding metadata
  const { name, createdAt, updatedAt, id, ...templateFields } = template;

  return {
    ...baseForm,
    ...templateFields,
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
