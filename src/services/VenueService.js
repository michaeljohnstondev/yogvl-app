// FILE: services/VenueService.js

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

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

export class VenueService {
  /**
   * Check if a location is likely a personal/private location
   * @param {string} locationText - The location text to check
   * @returns {boolean} True if likely personal location
   */
  static isPersonalLocation(locationText) {
    if (!locationText || typeof locationText !== 'string') return false;

    const cleanText = locationText.trim();
    return PERSONAL_LOCATION_PATTERNS.some((pattern) =>
      pattern.test(cleanText)
    );
  }

  /**
   * Get venue address from Firebase if it exists
   * @param {string} locationName - The venue name to look up
   * @param {string} studioId - Studio ID
   * @returns {Promise<Object|null>} Venue data or null
   */
  static async getVenueAddress(locationName, studioId) {
    try {
      if (!locationName || typeof locationName !== 'string') return null;
      if (!studioId) {
        console.warn('[VenueService] No studioId provided for venue lookup');
        return null;
      }

      const normalizedName = locationName.toLowerCase().trim();
      console.log('[VenueService] Looking up venue:', normalizedName, 'in studio:', studioId);

      const venueDoc = await getDoc(
        doc(db, 'studios', studioId, 'venues', normalizedName)
      );

      if (venueDoc.exists()) {
        const venueData = venueDoc.data();
        console.log('[VenueService] Found venue:', venueData);

        // Increment usage count
        await this.incrementVenueUsage(normalizedName, studioId);

        return venueData;
      } else {
        console.log('[VenueService] Venue not found in database');
        return null;
      }
    } catch (error) {
      console.error('[VenueService] Error fetching venue:', error);
      return null;
    }
  }

