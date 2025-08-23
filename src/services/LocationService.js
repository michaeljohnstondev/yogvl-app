import * as Location from 'expo-location';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export class LocationService {
  /**
   * Get current GPS location
   * @returns {Promise<Object|null>} Location object with latitude and longitude
   */
  static async getCurrentLocation() {
    try {
      console.log('[LocationService] Requesting location permissions...');

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LocationService] Location permission denied');
        return null;
      }

      console.log('[LocationService] Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000, // 15 second timeout
      });

      console.log('[LocationService] GPS location obtained:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('[LocationService] Error getting location:', error);
      return null;
    }
  }

  /**
   * Convert GPS coordinates to a zone using reverse geocoding
   * @param {Object} location - Location object with latitude and longitude
   * @returns {Promise<Object>} Zone object with zone and displayName
   */
  static async getZoneFromLocation(location) {
    try {
      console.log('[LocationService] Reverse geocoding location:', location);

      // Use Expo's reverse geocoding
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (reverseGeocode.length === 0) {
        console.log('[LocationService] No reverse geocoding results');
        return {
          zone: 'unknown_location',
          displayName: 'Unknown Location',
        };
      }

      const address = reverseGeocode[0];
      console.log('[LocationService] Reverse geocoding result:', address);

      // Extract relevant location information
      const city = address.city || address.district || address.subregion;
      const region = address.region || address.state;
      const country = address.country;

      // Generate zone based on location hierarchy
      const zone = this.generateZoneFromAddress(address);
      const displayName = this.generateDisplayName(city, region, country);

      console.log('[LocationService] Generated zone:', { zone, displayName });

      return { zone, displayName };
    } catch (error) {
      console.error('[LocationService] Error reverse geocoding:', error);
      return {
        zone: 'unknown_location',
        displayName: 'Unknown Location',
      };
    }
  }

  /**
   * Generate a zone identifier from address components
   * Uses the "fish in ocean" model where big metros swallow smaller areas
   * @param {Object} address - Address object from reverse geocoding
   * @returns {string} Zone identifier
   */
  static generateZoneFromAddress(address) {
    const city = (
      address.city ||
      address.district ||
      address.subregion ||
      ''
    ).toLowerCase();
    const region = (address.region || address.state || '').toLowerCase();
    const country = (address.country || '').toLowerCase();

    // Major metro areas that swallow surrounding cities
    const majorMetros = {
      // US Metro areas
      'new york': 'nyc_metro',
      manhattan: 'nyc_metro',
      brooklyn: 'nyc_metro',
      queens: 'nyc_metro',
      bronx: 'nyc_metro',
      'staten island': 'nyc_metro',
      newark: 'nyc_metro',
      'jersey city': 'nyc_metro',

      'los angeles': 'la_metro',
      hollywood: 'la_metro',
      'santa monica': 'la_metro',
      'beverly hills': 'la_metro',
      pasadena: 'la_metro',

      'san francisco': 'sf_bay',
      oakland: 'sf_bay',
      'san jose': 'sf_bay',
      berkeley: 'sf_bay',
      'palo alto': 'sf_bay',

      chicago: 'chicago_metro',
      austin: 'austin_metro',
      atlanta: 'atlanta_metro',
      miami: 'miami_metro',
      seattle: 'seattle_metro',
      denver: 'denver_metro',

      // South Carolina specific
      greenville: 'greenville_metro',
      spartanburg: 'greenville_metro',
      anderson: 'greenville_metro',
      mauldin: 'greenville_metro',
      simpsonville: 'greenville_metro',
      greer: 'greenville_metro',

      charleston: 'charleston_metro',
      'mount pleasant': 'charleston_metro',
      summerville: 'charleston_metro',

      columbia: 'columbia_metro',
    };

    // Check if city matches a major metro
    for (const [cityName, metro] of Object.entries(majorMetros)) {
      if (city.includes(cityName) || cityName.includes(city)) {
        return metro;
      }
    }

    // Small towns and college areas get their own zones
    const smallTownZones = {
      clemson: 'clemson_area',
      seneca: 'seneca_area',
      walhalla: 'walhalla_area',
      westminster: 'westminster_area',
      central: 'central_area',
      easley: 'easley_area',
    };

    for (const [townName, zone] of Object.entries(smallTownZones)) {
      if (city.includes(townName) || townName.includes(city)) {
        return zone;
      }
    }

    // Fallback: generate zone from city_region or region_area
    if (city && region) {
      // Clean up city name for zone
      const cleanCity = city.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      const cleanRegion = region.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

      // For smaller cities, use city_region format
      if (cleanCity.length > 0) {
        return `${cleanCity}_${cleanRegion}`;
      } else if (cleanRegion.length > 0) {
        return `${cleanRegion}_area`;
      }
    }

    // Ultimate fallback
    return country === 'united states' ? 'usa_general' : 'global_general';
  }

  /**
   * Generate a human-readable display name
   * @param {string} city - City name
   * @param {string} region - Region/state name
   * @param {string} country - Country name
   * @returns {string} Display name
   */
  static generateDisplayName(city, region, country) {
    if (city && region) {
      return `${city}, ${region}`;
    } else if (city) {
      return city;
    } else if (region) {
      return region;
    } else if (country) {
      return country;
    } else {
      return 'Unknown Location';
    }
  }

  /**
   * Update user's location in Firebase
   * Adds user to new zone and removes from old zone
   * @param {string} userId - User ID
   * @param {string} newZone - New zone identifier
   * @param {string} oldZone - Old zone identifier (optional, for cleanup)
   */
  static async updateUserLocation(userId, newZone, oldZone = null) {
    try {
      console.log('[LocationService] Updating user location:', {
        userId,
        newZone,
        oldZone,
      });

      // Add user to new zone
      await setDoc(doc(db, 'locations', newZone, 'users', userId), {
        joinedAt: new Date(),
        active: true,
      });

      // Remove user from old zone if specified
      if (oldZone && oldZone !== newZone) {
        await deleteDoc(doc(db, 'locations', oldZone, 'users', userId));
        console.log('[LocationService] Removed user from old zone:', oldZone);
      }

      console.log('[LocationService] User location updated successfully');
    } catch (error) {
      console.error('[LocationService] Error updating user location:', error);
      throw error;
    }
  }

  /**
   * Generate zone from text input (for manual location entry)
   * @param {string} locationText - User-entered location text
   * @returns {Object} Zone object with zone and displayName
   */
  static async generateZoneFromText(locationText) {
    try {
      console.log('[LocationService] Generating zone from text:', locationText);

      // Clean up the input
      const cleanText = locationText.trim().toLowerCase();

      // Check if it matches known cities/areas
      const knownLocations = {
        // Granular major metros
        'new york': { zone: 'manhattan', displayName: 'New York, NY' },
        nyc: { zone: 'manhattan', displayName: 'New York, NY' },
        manhattan: { zone: 'manhattan', displayName: 'Manhattan, NY' },
        brooklyn: { zone: 'brooklyn', displayName: 'Brooklyn, NY' },
        queens: { zone: 'queens', displayName: 'Queens, NY' },
        bronx: { zone: 'bronx', displayName: 'Bronx, NY' },

        'los angeles': { zone: 'la_central', displayName: 'Los Angeles, CA' },
        la: { zone: 'la_central', displayName: 'Los Angeles, CA' },
        hollywood: { zone: 'la_central', displayName: 'Los Angeles, CA' },
        'santa monica': {
          zone: 'la_westside',
          displayName: 'Santa Monica, CA',
        },

        'san francisco': {
          zone: 'san_francisco',
          displayName: 'San Francisco, CA',
        },
        sf: { zone: 'san_francisco', displayName: 'San Francisco, CA' },
        oakland: { zone: 'oakland', displayName: 'Oakland, CA' },
        'san jose': { zone: 'san_jose', displayName: 'San Jose, CA' },
        berkeley: { zone: 'berkeley', displayName: 'Berkeley, CA' },

        chicago: { zone: 'chicago', displayName: 'Chicago, IL' },
        austin: { zone: 'austin', displayName: 'Austin, TX' },
        atlanta: { zone: 'atlanta', displayName: 'Atlanta, GA' },
        miami: { zone: 'miami', displayName: 'Miami, FL' },
        seattle: { zone: 'seattle', displayName: 'Seattle, WA' },
        denver: { zone: 'denver', displayName: 'Denver, CO' },

        // South Carolina - separate cities
        greenville: { zone: 'greenville', displayName: 'Greenville, SC' },
        spartanburg: { zone: 'spartanburg', displayName: 'Spartanburg, SC' },
        anderson: { zone: 'anderson', displayName: 'Anderson, SC' },

        charleston: { zone: 'charleston', displayName: 'Charleston, SC' },
        columbia: { zone: 'columbia', displayName: 'Columbia, SC' },

        clemson: { zone: 'clemson', displayName: 'Clemson, SC' },
        seneca: { zone: 'seneca', displayName: 'Seneca, SC' },
        easley: { zone: 'easley', displayName: 'Easley, SC' },

        // Small towns that register to nearby metros
        parker: { zone: 'greenville', displayName: 'Greenville, SC' },
        'travelers rest': { zone: 'greenville', displayName: 'Greenville, SC' },
        'fountain inn': { zone: 'greenville', displayName: 'Greenville, SC' },
        'boiling springs': {
          zone: 'spartanburg',
          displayName: 'Spartanburg, SC',
        },

        // Common travel destinations
        orlando: { zone: 'orlando', displayName: 'Orlando, FL' },
        nashville: { zone: 'nashville', displayName: 'Nashville, TN' },
        charlotte: { zone: 'charlotte', displayName: 'Charlotte, NC' },
        asheville: { zone: 'asheville', displayName: 'Asheville, NC' },
      };

      // Check for exact matches
      if (knownLocations[cleanText]) {
        console.log('[LocationService] Found exact match for:', cleanText);
        return knownLocations[cleanText];
      }

      // Check for partial matches
      for (const [key, location] of Object.entries(knownLocations)) {
        if (cleanText.includes(key) || key.includes(cleanText)) {
          console.log(
            '[LocationService] Found partial match for:',
            cleanText,
            '->',
            key
          );
          return location;
        }
      }

      // Smart generic zone generation for unknown locations
      const parts = locationText.split(',').map((part) => part.trim());
      const city = parts[0];
      const state = parts[1];

      // Create clean zone name
      const cleanCity = city
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');
      let zoneName, displayName;

      if (state) {
        // If state provided: "austin, tx" -> austin_tx
        const cleanState = state
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_');
        zoneName = `${cleanCity}_${cleanState}`;
        displayName = `${city}, ${state.toUpperCase()}`;
      } else {
        // If no state: "clemson" -> clemson_area
        zoneName = `${cleanCity}_area`;
        displayName = city.charAt(0).toUpperCase() + city.slice(1);
      }

      console.log(
        '[LocationService] Generated smart zone for:',
        cleanText,
        '->',
        zoneName
      );
      return {
        zone: zoneName,
        displayName: displayName,
      };
    } catch (error) {
      console.error(
        '[LocationService] Error generating zone from text:',
        error
      );
      return {
        zone: 'unknown_location',
        displayName: locationText || 'Unknown Location',
      };
    }
  }

  /**
   * Get location suggestions for autocomplete from real user data
   * @param {string} searchText - The text user is typing
   * @returns {Promise<Array>} Array of suggestion objects with displayName and zone
   */
  static async getSuggestions(searchText) {
    try {
      const cleanSearch = searchText.trim().toLowerCase();
      if (cleanSearch.length < 2) return [];

      console.log('[LocationService] Getting suggestions for:', cleanSearch);

      // Get real locations from Firebase users collection
      const realLocations = await this.getRealLocationSuggestions(cleanSearch);

      // Fallback to known locations if no real data found
      const knownLocations = {
        // Granular major metros
        'new york': { zone: 'manhattan', displayName: 'New York, NY' },
        nyc: { zone: 'manhattan', displayName: 'New York, NY' },
        manhattan: { zone: 'manhattan', displayName: 'Manhattan, NY' },
        brooklyn: { zone: 'brooklyn', displayName: 'Brooklyn, NY' },
        queens: { zone: 'queens', displayName: 'Queens, NY' },
        bronx: { zone: 'bronx', displayName: 'Bronx, NY' },

        'los angeles': { zone: 'la_central', displayName: 'Los Angeles, CA' },
        la: { zone: 'la_central', displayName: 'Los Angeles, CA' },
        hollywood: { zone: 'la_central', displayName: 'Los Angeles, CA' },
        'santa monica': {
          zone: 'la_westside',
          displayName: 'Santa Monica, CA',
        },

        'san francisco': {
          zone: 'san_francisco',
          displayName: 'San Francisco, CA',
        },
        sf: { zone: 'san_francisco', displayName: 'San Francisco, CA' },
        oakland: { zone: 'oakland', displayName: 'Oakland, CA' },
        'san jose': { zone: 'san_jose', displayName: 'San Jose, CA' },
        berkeley: { zone: 'berkeley', displayName: 'Berkeley, CA' },

        chicago: { zone: 'chicago', displayName: 'Chicago, IL' },
        austin: { zone: 'austin', displayName: 'Austin, TX' },
        atlanta: { zone: 'atlanta', displayName: 'Atlanta, GA' },
        miami: { zone: 'miami', displayName: 'Miami, FL' },
        seattle: { zone: 'seattle', displayName: 'Seattle, WA' },
        denver: { zone: 'denver', displayName: 'Denver, CO' },

        // South Carolina - separate cities
        greenville: { zone: 'greenville', displayName: 'Greenville, SC' },
        spartanburg: { zone: 'spartanburg', displayName: 'Spartanburg, SC' },
        anderson: { zone: 'anderson', displayName: 'Anderson, SC' },

        charleston: { zone: 'charleston', displayName: 'Charleston, SC' },
        columbia: { zone: 'columbia', displayName: 'Columbia, SC' },

        clemson: { zone: 'clemson', displayName: 'Clemson, SC' },
        seneca: { zone: 'seneca', displayName: 'Seneca, SC' },
        easley: { zone: 'easley', displayName: 'Easley, SC' },

        // Small towns that register to nearby metros
        parker: { zone: 'greenville', displayName: 'Greenville, SC' },
        'travelers rest': { zone: 'greenville', displayName: 'Greenville, SC' },
        'fountain inn': { zone: 'greenville', displayName: 'Greenville, SC' },
        'boiling springs': {
          zone: 'spartanburg',
          displayName: 'Spartanburg, SC',
        },

        // Common travel destinations
        orlando: { zone: 'orlando', displayName: 'Orlando, FL' },
        nashville: { zone: 'nashville', displayName: 'Nashville, TN' },
        charlotte: { zone: 'charlotte', displayName: 'Charlotte, NC' },
        asheville: { zone: 'asheville', displayName: 'Asheville, NC' },
      };

      // Combine real locations with fallback known locations
      const allMatches = [...realLocations];

      // Add fallback matches if we don't have enough real data
      if (allMatches.length < 5) {
        for (const [key, location] of Object.entries(knownLocations)) {
          if (
            key.includes(cleanSearch) ||
            location.displayName.toLowerCase().includes(cleanSearch)
          ) {
            // Avoid duplicates
            if (!allMatches.find((match) => match.zone === location.zone)) {
              allMatches.push(location);
            }
          }
          if (allMatches.length >= 10) break; // Don't add too many fallbacks
        }
      }

      // Sort by relevance (real data first, then exact matches, then partial matches)
      allMatches.sort((a, b) => {
        const aIsReal = a.isRealData || false;
        const bIsReal = b.isRealData || false;

        // Real data gets priority
        if (aIsReal && !bIsReal) return -1;
        if (!aIsReal && bIsReal) return 1;

        // Then exact matches
        const aStartsWith = a.displayName.toLowerCase().startsWith(cleanSearch);
        const bStartsWith = b.displayName.toLowerCase().startsWith(cleanSearch);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      // Limit to top 5 suggestions
      return allMatches.slice(0, 5);
    } catch (error) {
      console.error('[LocationService] Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Get real location suggestions from Firebase users collection
   * @param {string} searchText - The text user is typing
   * @returns {Promise<Array>} Array of real location suggestions
   */
  static async getRealLocationSuggestions(searchText) {
    try {
      console.log(
        '[LocationService] Querying Firebase for real locations matching:',
        searchText
      );

      // Query users collection for locations that match the search text
      const usersRef = collection(db, 'users');

      // We'll need to get all users with location data and filter client-side
      // because Firestore doesn't support case-insensitive partial text search
      const q = query(
        usersRef,
        where('hasSelectedLocation', '==', true),
        limit(50) // Limit to recent users to avoid huge queries
      );

      const querySnapshot = await getDocs(q);
      const locationMatches = new Map(); // Use Map to avoid duplicates

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const displayName = userData.locationDisplayName;
        const zone = userData.currentZone;

        if (displayName && zone) {
          const searchLower = searchText.toLowerCase();
          const displayLower = displayName.toLowerCase();

          // Check if the location matches the search
          if (
            displayLower.includes(searchLower) ||
            zone.toLowerCase().includes(searchLower)
          ) {
            // Use zone as key to avoid duplicates
            if (!locationMatches.has(zone)) {
              locationMatches.set(zone, {
                zone: zone,
                displayName: displayName,
                isRealData: true, // Mark as real data for sorting priority
              });
            }
          }
        }
      });

      const results = Array.from(locationMatches.values());
      console.log(
        '[LocationService] Found',
        results.length,
        'real location matches'
      );
      return results;
    } catch (error) {
      console.error('[LocationService] Error querying real locations:', error);
      return [];
    }
  }

  /**
   * Get all users in a specific zone (for local friend discovery)
   * @param {string} zone - Zone identifier
   * @returns {Promise<Array>} Array of user IDs in the zone
   */
  static async getUsersInZone(zone) {
    try {
      // This would require a more complex query in practice
      // For now, we'll handle this in the InviteScreen with mock data
      console.log('[LocationService] Getting users in zone:', zone);
      return [];
    } catch (error) {
      console.error('[LocationService] Error getting users in zone:', error);
      return [];
    }
  }
}
