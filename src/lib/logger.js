/**
 * Enhanced logging utility with levels and filtering
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

// Set log level based on environment
const CURRENT_LOG_LEVEL = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

// Sensitive data fields that should never be logged
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'auth',
  'email', 'phone', 'address', 'ssn', 'credit'
];

/**
 * Check if a log level should be output
 */
const shouldLog = (level) => level <= CURRENT_LOG_LEVEL;

/**
 * Sanitize data for logging (remove sensitive fields)
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => keyLower.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Format log message with timestamp and component
 */
const formatMessage = (component, message, data = null) => {
  const timestamp = new Date().toISOString().substr(11, 12); // HH:mm:ss.sss
  let logMessage = `[${timestamp}] [${component}] ${message}`;
  
  if (data) {
    const sanitizedData = sanitizeData(data);
    logMessage += ` ${JSON.stringify(sanitizedData)}`;
  }
  
  return logMessage;
};

export const Logger = {
  /**
   * Error level logging (always shown)
   */
  error: (component, message, data = null) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(formatMessage(component, message, data));
    }
  },

  /**
   * Warning level logging
   */
  warn: (component, message, data = null) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatMessage(component, message, data));
    }
  },

  /**
   * Info level logging
   */
  info: (component, message, data = null) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(formatMessage(component, message, data));
    }
  },

  /**
   * Debug level logging (dev only)
   */
  debug: (component, message, data = null) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(formatMessage(component, message, data));
    }
  },

  /**
   * Verbose level logging (very detailed, dev only)
   */
  verbose: (component, message, data = null) => {
    if (shouldLog(LOG_LEVELS.VERBOSE)) {
      console.log(formatMessage(component, message, data));
    }
  },

  /**
   * Performance timing
   */
  time: (label) => {
    if (__DEV__) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (__DEV__) {
      console.timeEnd(label);
    }
  },

  /**
   * User action tracking (sanitized)
   */
  userAction: (action, details = {}) => {
    const sanitizedDetails = sanitizeData(details);
    Logger.info('UserAction', action, sanitizedDetails);
  },

  /**
   * Service operation logging
   */
  service: (serviceName, operation, result = null) => {
    const logData = result ? { success: !!result, resultType: typeof result } : null;
    Logger.debug(serviceName, operation, logData);
  },

  /**
   * Database operation logging (no sensitive data)
   */
  database: (operation, collection, success = true, count = null) => {
    const data = { operation, collection, success };
    if (count !== null) data.count = count;
    Logger.debug('Database', `${operation} ${collection}`, data);
  }
};

// Convenience exports for common use cases
export const logError = (component, message, error) => {
  Logger.error(component, message, { error: error?.message || error });
};

export const logUserAction = (action, userId = null) => {
  Logger.userAction(action, userId ? { userId: `user_${userId.substr(0, 8)}` } : {});
};

export const logPerformance = (operation, duration) => {
  Logger.info('Performance', `${operation} completed`, { duration: `${duration}ms` });
};