  /**
   * Increment usage count for a venue (for analytics)
   * @param {string} venueKey - The venue key
   * @param {string} studioId - Studio ID
   */
  static async incrementVenueUsage(venueKey, studioId) {
    try {
      if (!studioId) return;

      const venueRef = doc(db, 'studios', studioId, 'venues', venueKey);
      const venueDoc = await getDoc(venueRef);

      if (venueDoc.exists()) {
        const currentCount = venueDoc.data().usageCount || 0;
        await setDoc(venueRef, {
          ...venueDoc.data(),
          usageCount: currentCount + 1,
          lastUsed: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('[VenueService] Error incrementing usage:', error);
    }
  }

  /**
   * Get venue suggestions for autocomplete
   * @param {string} searchText - The search text
   * @param {string} studioId - Studio ID
   * @returns {Promise<Array>} Array of venue suggestions
   */
  static async getVenueSuggestions(searchText, studioId) {
    try {
      if (!searchText || searchText.length < 2) return [];
      if (!studioId) {
        console.warn('[VenueService] No studioId provided for venue suggestions');
        return [];
      }

      const cleanSearch = searchText.toLowerCase().trim();
      console.log('[VenueService] Getting suggestions for:', cleanSearch, 'in studio:', studioId);

      // For now, we'll do client-side filtering
      // In the future, could implement proper search indexing
      const venuesRef = collection(db, 'studios', studioId, 'venues');
      const snapshot = await getDocs(query(venuesRef, limit(50)));

      const suggestions = [];
      snapshot.forEach((doc) => {
        const venue = doc.data();
        const name = venue.name.toLowerCase();

        // Check if venue name contains search text
        if (name.includes(cleanSearch)) {
          suggestions.push({
            id: doc.id,
            name: venue.name,
            address: venue.address,
            displayName: venue.name,
          });
        }
      });

      // Sort by usage count (popular venues first)
      suggestions.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

      return suggestions.slice(0, 5); // Top 5 suggestions
    } catch (error) {
      console.error('[VenueService] Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Seed the database with popular Greenville venues
   * Call this once to populate the initial venue database
   */
  static async seedGreenvilleVenues() {
    try {
      console.log('[VenueService] Seeding Greenville venues...');

      const venues = {
        // Parks and Recreation
        'falls park': {
          name: 'Falls Park on the Reedy',
          address: '601 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'park',
        },
        'falls park on the reedy': {
          name: 'Falls Park on the Reedy',
          address: '601 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'park',
        },
        'cleveland park': {
          name: 'Cleveland Park',
          address: '1 Cleveland St, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'park',
        },
        'swamp rabbit trail': {
          name: 'Swamp Rabbit Trail',
          address: '1 Cleveland St, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'trail',
        },

        // Entertainment & Sports
        'peace center': {
          name: 'Peace Center',
          address: '300 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'theater',
        },
        'fluor field': {
          name: 'Fluor Field at the West End',
          address: '945 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'stadium',
        },
        'bon secours wellness arena': {
          name: 'Bon Secours Wellness Arena',
          address: '650 N Academy St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'arena',
        },
        'kroc center': {
          name: 'Kroc Center Greenville',
          address: '424 Westfield St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'recreation',
        },

        // Downtown Areas
        'main street': {
          name: 'Main Street Downtown',
          address: '200 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'area',
        },
        'west end': {
          name: 'West End',
          address: '1000 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'area',
        },
        'liberty bridge': {
          name: 'Liberty Bridge',
          address: '601 S Main St, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'landmark',
        },

        // Shopping & Dining Areas
        'the commons': {
          name: 'The Commons at Greenville',
          address: '1021 Woodruff Rd, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'shopping',
        },
        'haywood mall': {
          name: 'Haywood Mall',
          address: '700 Haywood Rd, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'shopping',
        },
        'cherrydale point': {
          name: 'Cherrydale Point',
          address: '1110 Woodruff Rd, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'shopping',
        },

        // Universities & Colleges
        'furman university': {
          name: 'Furman University',
          address: '3300 Poinsett Hwy, Greenville, SC 29613',
          isPublicVenue: true,
          usageCount: 0,
          category: 'university',
        },
        'greenville technical college': {
          name: 'Greenville Technical College',
          address: '506 S Pleasantburg Dr, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'college',
        },

        // Community Centers & Libraries
        'hughes main library': {
          name: 'Hughes Main Library',
          address: '25 Heritage Green Pl, Greenville, SC 29601',
          isPublicVenue: true,
          usageCount: 0,
          category: 'library',
        },
        'td convention center': {
          name: 'TD Convention Center',
          address: '1 Exposition Ave, Greenville, SC 29607',
          isPublicVenue: true,
          usageCount: 0,
          category: 'convention',
        },
      };

      // Add venues to Firebase
      for (const [key, venue] of Object.entries(venues)) {
        await setDoc(doc(db, 'venues', key), {
          ...venue,
          createdAt: serverTimestamp(),
        });
      }

      console.log(
        `[VenueService] Successfully seeded ${Object.keys(venues).length} venues`
      );
    } catch (error) {
      console.error('[VenueService] Error seeding venues:', error);
    }
  }

  /**
   * Add a new venue manually
   * @param {string} name - Venue name
   * @param {string} address - Venue address
   * @param {string} studioId - Studio ID
   * @param {string} category - Venue category
   */
  /**
   * Add a venue to the database
   * SAFETY: Only Google Places results should be saved automatically
   * @param {string} name - Venue name
   * @param {string} address - Venue address
   * @param {string} studioId - Studio ID
   * @param {string} source - Source of venue ('google_place' only for auto-save)
   * @returns {Promise<boolean>} True if saved, false if rejected
   */
  static async addVenue(name, address, studioId, source = 'manual') {
    try {
      if (!studioId) {
        console.warn('[VenueService] No studioId provided for addVenue');
        return false;
      }

      // SAFETY: Only save venues from Google Places API automatically
      if (source !== 'google_place') {
        console.warn('[VenueService] ⚠️ Rejecting venue save - only Google Places results are saved automatically');
        console.warn('[VenueService] Source:', source, 'Name:', name);
        return false;
      }

      // Validate required fields
      if (!name || !address) {
        console.warn('[VenueService] Missing required fields:', { name, address });
        return false;
      }

      const key = name.toLowerCase().trim();
      await setDoc(doc(db, 'studios', studioId, 'venues', key), {
        name,
        address,
        source: 'google_place',  // Always mark as verified from Google
        verified: true,           // Google Places results are verified
        isPublicVenue: true,
        usageCount: 0,
        createdAt: serverTimestamp(),
      });

      console.log('[VenueService] ✅ Added verified venue from Google Places:', name, 'to studio:', studioId);
      return true;
    } catch (error) {
      console.error('[VenueService] Error adding venue:', error);
      return false;
    }
  }
}
