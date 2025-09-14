// FILE: lib/locationErrorHandler.js - Error handling for location services

/**
 * Error handler for location services with user-friendly messages
 */
export class LocationErrorHandler {
  /**
   * Handle Google Places API errors
   * @param {Error} error - The error object
   * @returns {Object} User-friendly error information
   */
  static handleGooglePlacesError(error) {
    console.error('[LocationErrorHandler] Google Places error:', error);

    if (!error) {
      return {
        type: 'unknown',
        message: 'Unknown error occurred',
        userMessage: 'Something went wrong. Please try again.',
        canRetry: true,
      };
    }

    const errorMessage = error.message || error.toString();

    // API Key issues
    if (
      errorMessage.includes('API key not valid') ||
      errorMessage.includes('REQUEST_DENIED')
    ) {
      return {
        type: 'api_key',
        message: 'Invalid API key',
        userMessage: 'Location search is temporarily unavailable.',
        canRetry: false,
        fallbackMessage: 'Please enter your address manually.',
      };
    }

    // Quota/billing issues
    if (
      errorMessage.includes('OVER_QUERY_LIMIT') ||
      errorMessage.includes('quota')
    ) {
      return {
        type: 'quota',
        message: 'API quota exceeded',
        userMessage: 'Location search limit reached.',
        canRetry: true,
        fallbackMessage:
          'Please enter your address manually or try again later.',
      };
    }

    // Network issues
    if (
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('Network')
    ) {
      return {
        type: 'network',
        message: 'Network error',
        userMessage: 'Check your internet connection.',
        canRetry: true,
        fallbackMessage: 'Please try again or enter your address manually.',
      };
    }

    // Invalid request
    if (errorMessage.includes('INVALID_REQUEST')) {
      return {
        type: 'invalid_request',
        message: 'Invalid request',
        userMessage: 'Unable to search for this location.',
        canRetry: false,
        fallbackMessage: 'Please enter your address manually.',
      };
    }

    // Zero results
    if (errorMessage.includes('ZERO_RESULTS')) {
      return {
        type: 'no_results',
        message: 'No results found',
        userMessage: 'No locations found matching your search.',
        canRetry: true,
        fallbackMessage:
          'Try a different search or enter your address manually.',
      };
    }

    // Generic error
    return {
      type: 'generic',
      message: errorMessage,
      userMessage: 'Location search failed.',
      canRetry: true,
      fallbackMessage: 'Please enter your address manually or try again.',
    };
  }

  /**
   * Handle venue service errors
   * @param {Error} error - The error object
   * @returns {Object} User-friendly error information
   */
  static handleVenueServiceError(error) {
    console.error('[LocationErrorHandler] Venue service error:', error);

    if (!error) {
      return {
        type: 'unknown',
        message: 'Unknown venue service error',
        userMessage: 'Something went wrong.',
        canRetry: true,
      };
    }

    const errorMessage = error.message || error.toString();

    // Firebase/Firestore errors
    if (
      errorMessage.includes('Firebase') ||
      errorMessage.includes('Firestore')
    ) {
      return {
        type: 'firebase',
        message: 'Firebase error',
        userMessage: 'Database temporarily unavailable.',
        canRetry: true,
        fallbackMessage: 'Please try again or enter your address manually.',
      };
    }

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized')
    ) {
      return {
        type: 'permission',
        message: 'Permission denied',
        userMessage: 'Access to venue database denied.',
        canRetry: false,
        fallbackMessage: 'Please enter your address manually.',
      };
    }

    return {
      type: 'generic',
      message: errorMessage,
      userMessage: 'Venue lookup failed.',
      canRetry: true,
      fallbackMessage: 'Please enter your address manually.',
    };
  }

  /**
   * Create a user-friendly error message with fallback options
   * @param {Object} errorInfo - Error information from handler
   * @param {boolean} showTechnicalDetails - Whether to show technical details
   * @returns {string} User-friendly message
   */
  static createUserMessage(errorInfo, showTechnicalDetails = false) {
    if (!errorInfo) {
      return 'An unknown error occurred. Please try again.';
    }

    let message = errorInfo.userMessage || 'Something went wrong.';

    if (errorInfo.fallbackMessage) {
      message += ' ' + errorInfo.fallbackMessage;
    }

    if (showTechnicalDetails && errorInfo.message) {
      message += ` (${errorInfo.message})`;
    }

    return message;
  }

  /**
   * Determine if an operation should be retried based on error type
   * @param {Object} errorInfo - Error information from handler
   * @returns {boolean} Whether to retry
   */
  static shouldRetry(errorInfo) {
    if (!errorInfo) return false;

    return errorInfo.canRetry === true;
  }

  /**
   * Get retry delay based on error type
   * @param {Object} errorInfo - Error information from handler
   * @param {number} attemptNumber - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  static getRetryDelay(errorInfo, attemptNumber = 1) {
    if (!errorInfo || !errorInfo.canRetry) return 0;

    const baseDelay = 1000; // 1 second base delay

    switch (errorInfo.type) {
      case 'network':
        return baseDelay * Math.pow(2, attemptNumber); // Exponential backoff for network
      case 'quota':
        return baseDelay * 10; // Longer delay for quota issues
      case 'firebase':
        return baseDelay * 2; // Moderate delay for Firebase
      default:
        return baseDelay;
    }
  }

  /**
   * Log error for analytics/debugging
   * @param {string} service - Service name (google_places, venue_service, etc.)
   * @param {Object} errorInfo - Error information
   * @param {Object} context - Additional context
   */
  static logError(service, errorInfo, context = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      service,
      errorType: errorInfo.type,
      errorMessage: errorInfo.message,
      userMessage: errorInfo.userMessage,
      context,
      canRetry: errorInfo.canRetry,
    };

    console.error(`[LocationErrorHandler] ${service} error:`, logData);

    // In a production app, you might send this to an analytics service
    // Example: Analytics.track('location_service_error', logData);
  }
}
