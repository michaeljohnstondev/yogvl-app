// FILE: config/googlePlaces.js - Google Places API Configuration

/**
 * Google Places API Configuration
 *
 * To use Google Places API:
 * 1. Get an API key from Google Cloud Console
 * 2. Enable Places API for your project
 * 3. Set the GOOGLE_PLACES_API_KEY environment variable or update this file
 * 4. Add billing information to your Google Cloud project
 *
 * For development: You can temporarily set the API key directly below
 * For production: Use environment variables or secure configuration
 */

// Environment variable takes precedence
export const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  // TODO: Add your API key here for development (remove before committing)
  'AIzaSyBASl19cUixNlE0TaapiIZuhQFalaq68_k';

// API Configuration - Using New Places API
export const GOOGLE_PLACES_CONFIG = {
  // New Places API base URL
  baseUrl: 'https://places.googleapis.com/v1/places',
  language: 'en',
  region: 'us',

  // Default search options for New Places API
  defaultAutocompleteOptions: {
    includedPrimaryTypes: ['establishment', 'park'],
    regionCode: 'us',
    languageCode: 'en',
    includeQueryPredictions: true,
  },

  // Rate limiting
  minRequestInterval: 300, // 300ms between requests

  // Caching
  cacheDuration: 1000 * 60 * 60, // 1 hour

  // Result limits
  maxAutocompleteResults: 5,
  maxNearbyResults: 10,

  // Search configuration
  minSearchLength: 3,
  debounceDelay: 300,
};

/**
 * Check if Google Places API is properly configured
 * @returns {boolean}
 */
export const isGooglePlacesConfigured = () => {
  return (
    GOOGLE_PLACES_API_KEY &&
    GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY_HERE' &&
    GOOGLE_PLACES_API_KEY.length > 10
  );
};

/**
 * Get configuration for different environments
 * @param {string} env - Environment (development, production)
 * @returns {Object}
 */
export const getEnvironmentConfig = (env = 'development') => {
  const baseConfig = {
    ...GOOGLE_PLACES_CONFIG,
    apiKey: GOOGLE_PLACES_API_KEY,
  };

  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        minRequestInterval: 500, // Slower in production to save costs
        cacheDuration: 1000 * 60 * 60 * 2, // 2 hours cache in production
      };

    case 'development':
    default:
      return {
        ...baseConfig,
        minRequestInterval: 300,
        cacheDuration: 1000 * 60 * 15, // 15 minutes cache in development
      };
  }
};

// Usage tracking (optional)
export const USAGE_LIMITS = {
  dailyRequestLimit: 1000,
  monthlyRequestLimit: 25000,
  warningThreshold: 0.8, // Warn when 80% of limit is reached
};
