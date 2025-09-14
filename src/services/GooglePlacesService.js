// FILE: services/GooglePlacesService.js - Google Places API Integration

import {
  GOOGLE_PLACES_API_KEY,
  GOOGLE_PLACES_CONFIG,
  isGooglePlacesConfigured,
  getEnvironmentConfig,
} from '../config/googlePlaces';
import { LocationErrorHandler } from '../lib/locationErrorHandler';

/**
 * Google Places API Service for location autocomplete and address lookup
 * Provides fallback to local venue database when API is unavailable
 */

// Get environment-specific configuration
const config = getEnvironmentConfig(__DEV__ ? 'development' : 'production');

// Cache for frequently requested places
const placesCache = new Map();

// Rate limiting
let lastRequestTime = 0;

export class GooglePlacesService {
  /**
   * Check if Google Places API is available and configured
   * @returns {boolean} True if API key is configured
   */
  static isAvailable() {
    return isGooglePlacesConfigured();
  }

  /**
   * Rate limit API requests to prevent excessive usage
   * @returns {Promise<void>} Resolves when safe to make request
   */
  static async rateLimitRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < config.minRequestInterval) {
      const delay = config.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    lastRequestTime = Date.now();
  }

  /**
   * Get cached result if available and not expired
   * @param {string} key - Cache key
   * @returns {*|null} Cached result or null
   */
  static getCachedResult(key) {
    const cached = placesCache.get(key);
    if (cached && Date.now() - cached.timestamp < config.cacheDuration) {
      console.log('[GooglePlacesService] Using cached result for:', key);
      return cached.data;
    }
    return null;
  }

  /**
   * Cache a result
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  static setCachedResult(key, data) {
    placesCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get autocomplete predictions from Google Places API (New)
   * @param {string} input - User input text
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of place predictions
   */
  static async getAutocompletePredictions(input, options = {}) {
    if (!this.isAvailable()) {
      console.log(
        '[GooglePlacesService] API not available, skipping autocomplete'
      );
      return [];
    }

    if (!input || input.trim().length < 2) {
      return [];
    }

    const cacheKey = `autocomplete_${input.toLowerCase().trim()}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.rateLimitRequest();

      // New API uses POST requests with JSON body
      const requestBody = {
        input: input.trim(),
        ...config.defaultAutocompleteOptions,
        ...options,
      };

      console.log(
        '[GooglePlacesService] Fetching autocomplete predictions for:',
        input
      );
      const response = await fetch(`${config.baseUrl}:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData?.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      // New API doesn't use status field - just check for suggestions
      const suggestions = data.suggestions || [];
      const formattedPredictions = suggestions
        .filter((suggestion) => suggestion.placePrediction) // Only place predictions, not query predictions
        .map((suggestion) => {
          const placePrediction = suggestion.placePrediction;
          return {
            id: placePrediction.placeId,
            text: placePrediction.text?.text || '',
            mainText:
              placePrediction.structuredFormat?.mainText?.text ||
              placePrediction.text?.text ||
              '',
            secondaryText:
              placePrediction.structuredFormat?.secondaryText?.text || '',
            placeId: placePrediction.placeId,
            types: placePrediction.types || [],
            type: 'google_place',
          };
        });

      console.log(
        `[GooglePlacesService] Found ${formattedPredictions.length} predictions`
      );
      this.setCachedResult(cacheKey, formattedPredictions);

      return formattedPredictions;
    } catch (error) {
      const errorInfo = LocationErrorHandler.handleGooglePlacesError(error);
      LocationErrorHandler.logError('google_places_autocomplete', errorInfo, {
        input,
      });

      console.error(
        '[GooglePlacesService] Autocomplete error:',
        LocationErrorHandler.createUserMessage(errorInfo, true)
      );
      return [];
    }
  }

  /**
   * Get detailed place information by place ID (New API)
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object|null>} Place details or null
   */
  static async getPlaceDetails(placeId) {
    if (!this.isAvailable()) {
      console.log(
        '[GooglePlacesService] API not available, skipping place details'
      );
      return null;
    }

    if (!placeId) {
      return null;
    }

    const cacheKey = `place_details_${placeId}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.rateLimitRequest();

      // New API uses field masking for cost optimization
      const fieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'types',
        'addressComponents',
      ].join(',');

      console.log('[GooglePlacesService] Fetching place details for:', placeId);
      const response = await fetch(`${config.baseUrl}/${placeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData?.error?.message || 'Unknown error'}`
        );
      }

      const place = await response.json();

      const placeDetails = {
        id: place.id,
        name: place.displayName?.text || place.name,
        address: place.formattedAddress,
        location: place.location,
        types: place.types || [],
        addressComponents: place.addressComponents || [],
      };

      console.log(
        '[GooglePlacesService] Got place details:',
        placeDetails.name
      );
      this.setCachedResult(cacheKey, placeDetails);

      return placeDetails;
    } catch (error) {
      const errorInfo = LocationErrorHandler.handleGooglePlacesError(error);
      LocationErrorHandler.logError('google_places_details', errorInfo, {
        placeId,
      });

      console.error(
        '[GooglePlacesService] Place details error:',
        LocationErrorHandler.createUserMessage(errorInfo, true)
      );
      return null;
    }
  }

  /**
   * Search for places near a location (New API)
   * @param {Object} location - {lat, lng} coordinates
   * @param {string} query - Search query
   * @param {number} radius - Search radius in meters (default: 5000)
   * @returns {Promise<Array>} Array of nearby places
   */
  static async searchNearby(location, query = '', radius = 5000) {
    if (!this.isAvailable()) {
      console.log(
        '[GooglePlacesService] API not available, skipping nearby search'
      );
      return [];
    }

    if (!location || !location.lat || !location.lng) {
      return [];
    }

    const cacheKey = `nearby_${location.lat}_${location.lng}_${query}_${radius}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.rateLimitRequest();

      // New API uses different request format for nearby search
      const requestBody = {
        includedTypes: ['establishment'],
        maxResultCount: config.maxNearbyResults || 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng,
            },
            radius: radius,
          },
        },
        languageCode: config.language,
        regionCode: config.region,
      };

      if (query) {
        requestBody.textQuery = query;
      }

      // Field masking for cost optimization
      const fieldMask = [
        'places.id',
        'places.displayName',
        'places.shortFormattedAddress',
        'places.location',
        'places.types',
        'places.rating',
      ].join(',');

      console.log('[GooglePlacesService] Searching nearby places:', {
        location,
        query,
        radius,
      });
      const response = await fetch(`${config.baseUrl}:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData?.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      const places = (data.places || []).map((place) => ({
        id: place.id,
        name: place.displayName?.text || place.name,
        address: place.shortFormattedAddress || place.vicinity,
        location: place.location,
        types: place.types || [],
        rating: place.rating,
        type: 'google_place',
      }));

      console.log(`[GooglePlacesService] Found ${places.length} nearby places`);
      this.setCachedResult(cacheKey, places);

      return places;
    } catch (error) {
      const errorInfo = LocationErrorHandler.handleGooglePlacesError(error);
      LocationErrorHandler.logError('google_places_nearby', errorInfo, {
        location,
        query,
        radius,
      });

      console.error(
        '[GooglePlacesService] Nearby search error:',
        LocationErrorHandler.createUserMessage(errorInfo, true)
      );
      return [];
    }
  }

  /**
   * Format Google Place prediction for autocomplete display
   * @param {Object} prediction - Google Places prediction object
   * @returns {Object} Formatted suggestion object
   */
  static formatPredictionForAutocomplete(prediction) {
    return {
      text: prediction.mainText || prediction.text,
      type: 'google_place',
      address: prediction.secondaryText || prediction.text,
      placeId: prediction.placeId,
      icon: this.getIconForPlaceTypes(prediction.types),
      isGooglePlace: true,
    };
  }

  /**
   * Get appropriate icon for place types
   * @param {Array} types - Array of place types from Google
   * @returns {string} Emoji icon
   */
  static getIconForPlaceTypes(types = []) {
    const typeIconMap = {
      restaurant: '🍽️',
      food: '🍽️',
      meal_takeaway: '🍽️',
      cafe: '☕',
      bar: '🍺',
      lodging: '🏨',
      gas_station: '⛽',
      hospital: '🏥',
      pharmacy: '💊',
      bank: '🏦',
      atm: '🏧',
      school: '🏫',
      university: '🎓',
      gym: '💪',
      beauty_salon: '💄',
      shopping_mall: '🛍️',
      store: '🏪',
      church: '⛪',
      park: '🌳',
      amusement_park: '🎢',
      zoo: '🦁',
      museum: '🏛️',
      library: '📚',
      movie_theater: '🎬',
      night_club: '🌃',
      stadium: '🏟️',
      subway_station: '🚇',
      train_station: '🚂',
      bus_station: '🚌',
      airport: '✈️',
      car_rental: '🚗',
      parking: '🅿️',
    };

    for (const type of types) {
      if (typeIconMap[type]) {
        return typeIconMap[type];
      }
    }

    return '📍'; // Default location icon
  }

  /**
   * Get user location using Google's Geolocation API
   * More reliable than device GPS, especially indoors
   * @returns {Promise<Object|null>} Location coordinates or null
   */
  static async getCurrentLocation() {
    if (!this.isAvailable()) {
      console.log(
        '[GooglePlacesService] API not available, skipping geolocation'
      );
      return null;
    }

    const cacheKey = 'current_location';
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.rateLimitRequest();

      console.log(
        '[GooglePlacesService] Requesting location from Google Geolocation API...'
      );
      const response = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            considerIp: true,
            wifiAccessPoints: [],
            cellTowers: [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData?.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      if (data.location) {
        const location = {
          latitude: data.location.lat,
          longitude: data.location.lng,
          accuracy: data.accuracy || 1000, // Default accuracy if not provided
          timestamp: Date.now(),
        };

        console.log(
          '[GooglePlacesService] Location obtained from Google:',
          location
        );
        this.setCachedResult(cacheKey, location);

        return location;
      }

      return null;
    } catch (error) {
      const errorInfo = LocationErrorHandler.handleGooglePlacesError(error);
      LocationErrorHandler.logError('google_geolocation', errorInfo);

      console.error(
        '[GooglePlacesService] Geolocation error:',
        LocationErrorHandler.createUserMessage(errorInfo, true)
      );
      return null;
    }
  }

  /**
   * Clear the places cache
   */
  static clearCache() {
    placesCache.clear();
    console.log('[GooglePlacesService] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  static getCacheStats() {
    return {
      size: placesCache.size,
      entries: Array.from(placesCache.keys()),
    };
  }
}
