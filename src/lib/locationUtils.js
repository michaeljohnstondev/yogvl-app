// FILE: lib/locationUtils.js - Location handling utilities and fallbacks

import { GooglePlacesService } from '../services/GooglePlacesService';

// Privacy patterns to detect personal locations
const PERSONAL_LOCATION_PATTERNS = [
  // Possessive indicators
  /my\s+(house|home|place|apartment|apt|condo|room)/i,
  /friend'?s?\s+(house|place|apartment)/i,
  /parent'?s?\s+(house|place)/i,
  /(mom|dad|mother|father)'?s?\s+/i,
  
  // Generic personal spaces
  /^\s*(home|house|apartment|apt|condo|dorm)\s*$/i,
  
  // Street addresses without venue names (likely residential)
  /^\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|ct|court|way|pl|place|cir|circle)\s*$/i,
  
  // Personal indicators
  /^\s*(my|our)\s+/i,
];

/**
 * Check if a location is likely a personal/private location
 * @param {string} locationText - The location text to check
 * @returns {boolean} True if likely personal location
 */
export const isPersonalLocation = (locationText) => {
  if (!locationText || typeof locationText !== 'string') return false;
  
  const cleanText = locationText.trim();
  return PERSONAL_LOCATION_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Comprehensive location handler with multiple fallback strategies
 * Tries: Google Places -> Firebase Venues -> Local Database -> Manual Entry
 */
export class LocationHandler {
  /**
   * Handle location selection with fallbacks
   * @param {string} locationText - User input location text
   * @param {Function} onAddressFound - Callback when address is found
   * @param {Function} onError - Callback when all methods fail
   * @returns {Promise<Object>} Location result
   */
  static async handleLocationInput(locationText, onAddressFound, onError) {
    if (!locationText || typeof locationText !== 'string') {
      return { success: false, error: 'Invalid location text' };
    }

    const cleanText = locationText.trim();
    
    // Skip auto-lookup for personal locations
    if (isPersonalLocation(cleanText)) {
      console.log('[LocationHandler] Personal location detected, skipping auto-lookup');
      return { 
        success: true, 
        location: cleanText, 
        address: null, 
        source: 'personal' 
      };
    }

    console.log('[LocationHandler] Processing location:', cleanText);

    // Strategy 1: Try Google Places API
    try {
      if (GooglePlacesService.isAvailable()) {
        console.log('[LocationHandler] Trying Google Places...');
        const googleResult = await this.tryGooglePlaces(cleanText);
        if (googleResult.success) {
          onAddressFound?.(googleResult.address);
          return googleResult;
        }
      }
    } catch (error) {
      console.warn('[LocationHandler] Google Places failed:', error.message);
    }

    // Strategy 2: Try Firebase Venues database
    try {
      console.log('[LocationHandler] Trying Firebase venues...');
      const venueResult = await this.tryFirebaseVenues(cleanText);
      if (venueResult.success) {
        onAddressFound?.(venueResult.address);
        return venueResult;
      }
    } catch (error) {
      console.warn('[LocationHandler] Firebase venues failed:', error.message);
    }

    // Strategy 3: Try local hardcoded database
    try {
      console.log('[LocationHandler] Trying local database...');
      const localResult = await this.tryLocalDatabase(cleanText);
      if (localResult.success) {
        onAddressFound?.(localResult.address);
        return localResult;
      }
    } catch (error) {
      console.warn('[LocationHandler] Local database failed:', error.message);
    }

    // All strategies failed
    console.log('[LocationHandler] All location strategies failed');
    onError?.(new Error('Could not find address for this location'));
    
    return {
      success: false,
      location: cleanText,
      address: null,
      source: 'manual',
      error: 'No address found - please enter manually'
    };
  }

  /**
   * Try Google Places autocomplete
   * @param {string} locationText - Location text
   * @returns {Promise<Object>} Result object
   */
  static async tryGooglePlaces(locationText) {
    try {
      const predictions = await GooglePlacesService.getAutocompletePredictions(locationText, {
        types: 'establishment',
        components: 'country:us'
      });

      if (predictions && predictions.length > 0) {
        // Get details for the first (best) match
        const bestMatch = predictions[0];
        const details = await GooglePlacesService.getPlaceDetails(bestMatch.placeId);
        
        if (details && details.address) {
          return {
            success: true,
            location: details.name,
            address: details.address,
            coordinates: details.location,
            source: 'google_places',
            placeId: details.id
          };
        }
      }
    } catch (error) {
      console.error('[LocationHandler] Google Places error:', error);
    }

    return { success: false };
  }

  /**
   * Try Firebase venues database
   * @param {string} locationText - Location text
   * @returns {Promise<Object>} Result object
   */
  static async tryFirebaseVenues(locationText) {
    try {
      const venueData = await VenueService.getVenueAddress(locationText);
      
      if (venueData && venueData.address) {
        return {
          success: true,
          location: venueData.name,
          address: venueData.address,
          source: 'firebase_venues',
          category: venueData.category
        };
      }
    } catch (error) {
      console.error('[LocationHandler] Firebase venues error:', error);
    }

    return { success: false };
  }

  /**
   * Try local hardcoded database
   * @param {string} locationText - Location text
   * @returns {Promise<Object>} Result object
   */
  static async tryLocalDatabase(locationText) {
    // Import the local database from useSmartAutoComplete
    const { searchLocations } = await import('../events/hooks/useSmartAutoComplete');
    
    try {
      // Create a temporary hook instance to access searchLocations
      const matches = []; // We'll implement this differently since we can't call hooks here
      
      // For now, return false - this would need to be implemented differently
      // or we could extract the LOCATION_DATABASE to a separate file
      return { success: false };
    } catch (error) {
      console.error('[LocationHandler] Local database error:', error);
    }

    return { success: false };
  }

  /**
   * Validate an address string
   * @param {string} address - Address to validate
   * @returns {boolean} True if address looks valid
   */
  static isValidAddress(address) {
    if (!address || typeof address !== 'string') {
      return false;
    }

    const cleanAddress = address.trim();
    
    // Basic validation: should have at least a number and street name
    const hasNumber = /\d/.test(cleanAddress);
    const hasStreet = /\b(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|ct|court|way|pl|place|cir|circle)\b/i.test(cleanAddress);
    const hasCity = cleanAddress.split(',').length >= 2; // At least "Street, City"
    
    return hasNumber && (hasStreet || hasCity);
  }

  /**
   * Format address for consistent display
   * @param {string} address - Raw address
   * @returns {string} Formatted address
   */
  static formatAddress(address) {
    if (!address) return '';
    
    return address
      .trim()
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/^,|,$/, ''); // Remove leading/trailing commas
  }

  /**
   * Extract city and state from an address
   * @param {string} address - Full address
   * @returns {Object} {city, state} object
   */
  static parseAddress(address) {
    if (!address) return { city: null, state: null };

    const parts = address.split(',');
    
    if (parts.length >= 2) {
      // Typical format: "Street, City, State ZIP"
      const cityPart = parts[parts.length - 2]?.trim();
      const statePart = parts[parts.length - 1]?.trim();
      
      // Extract state (usually first 2 letters before ZIP)
      const stateMatch = statePart?.match(/([A-Z]{2})\s+\d/);
      const state = stateMatch ? stateMatch[1] : statePart?.substring(0, 2);
      
      return {
        city: cityPart,
        state: state
      };
    }

    return { city: null, state: null };
  }
}