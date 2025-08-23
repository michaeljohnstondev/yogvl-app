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

export class Studio {
  /**
   * Get all available studios
   * @returns {Array} Array of studio objects
   */
  static getAllCenters() {
    return [
      // South Carolina Studios
      {
        id: 'greenville_sc',
        name: 'Greenville Studio',
        city: 'Greenville',
        state: 'SC',
        region: 'Southeast',
      },
      {
        id: 'simpsonville_sc',
        name: 'Simpsonville Studio',
        city: 'Simpsonville',
        state: 'SC',
        region: 'Southeast',
      },
      {
        id: 'charleston_sc',
        name: 'Charleston Studio',
        city: 'Charleston',
        state: 'SC',
        region: 'Southeast',
      },
      {
        id: 'columbia_sc',
        name: 'Columbia Studio',
        city: 'Columbia',
        state: 'SC',
        region: 'Southeast',
      },
      {
        id: 'clemson_sc',
        name: 'Clemson Studio',
        city: 'Clemson',
        state: 'SC',
        region: 'Southeast',
      },
      {
        id: 'myrtle_beach_sc',
        name: 'Myrtle Beach Studio',
        city: 'Myrtle Beach',
        state: 'SC',
        region: 'Southeast',
      },

      // North Carolina Centers
      {
        id: 'charlotte_nc',
        name: 'Charlotte Studio',
        city: 'Charlotte',
        state: 'NC',
        region: 'Southeast',
      },
      {
        id: 'asheville_nc',
        name: 'Asheville Studio',
        city: 'Asheville',
        state: 'NC',
        region: 'Southeast',
      },

      // Georgia Centers
      {
        id: 'atlanta_ga',
        name: 'Atlanta Studio',
        city: 'Atlanta',
        state: 'GA',
        region: 'Southeast',
      },
      {
        id: 'manhattan_ny',
        name: 'Manhattan Studio',
        city: 'Manhattan',
        state: 'NY',
        region: 'Northeast',
      },
      {
        id: 'brooklyn_ny',
        name: 'Brooklyn Studio',
        city: 'Brooklyn',
        state: 'NY',
        region: 'Northeast',
      },
      {
        id: 'san_francisco_ca',
        name: 'San Francisco Studio',
        city: 'San Francisco',
        state: 'CA',
        region: 'West Coast',
      },
      {
        id: 'los_angeles_ca',
        name: 'Los Angeles Studio',
        city: 'Los Angeles',
        state: 'CA',
        region: 'West Coast',
      },
      {
        id: 'chicago_il',
        name: 'Chicago Studio',
        city: 'Chicago',
        state: 'IL',
        region: 'Midwest',
      },
      {
        id: 'austin_tx',
        name: 'Austin Studio',
        city: 'Austin',
        state: 'TX',
        region: 'Southwest',
      },

      // Additional Major Cities
      {
        id: 'boston_ma',
        name: 'Boston Studio',
        city: 'Boston',
        state: 'MA',
        region: 'Northeast',
      },
      {
        id: 'philadelphia_pa',
        name: 'Philadelphia Studio',
        city: 'Philadelphia',
        state: 'PA',
        region: 'Northeast',
      },
      {
        id: 'washington_dc',
        name: 'Washington DC Studio',
        city: 'Washington',
        state: 'DC',
        region: 'Northeast',
      },
      {
        id: 'raleigh_nc',
        name: 'Raleigh Studio',
        city: 'Raleigh',
        state: 'NC',
        region: 'Southeast',
      },
      {
        id: 'miami_fl',
        name: 'Miami Studio',
        city: 'Miami',
        state: 'FL',
        region: 'Southeast',
      },
      {
        id: 'detroit_mi',
        name: 'Detroit Studio',
        city: 'Detroit',
        state: 'MI',
        region: 'Midwest',
      },
      {
        id: 'minneapolis_mn',
        name: 'Minneapolis Studio',
        city: 'Minneapolis',
        state: 'MN',
        region: 'Midwest',
      },
      {
        id: 'dallas_tx',
        name: 'Dallas Studio',
        city: 'Dallas',
        state: 'TX',
        region: 'Southwest',
      },
      {
        id: 'houston_tx',
        name: 'Houston Studio',
        city: 'Houston',
        state: 'TX',
        region: 'Southwest',
      },
      {
        id: 'denver_co',
        name: 'Denver Studio',
        city: 'Denver',
        state: 'CO',
        region: 'Southwest',
      },
      {
        id: 'phoenix_az',
        name: 'Phoenix Studio',
        city: 'Phoenix',
        state: 'AZ',
        region: 'Southwest',
      },
      {
        id: 'las_vegas_nv',
        name: 'Las Vegas Studio',
        city: 'Las Vegas',
        state: 'NV',
        region: 'Southwest',
      },
      {
        id: 'orange_county_ca',
        name: 'Orange County Studio',
        city: 'Orange County',
        state: 'CA',
        region: 'West Coast',
      },
      {
        id: 'san_diego_ca',
        name: 'San Diego Studio',
        city: 'San Diego',
        state: 'CA',
        region: 'West Coast',
      },
      {
        id: 'sacramento_ca',
        name: 'Sacramento Studio',
        city: 'Sacramento',
        state: 'CA',
        region: 'West Coast','],
      },
      {
        id: 'seattle_wa',
        name: 'Seattle Studio',
        city: 'Seattle',
        state: 'WA',
        region: 'West Coast',
      },
      {
        id: 'portland_or',
        name: 'Portland Studio',
        city: 'Portland',
        state: 'OR',
        region: 'West Coast',
      },
    ];
  }

