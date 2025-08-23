import { doc, setDoc, deleteDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export class StudioService {
  
  /**
   * Get all available studios
   * @returns {Array} Array of studio objects
   */
  static getAllStudios() {
    return [
      // South Carolina Studios
      {
        id: 'greenville_sc',
        name: 'Greenville Studio',
        city: 'Greenville',
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 34.8526, lng: -82.3940 },
      },
      {
        id: 'simpsonville_sc', 
        name: 'Simpsonville Studio',
        city: 'Simpsonville',
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 34.7370, lng: -82.2543 },
      },
      {
        id: 'charleston_sc',
        name: 'Charleston Studio',
        city: 'Charleston',
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 32.7765, lng: -79.9311 },
      },
      {
        id: 'columbia_sc',
        name: 'Columbia Studio', 
        city: 'Columbia',
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 34.0007, lng: -81.0348 },
      },
      {
        id: 'clemson_sc',
        name: 'Clemson Studio',
        city: 'Clemson', 
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 34.6834, lng: -82.8374 },
      },
      {
        id: 'myrtle_beach_sc',
        name: 'Myrtle Beach Studio',
        city: 'Myrtle Beach',
        state: 'SC',
        region: 'Southeast',
        coordinates: { lat: 33.6891, lng: -78.8867 },
      },
      
      // North Carolina Centers
      {
        id: 'charlotte_nc',
        name: 'Charlotte Studio',
        city: 'Charlotte',
        state: 'NC', 
        region: 'Southeast',
        isActive: false,
        status: 'coming_soon',
        description: 'Coming soon to the Queen City',
        coversTowns: ['Charlotte', 'Concord', 'Gastonia', 'Rock Hill'],
        coordinates: { lat: 35.2271, lng: -80.8431 },
      },
      {
        id: 'asheville_nc',
        name: 'Asheville Studio',
        city: 'Asheville',
        state: 'NC',
        region: 'Southeast', 
        isActive: false,
        status: 'coming_soon',
        description: 'Coming soon to the mountains',
        coversTowns: ['Asheville', 'Black Mountain', 'Hendersonville'],
        coordinates: { lat: 35.5951, lng: -82.5515 },
      },
      
      // Georgia Centers  
      {
        id: 'atlanta_ga',
        name: 'Atlanta Studio',
        city: 'Atlanta',
        state: 'GA',
        region: 'Southeast',
        isActive: false,
        status: 'coming_soon', 
        description: 'Coming soon to the Big Peach',
        coversTowns: ['Atlanta', 'Decatur', 'Alpharetta', 'Sandy Springs'],
        coordinates: { lat: 33.7490, lng: -84.3880 },
      },
      
      // Major US Cities (Future)
      {
        id: 'manhattan_ny',
        name: 'Manhattan Studio',
        city: 'Manhattan',
        state: 'NY',
        region: 'Northeast',
        isActive: false,
        status: 'waitlist',
        description: 'Join the waitlist for NYC events',
        coversTowns: ['Manhattan', 'Lower Manhattan', 'Midtown', 'Upper East Side'],
      },
      {
        id: 'brooklyn_ny',
        name: 'Brooklyn Studio',
        city: 'Brooklyn', 
        state: 'NY',
        region: 'Northeast',
        isActive: false,
        status: 'waitlist',
        description: 'Join the waitlist for Brooklyn events',
        coversTowns: ['Brooklyn', 'Park Slope', 'Williamsburg', 'DUMBO'],
      },
      {
        id: 'san_francisco_ca',
        name: 'San Francisco Studio',
        city: 'San Francisco',
        state: 'CA',
        region: 'West Coast', 
        isActive: false,
        status: 'waitlist',
        description: 'Join the waitlist for SF events',
        coversTowns: ['San Francisco', 'SOMA', 'Mission', 'Castro'],
      },
      {
        id: 'los_angeles_ca',
        name: 'Los Angeles Studio',
        city: 'Los Angeles',
        state: 'CA',
        region: 'West Coast',
        isActive: false,
        status: 'waitlist', 
        description: 'Join the waitlist for LA events',
        coversTowns: ['Los Angeles', 'Hollywood', 'West Hollywood', 'Santa Monica'],
      },
      {
        id: 'chicago_il',
        name: 'Chicago Studio',
        city: 'Chicago',
        state: 'IL',
        region: 'Midwest',
        isActive: false,
        status: 'waitlist',
        description: 'Join the waitlist for Chicago events', 
        coversTowns: ['Chicago', 'Lincoln Park', 'Wicker Park', 'River North'],
      },
      {
        id: 'austin_tx',
        name: 'Austin Studio',
        city: 'Austin',
        state: 'TX',
        region: 'Southwest',
        isActive: false,
        status: 'waitlist',
        description: 'Join the waitlist for Austin events',
        coversTowns: ['Austin', 'South Austin', 'East Austin', 'Cedar Park'],
      },
      
      // Additional Major Cities
      {
        id: 'boston_ma',
        name: 'Boston Studio',
        city: 'Boston',
        state: 'MA',
        region: 'Northeast',
        isActive: true,
        status: 'active',
        coversTowns: ['Boston', 'Cambridge', 'Somerville', 'Back Bay'],
        coordinates: { lat: 42.3601, lng: -71.0589 },
      },
      {
        id: 'philadelphia_pa',
        name: 'Philadelphia Studio',
        city: 'Philadelphia',
        state: 'PA',
        region: 'Northeast',
        isActive: true,
        status: 'active',
        coversTowns: ['Philadelphia', 'Center City', 'Northern Liberties', 'Fishtown'],
      },
      {
        id: 'washington_dc',
        name: 'Washington DC Studio',
        city: 'Washington',
        state: 'DC',
        region: 'Northeast',
        isActive: true,
        status: 'active',
        coversTowns: ['Washington', 'Georgetown', 'Adams Morgan', 'Capitol Hill'],
      },
      {
        id: 'raleigh_nc',
        name: 'Raleigh Studio',
        city: 'Raleigh',
        state: 'NC',
        region: 'Southeast',
        isActive: true,
        status: 'active',
        coversTowns: ['Raleigh', 'Durham', 'Chapel Hill', 'Cary'],
      },
      {
        id: 'miami_fl',
        name: 'Miami Studio',
        city: 'Miami',
        state: 'FL',
        region: 'Southeast',
        isActive: true,
        status: 'active',
        coversTowns: ['Miami', 'Miami Beach', 'Coral Gables', 'Wynwood'],
        coordinates: { lat: 25.7617, lng: -80.1918 },
      },
      {
        id: 'detroit_mi',
        name: 'Detroit Studio',
        city: 'Detroit',
        state: 'MI',
        region: 'Midwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Detroit', 'Royal Oak', 'Ferndale', 'Midtown'],
      },
      {
        id: 'minneapolis_mn',
        name: 'Minneapolis Studio',
        city: 'Minneapolis',
        state: 'MN',
        region: 'Midwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Minneapolis', 'St. Paul', 'Uptown', 'Northeast'],
      },
      {
        id: 'dallas_tx',
        name: 'Dallas Studio',
        city: 'Dallas',
        state: 'TX',
        region: 'Southwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Dallas', 'Plano', 'Deep Ellum', 'Uptown'],
      },
      {
        id: 'houston_tx',
        name: 'Houston Studio',
        city: 'Houston',
        state: 'TX',
        region: 'Southwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Houston', 'The Woodlands', 'Sugar Land', 'Heights'],
      },
      {
        id: 'denver_co',
        name: 'Denver Studio',
        city: 'Denver',
        state: 'CO',
        region: 'Southwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Denver', 'Boulder', 'Lakewood', 'Capitol Hill'],
      },
      {
        id: 'phoenix_az',
        name: 'Phoenix Studio',
        city: 'Phoenix',
        state: 'AZ',
        region: 'Southwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa'],
      },
      {
        id: 'las_vegas_nv',
        name: 'Las Vegas Studio',
        city: 'Las Vegas',
        state: 'NV',
        region: 'Southwest',
        isActive: true,
        status: 'active',
        coversTowns: ['Las Vegas', 'Henderson', 'Summerlin', 'The Strip'],
      },
      {
        id: 'orange_county_ca',
        name: 'Orange County Studio',
        city: 'Orange County',
        state: 'CA',
        region: 'West Coast',
        isActive: true,
        status: 'active',
        coversTowns: ['Irvine', 'Newport Beach', 'Anaheim', 'Huntington Beach'],
      },
      {
        id: 'san_diego_ca',
        name: 'San Diego Studio',
        city: 'San Diego',
        state: 'CA',
        region: 'West Coast',
        isActive: true,
        status: 'active',
        coversTowns: ['San Diego', 'La Jolla', 'Pacific Beach', 'Gaslamp'],
      },
      {
        id: 'sacramento_ca',
        name: 'Sacramento Studio',
        city: 'Sacramento',
        state: 'CA',
        region: 'West Coast',
        isActive: true,
        status: 'active',
        coversTowns: ['Sacramento', 'Davis', 'Folsom', 'Midtown'],
      },
      {
        id: 'seattle_wa',
        name: 'Seattle Studio',
        city: 'Seattle',
        state: 'WA',
        region: 'West Coast',
        isActive: true,
        status: 'active',
        coversTowns: ['Seattle', 'Bellevue', 'Capitol Hill', 'Fremont'],
      },
      {
        id: 'portland_or',
        name: 'Portland Studio',
        city: 'Portland',
        state: 'OR',
        region: 'West Coast',
        isActive: true,
        status: 'active',
        coversTowns: ['Portland', 'Pearl District', 'Hawthorne', 'Alberta'],
      },
    ];
  }

  /**
   * Get active studios only
   * @returns {Array} Array of active studio objects
   */
  static getActiveStudios() {
    // All studios are active now
    return this.getAllStudios();
  }

  /**
   * Get centers by region
   * @param {string} region - Region name
   * @returns {Array} Array of studio objects in the region
   */
  static getStudiosByRegion(region) {
    return this.getAllStudios().filter(studio => studio.region === region);
  }

  /**
   * Find studio by ID
   * @param {string} centerId - Studio ID
   * @returns {Object|null} Studio object or null
   */
  static getStudioById(studioId) {
    return this.getAllStudios().find(studio => studio.id === studioId) || null;
  }

  /**
   * Find studios by city name match
   * @param {string} cityName - Name of city
   * @returns {Array} Array of studios that match this city
   */
  static getStudiosForTown(cityName) {
    const normalizedCity = cityName.toLowerCase().trim();
    return this.getAllStudios().filter(studio => 
      studio.city.toLowerCase().includes(normalizedCity) || 
      normalizedCity.includes(studio.city.toLowerCase())
    );
  }

  /**
   * Get nearby centers based on a user's location
   * @param {string} homeCenterId - User's home center ID
   * @returns {Array} Array of nearby studio objects
   */
  static getNearbyStudios(homeStudioId) {
    const homeStudio = this.getStudioById(homeStudioId);
    if (!homeStudio) return [];

    // Return studios in the same region, excluding home studio
    return this.getStudiosByRegion(homeStudio.region).filter(
      studio => studio.id !== homeStudioId
    );
  }

  /**
   * Update user's studio information in their profile
   * @param {string} userId - User ID
   * @param {string} studioId - Studio ID
   */
  static async updateUserStudio(userId, studioId) {
    try {
      console.log('[StudioService] Updating user studio:', { userId, studioId });

      const studio = this.getStudioById(studioId);
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
              additional: [] // Array for future multiple studio support
            }
          }
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
   * @returns {Array} Array of suggestion objects
   */
  static getSuggestions(searchText) {
    if (!searchText || searchText.trim().length < 2) return [];
    
    const normalizedSearch = searchText.toLowerCase().trim();
    const suggestions = [];

    // Search through all studios
    this.getAllStudios().forEach(studio => {
      // Check studio name and city
      if (studio.name.toLowerCase().includes(normalizedSearch) ||
          studio.city.toLowerCase().includes(normalizedSearch)) {
        suggestions.push({
          displayName: `${studio.city}, ${studio.state}`,
          studioId: studio.id,
          studioName: studio.name,
          isActive: true, // All studios are active
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions.reduce((unique, item) => {
      if (!unique.find(u => u.studioId === item.studioId && u.displayName === item.displayName)) {
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
  static generateStudioFromText(locationText) {
    const suggestions = this.getSuggestions(locationText);
    
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
   * @param {string} centerId - Studio ID
   * @returns {boolean} Whether the center can host events
   */
  static canHostEvents(studioId) {
    const studio = this.getStudioById(studioId);
    return studio ? true : false; // All studios can host events
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
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get closest studios to user's location
   * @param {number} userLat - User's latitude
   * @param {number} userLng - User's longitude
   * @param {number} limit - Number of studios to return (default 5)
   * @returns {Array} Array of closest studios with distance
   */
  static getClosestStudios(userLat, userLng, limit = 5) {
    const studiosWithDistance = this.getAllStudios()
      .filter(studio => studio.coordinates) // Only studios with coordinates
      .map(studio => ({
        ...studio,
        distance: this.calculateDistance(
          userLat, 
          userLng, 
          studio.coordinates.lat, 
          studio.coordinates.lng
        )
      }))
      .sort((a, b) => a.distance - b.distance) // Sort by distance
      .slice(0, limit); // Limit results

    return studiosWithDistance;
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

}