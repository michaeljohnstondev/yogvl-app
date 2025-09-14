import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export class StudioService {
  /**
   * Get all available studios from Firebase
   * @returns {Promise<Array>} Array of studio objects
   */
  static async getAllStudios() {
    try {
      const studiosRef = collection(db, 'studios');
      const q = query(studiosRef, where('status', '==', 'active'));
      const snapshot = await getDocs(q);

      const studios = [];
      snapshot.forEach((doc) => {
        const studioData = doc.data();
        studios.push({
          id: doc.id,
          ...studioData,
        });
      });

      console.log(
        `[StudioService] Loaded ${studios.length} active studios from Firebase`
      );
      // Add member counts to all studios
      return await this.addMemberCounts(studios);
    } catch (error) {
      console.error(
        '[StudioService] Error loading studios from Firebase:',
        error
      );
      // Fallback to hardcoded data if Firebase fails
      console.log('[StudioService] Falling back to hardcoded studio data');
      const hardcodedStudios = this.getHardcodedStudios();
      return await this.addMemberCounts(hardcodedStudios);
    }
  }

  /**
   * Get member count for a specific studio by counting users
   * @param {string} studioId - Studio ID to count members for
   * @returns {Promise<number>} Number of members in the studio
   */
  static async getStudioMemberCount(studioId) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('userdata.studios.default.studioId', '==', studioId)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(
        `[StudioService] Error counting members for studio ${studioId}:`,
        error
      );
      return 0;
    }
  }

  /**
   * Add member counts to an array of studios
   * @param {Array} studios - Array of studio objects
   * @returns {Promise<Array>} Studios with memberCount added
   */
  static async addMemberCounts(studios) {
    try {
      const studiosWithCounts = await Promise.all(
        studios.map(async (studio) => {
          const memberCount = await this.getStudioMemberCount(studio.id);
          return {
            ...studio,
            memberCount,
          };
        })
      );
      return studiosWithCounts;
    } catch (error) {
      console.error('[StudioService] Error adding member counts:', error);
      return studios; // Return original studios if counting fails
    }
  }

  /**
   * Get hardcoded studios (fallback)
   * @returns {Array} Array of studio objects
   */
  static getHardcodedStudios() {
    return [
      // Only Greenville as the default studio for fallback/initialization
      {
        id: 'greenville_sc',
        name: 'Greenville Studio',
        city: 'Greenville',
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 34.8526, lng: -82.394 },
        description: 'Default studio for the Greenville, SC area',
        coversTowns: ['Greenville', 'Simpsonville', 'Greer', 'Mauldin'],
        isActive: true,
        status: 'active',
      },
    ];
  }

  /**
   * Get active studios only
   * @returns {Promise<Array>} Array of active studio objects
   */
  static async getActiveStudios() {
    return await this.getAllStudios(); // Already filters for active studios
  }

  /**
   * Get centers by region
   * @param {string} region - Region name
   * @returns {Promise<Array>} Array of studio objects in the region
   */
  static async getStudiosByRegion(region) {
    const allStudios = await this.getAllStudios();
    return allStudios.filter((studio) => studio.region === region);
  }

  /**
   * Find studio by ID from Firebase or cache
   * @param {string} studioId - Studio ID
   * @returns {Promise<Object|null>} Studio object or null
   */
  static async getStudioById(studioId) {
    try {
      const studioDoc = await getDoc(doc(db, 'studios', studioId));
      if (studioDoc.exists()) {
        return {
          id: studioDoc.id,
          ...studioDoc.data(),
        };
      }
      return null;
    } catch (error) {
      console.error(`[StudioService] Error getting studio ${studioId}:`, error);
      // Fallback to hardcoded data
      return (
        this.getHardcodedStudios().find((studio) => studio.id === studioId) ||
        null
      );
    }
  }

  /**
   * Find studios by city name match
   * @param {string} cityName - Name of city
   * @returns {Promise<Array>} Array of studios that match this city
   */
  static async getStudiosForTown(cityName) {
    const normalizedCity = cityName.toLowerCase().trim();
    const allStudios = await this.getAllStudios();
    return allStudios.filter(
      (studio) =>
        studio.city?.toLowerCase().includes(normalizedCity) ||
        normalizedCity.includes(studio.city?.toLowerCase())
    );
  }

  /**
   * Get nearby centers based on a user's location
   * @param {string} homeStudioId - User's home center ID
   * @returns {Promise<Array>} Array of nearby studio objects
   */
  static async getNearbyStudios(homeStudioId) {
    const homeStudio = await this.getStudioById(homeStudioId);
    if (!homeStudio) return [];

    // Return studios in the same region, excluding home studio
    const regionStudios = await this.getStudiosByRegion(homeStudio.region);
    return regionStudios.filter((studio) => studio.id !== homeStudioId);
  }

  /**
   * Update user's studio information in their profile
   * @param {string} userId - User ID
   * @param {string} studioId - Studio ID
   */
  static async updateUserStudio(userId, studioId) {
    try {
      console.log('[StudioService] Updating user studio:', {
        userId,
        studioId,
      });

      const studio = await this.getStudioById(studioId);
      if (!studio) {
        throw new Error(`Studio ${studioId} not found`);
      }

      // Update user document with studio info in new structure
      await setDoc(
        doc(db, 'users', userId),
        {
          userdata: {
            studios: {
              default: {
                studioId: studioId,
                studioName: studio.name,
                studioCity: studio.city,
                studioState: studio.state,
              },
              additional: [], // Array for future multiple studio support
            },
          },
        },
        { merge: true }
      );

      console.log('[StudioService] User studio updated successfully');
    } catch (error) {
      console.error('[StudioService] Error updating user studio:', error);
      throw error;
    }
  }

  /**
   * Get suggestions for autocomplete based on user input
   * @param {string} searchText - Search text from user
   * @returns {Promise<Array>} Array of suggestion objects
   */
  static async getSuggestions(searchText) {
    if (!searchText || searchText.trim().length < 2) return [];

    const normalizedSearch = searchText.toLowerCase().trim();
    const suggestions = [];

    // Search through all studios
    const allStudios = await this.getAllStudios();
    allStudios.forEach((studio) => {
      // Check studio name and city
      if (
        studio.name?.toLowerCase().includes(normalizedSearch) ||
        studio.city?.toLowerCase().includes(normalizedSearch)
      ) {
        suggestions.push({
          displayName: `${studio.city}, ${studio.state}`,
          studioId: studio.id,
          studioName: studio.name,
          isActive: studio.isActive !== false, // Default to true if not specified
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.reduce((unique, item) => {
      if (
        !unique.find(
          (u) =>
            u.studioId === item.studioId && u.displayName === item.displayName
        )
      ) {
        unique.push(item);
      }
      return unique;
    }, []);

    // Sort by: active centers first, then by name
    return uniqueSuggestions
      .sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return a.displayName.localeCompare(b.displayName);
      })
      .slice(0, 8); // Limit to 8 suggestions
  }

  /**
   * Generate center selection from text input (like current generateZoneFromText)
   * @param {string} locationText - User-entered location text
   * @returns {Promise<Object>} Center selection object
   */
  static async generateStudioFromText(locationText) {
    const suggestions = await this.getSuggestions(locationText);

    if (suggestions.length > 0) {
      const bestMatch = suggestions[0];
      return {
        studioId: bestMatch.studioId,
        studioName: bestMatch.studioName,
        displayName: bestMatch.displayName,
        isActive: bestMatch.isActive,
      };
    }

    // Fallback for unknown locations - suggest closest or default
    return {
      studioId: 'unknown_location',
      studioName: 'Location Not Available',
      displayName: locationText || 'Unknown Location',
      isActive: false,
    };
  }

  /**
   * Check if a center can host events
   * @param {string} studioId - Studio ID
   * @returns {Promise<boolean>} Whether the center can host events
   */
  static async canHostEvents(studioId) {
    const studio = await this.getStudioById(studioId);
    return studio && studio.isActive !== false; // Check if studio exists and is active
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lng1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lng2 - Longitude 2
   * @returns {number} Distance in miles
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    // Safety check for undefined coordinates
    if (
      typeof lat1 !== 'number' ||
      typeof lng1 !== 'number' ||
      typeof lat2 !== 'number' ||
      typeof lng2 !== 'number'
    ) {
      console.warn(
        '[StudioService] Invalid coordinates for distance calculation:',
        { lat1, lng1, lat2, lng2 }
      );
      return null;
    }

    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get closest studios to user's location
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {number} limit - Number of studios to return (default 5)
   * @param {number} maxDistance - Maximum distance in miles (default 100)
   * @returns {Promise<Array>} Array of closest studios with distance
   */
  static async getClosestStudios(
    userLat,
    userLng,
    limit = 5,
    maxDistance = 100
  ) {
    console.log('[StudioService] Getting closest studios for coordinates:', {
      userLat,
      userLng,
      maxDistance,
    });
    const allStudios = await this.getAllStudios();
    console.log('[StudioService] All studios loaded:', allStudios.length);
    console.log(
      '[StudioService] Studios with coordinates:',
      allStudios.map((s) => ({
        id: s.id,
        name: s.name,
        hasCoordinates: !!s.coordinates,
        coordinates: s.coordinates,
      }))
    );

    const studiosWithCoordinates = allStudios.filter(
      (studio) => studio.coordinates
    );
    console.log(
      '[StudioService] Studios after coordinate filter:',
      studiosWithCoordinates.length
    );

    const studiosWithDistance = studiosWithCoordinates
      .map((studio) => ({
        ...studio,
        distance: this.calculateDistance(
          userLat,
          userLng,
          studio.coordinates.lat,
          studio.coordinates.lng
        ),
      }))
      .filter(
        (studio) => studio.distance !== null && studio.distance <= maxDistance
      ) // Filter by maximum distance and valid distance
      .sort((a, b) => a.distance - b.distance) // Sort by distance
      .slice(0, limit); // Limit results

    console.log(
      '[StudioService] Studios within',
      maxDistance,
      'miles:',
      studiosWithDistance.length
    );

    // Add member counts to the closest studios
    const studiosWithCounts = await this.addMemberCounts(studiosWithDistance);
    return studiosWithCounts;
  }

  /**
   * Get user's default studio from userData
   * @param {Object} userData - User document data
   * @returns {Object|null} Default studio object or null
   */
  static getUserDefaultStudio(userData) {
    return userData?.userdata?.studios?.default || null;
  }

  /**
   * Get user's additional studios from userData
   * @param {Object} userData - User document data
   * @returns {Array} Array of additional studio objects
   */
  static getUserAdditionalStudios(userData) {
    return userData?.userdata?.studios?.additional || [];
  }

  /**
   * Create a studio in Firebase
   * @param {Object} studioData - Studio data object
   * @returns {Promise<boolean>} Success status
   */
  static async createStudio(studioData) {
    try {
      console.log('[StudioService] Creating studio:', studioData.name);
      await setDoc(doc(db, 'studios', studioData.id), {
        ...studioData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(
        '[StudioService] Successfully created studio:',
        studioData.name
      );
      return true;
    } catch (error) {
      console.error('[StudioService] Error creating studio:', error);
      return false;
    }
  }

  /**
   * Ensure a default studio exists, create Greenville if none exist
   * @returns {Promise<boolean>} Success status
   */
  static async ensureDefaultStudio() {
    try {
      console.log('[StudioService] Checking if studios exist...');
      const studios = await this.getAllStudios();

      if (studios.length === 0) {
        console.log(
          '[StudioService] No studios found, initializing Greenville studio...'
        );

        const greenvilleStudio = {
          id: 'greenville_sc',
          name: 'Greenville Studio',
          city: 'Greenville',
          state: 'SC',
          region: 'Southeast',
          coordinates: { lat: 34.8526, lng: -82.394 },
          description: 'Auto-initialized default studio for Greenville, SC',
          coversTowns: ['Greenville', 'Simpsonville', 'Greer', 'Mauldin'],
          isActive: true,
        };

        return await this.createStudio(greenvilleStudio);
      } else {
        console.log(
          '[StudioService] Studios already exist, skipping auto-initialization'
        );
        return true;
      }
    } catch (error) {
      console.error('[StudioService] Error in auto-initialization:', error);
      return false;
    }
  }
}