  /**
   * Get active studios only
   * @returns {Array} Array of active studio objects
   */
  static getActiveCenters() {
    return this.getAllCenters().filter((center) => center.isActive);
  }

  /**
   * Get centers by region
   * @param {string} region - Region name
   * @returns {Array} Array of studio objects in the region
   */
  static getCentersByRegion(region) {
    return this.getAllCenters().filter((center) => center.region === region);
  }

  /**
   * Find studio by ID
   * @param {string} centerId - Studio ID
   * @returns {Object|null} Studio object or null
   */
  static getCenterById(centerId) {
    return (
      this.getAllCenters().find((center) => center.id === centerId) || null
    );
  }

  /**
   * Find studios that cover a specific town/city
   * @param {string} townName - Name of town/city
   * @returns {Array} Array of studios that cover this town
   */
  static getCentersForTown(townName) {
    const normalizedTown = townName.toLowerCase().trim();
    return this.getAllCenters().filter((center) =>
      center.coversTowns.some(
        (town) =>
          town.toLowerCase().includes(normalizedTown) ||
          normalizedTown.includes(town.toLowerCase())
      )
    );
  }

  /**
   * Get nearby centers based on a user's location
   * @param {string} homeCenterId - User's home center ID
   * @returns {Array} Array of nearby studio objects
   */
  static getNearbyCenters(homeCenterId) {
    const homeCenter = this.getCenterById(homeCenterId);
    if (!homeCenter) return [];

    // Return centers in the same region, excluding home center
    return this.getCentersByRegion(homeCenter.region).filter(
      (center) => center.id !== homeCenterId
    );
  }

  /**
   * Register user to a studio
   * @param {string} userId - User ID
   * @param {string} centerId - Studio ID
   * @param {string} oldCenterId - Old center ID (optional, for cleanup)
   */
  static async registerUserToCenter(userId, centerId, oldCenterId = null) {
    try {
      console.log('[CommunityCenter] Registering user to center:', {
        userId,
        centerId,
        oldCenterId,
      });

      const center = this.getCenterById(centerId);
      if (!center) {
        throw new Error(`Studio ${centerId} not found`);
      }

      // Add user to new studio
      await setDoc(doc(db, 'studios', centerId, 'members', userId), {
        joinedAt: new Date(),
        active: true,
        studioName: center.name,
        studioCity: center.city,
        studioState: center.state,
      });

      // Remove user from old studio if specified
      if (oldCenterId && oldCenterId !== centerId) {
        await deleteDoc(doc(db, 'studios', oldCenterId, 'members', userId));
        console.log(
          '[CommunityCenter] Removed user from old studio:',
          oldCenterId
        );
      }

      console.log('[CommunityCenter] User registration updated successfully');
    } catch (error) {
      console.error(
        '[CommunityCenter] Error registering user to center:',
        error
      );
      throw error;
    }
  }

  /**
   * Get suggestions for autocomplete based on user input
   * @param {string} searchText - Search text from user
   * @returns {Array} Array of suggestion objects
   */
  static getSuggestions(searchText) {
    if (!searchText || searchText.trim().length < 2) return [];

    const normalizedSearch = searchText.toLowerCase().trim();
    const suggestions = [];

    // Search through all centers and their covered towns
    this.getAllCenters().forEach((center) => {
      // Check center name
      if (
        center.name.toLowerCase().includes(normalizedSearch) ||
        center.city.toLowerCase().includes(normalizedSearch)
      ) {
        suggestions.push({
          displayName: `${center.city}, ${center.state}`,
          centerId: center.id,
          centerName: center.name,
          status: center.status,
          isActive: center.isActive,
        });
      }

      // Check covered towns
      center.coversTowns.forEach((town) => {
        if (town.toLowerCase().includes(normalizedSearch)) {
          suggestions.push({
            displayName: `${town}, ${center.state}`,
            centerId: center.id,
            centerName: center.name,
            status: center.status,
            isActive: center.isActive,
            note: town !== center.city ? `Covered by ${center.city}` : null,
          });
        }
      });
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.reduce((unique, item) => {
      if (
        !unique.find(
          (u) =>
            u.centerId === item.centerId && u.displayName === item.displayName
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
   * @returns {Object} Center selection object
   */
  static generateCenterFromText(locationText) {
    const suggestions = this.getSuggestions(locationText);

    if (suggestions.length > 0) {
      const bestMatch = suggestions[0];
      return {
        centerId: bestMatch.centerId,
        centerName: bestMatch.centerName,
        displayName: bestMatch.displayName,
        status: bestMatch.status,
        isActive: bestMatch.isActive,
      };
    }

    // Fallback for unknown locations - suggest closest or default
    return {
      centerId: 'unknown_location',
      centerName: 'Location Not Available',
      displayName: locationText || 'Unknown Location',
      status: 'unavailable',
      isActive: false,
    };
  }

  /**
   * Check if a center can host events (is active)
   * @param {string} centerId - Studio ID
   * @returns {boolean} Whether the center can host events
   */
  static canHostEvents(centerId) {
    const center = this.getCenterById(centerId);
    return center ? center.isActive : false;
  }
}
