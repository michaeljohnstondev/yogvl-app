// FILE: services/StudioRequestService.js

import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
// Location import moved to function level to avoid module loading issues

export class StudioRequestService {
  /**
   * Submit a new studio request
   * @param {string} cityName - Name of the city
   * @param {string} stateName - State/Province name
   * @param {string} country - Country name
   * @param {string} reason - Optional reason for request
   * @param {string} userId - User ID of requester
   * @returns {Promise<Object>} Result object
   */
  static async requestNewStudio(cityName, stateName, country = 'USA', reason = '', userId) {
    try {
      const normalizedCity = cityName.trim().toLowerCase();
      const normalizedState = stateName.trim().toUpperCase();
      
      console.log('[StudioRequestService] Requesting studio for:', {
        cityName,
        stateName,
        country,
        userId
      });

      // Check if this city already has an approved studio
      const existingStudio = await this.checkExistingStudio(cityName, stateName);
      if (existingStudio) {
        return {
          success: false,
          type: 'studio_exists',
          message: `A studio already exists for ${cityName}, ${stateName}`,
          existingStudio
        };
      }

      // Check if there's already a pending request for this city
      const existingRequest = await this.checkExistingRequest(cityName, stateName);
      if (existingRequest) {
        // Increment the request counter
        await this.incrementRequestCount(existingRequest.id);
        
        return {
          success: false,
          type: 'request_exists',
          message: `A request already exists for ${cityName}, ${stateName}. We've noted your interest!`,
          existingRequest: {
            ...existingRequest,
            requestCount: existingRequest.requestCount + 1
          }
        };
      }

      // Create unique request ID
      const requestId = `${normalizedCity}_${normalizedState}_${Date.now()}`.replace(/[^a-z0-9_]/g, '_');

      // Create new studio request
      const requestData = {
        id: requestId,
        cityName: cityName.trim(),
        stateName: stateName.trim(),
        country: country.trim(),
        normalizedCity,
        normalizedState,
        reason: reason.trim(),
        requestedBy: userId,
        requestedAt: serverTimestamp(),
        status: 'pending',
        requestCount: 1,
        adminNotes: '',
        processedBy: null,
        processedAt: null,
        mergedInto: null,
      };

      await setDoc(doc(db, 'admin/studioRequests/requests', requestId), requestData);

      console.log('[StudioRequestService] Studio request created successfully:', requestId);
      
      return {
        success: true,
        type: 'request_created',
        message: `Request submitted for ${cityName}, ${stateName}. You'll be notified when it's approved!`,
        requestId,
        requestData
      };

    } catch (error) {
      console.error('[StudioRequestService] Error requesting studio:', error);
      return {
        success: false,
        type: 'error',
        message: 'Failed to submit studio request. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Check if a studio already exists for this city
   * @param {string} cityName - City name
   * @param {string} stateName - State name
   * @returns {Promise<Object|null>} Existing studio or null
   */
  static async checkExistingStudio(cityName, stateName) {
    try {
      const normalizedCity = cityName.trim().toLowerCase();
      const normalizedState = stateName.trim().toLowerCase();

      const studiosRef = collection(db, 'studios');
      const q = query(
        studiosRef,
        where('status', '==', 'active'),
        limit(50) // Reasonable limit
      );

      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const studio = doc.data();
        if (studio.city?.toLowerCase() === normalizedCity && 
            studio.state?.toLowerCase() === normalizedState) {
          return { id: doc.id, ...studio };
        }
      }

      return null;
    } catch (error) {
      console.error('[StudioRequestService] Error checking existing studio:', error);
      return null;
    }
  }

  /**
   * Check if a request already exists for this city
   * @param {string} cityName - City name
   * @param {string} stateName - State name
   * @returns {Promise<Object|null>} Existing request or null
   */
  static async checkExistingRequest(cityName, stateName) {
    try {
      const normalizedCity = cityName.trim().toLowerCase();
      const normalizedState = stateName.trim().toUpperCase();

      const requestsRef = collection(db, 'admin/studioRequests/requests');
      const q = query(
        requestsRef,
        where('normalizedCity', '==', normalizedCity),
        where('normalizedState', '==', normalizedState),
        where('status', 'in', ['pending', 'approved']),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      return null;
    } catch (error) {
      console.error('[StudioRequestService] Error checking existing request:', error);
      return null;
    }
  }

  /**
   * Increment request count for existing request
   * @param {string} requestId - Request document ID
   */
  static async incrementRequestCount(requestId) {
    try {
      const requestRef = doc(db, 'admin/studioRequests/requests', requestId);
      await updateDoc(requestRef, {
        requestCount: increment(1),
        lastRequestedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[StudioRequestService] Error incrementing request count:', error);
    }
  }

  /**
   * Get all pending studio requests (for admin)
   * @returns {Promise<Array>} Array of pending requests
   */
  static async getPendingRequests() {
    try {
      const requestsRef = collection(db, 'admin/studioRequests/requests');
      const q = query(
        requestsRef,
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      const requests = [];

      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('[StudioRequestService] Retrieved', requests.length, 'pending requests');
      return requests;
    } catch (error) {
      console.error('[StudioRequestService] Error getting pending requests:', error);
      return [];
    }
  }

  /**
   * Get all studio requests with any status (for admin analytics)
   * @returns {Promise<Array>} Array of all requests
   */
  static async getAllRequests() {
    try {
      const requestsRef = collection(db, 'admin/studioRequests/requests');
      const q = query(
        requestsRef,
        orderBy('requestedAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const requests = [];

      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return requests;
    } catch (error) {
      console.error('[StudioRequestService] Error getting all requests:', error);
      return [];
    }
  }

  /**
   * Get coordinates for a city/state using geocoding
   * @param {string} city - City name
   * @param {string} state - State name
   * @param {string} country - Country name
   * @returns {Promise<Object|null>} Coordinates object or null
   */
  static async getCoordinatesForCity(city, state, country = 'USA') {
    console.log('[StudioRequestService] Starting getCoordinatesForCity');
    
    const query = `${city}, ${state}, ${country}`;
    console.log('[StudioRequestService] Geocoding address:', query);
    
    try {
      // Try to import expo-location the same way LocationScreen does
      const Location = require('expo-location');
      console.log('[StudioRequestService] Location imported successfully');
      
      // Request permissions
      console.log('[StudioRequestService] Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[StudioRequestService] Permission status:', status);
      
      if (status !== 'granted') {
        console.warn('[StudioRequestService] Location permission denied');
        return null;
      }
      
      // Try geocoding
      console.log('[StudioRequestService] Calling geocodeAsync...');
      const results = await Location.geocodeAsync(query);
      console.log('[StudioRequestService] Geocoding results:', results);
      
      if (results && results.length > 0) {
        const result = results[0];
        const coordinates = {
          lat: result.latitude,
          lng: result.longitude
        };
        console.log('[StudioRequestService] Geocoding successful:', coordinates);
        return coordinates;
      } else {
        console.log('[StudioRequestService] No geocoding results found');
        return null;
      }
      
    } catch (error) {
      console.error('[StudioRequestService] Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Approve a studio request (admin only)
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin user ID
   * @param {Object} customStudioData - Custom/edited studio data to override defaults
   * @returns {Promise<Object>} Result object
   */
  static async approveStudioRequest(requestId, adminId, customStudioData = {}) {
    try {
      console.log('[StudioRequestService] Approving studio request:', requestId);

      // Get the request data
      const requestDoc = await getDoc(doc(db, 'admin/studioRequests/requests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }

      const requestData = requestDoc.data();
      
      // Use custom data or fallback to request data
      const finalCityName = customStudioData.city || requestData.cityName;
      const finalStateName = customStudioData.state || requestData.stateName;
      const finalCountry = customStudioData.country || requestData.country;
      
      // Generate unique studio ID (use custom or normalized from final data)
      const studioId = customStudioData.id || `${finalCityName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${finalStateName.toUpperCase()}`;
      
      // Get coordinates for the city (use custom coordinates or geocode)
      let coordinates = customStudioData.coordinates;
      if (!coordinates) {
        coordinates = await this.getCoordinatesForCity(finalCityName, finalStateName, finalCountry);
      }

      // Create the studio in the studios collection
      const newStudio = {
        id: studioId,
        name: customStudioData.name || `${finalCityName} Studio`,
        city: finalCityName,
        state: finalStateName,
        country: finalCountry,
        region: customStudioData.region || this.getRegionFromState(finalStateName),
        status: customStudioData.status || 'active',
        isActive: customStudioData.isActive !== undefined ? customStudioData.isActive : true,
        createdAt: serverTimestamp(),
        // Add coordinates if available
        ...(coordinates && { coordinates }),
        // Merge any other custom studio data
        ...Object.fromEntries(
          Object.entries(customStudioData).filter(([key]) => 
            !['id', 'name', 'city', 'state', 'country', 'region', 'status', 'isActive', 'coordinates'].includes(key)
          )
        ),
      };

      await setDoc(doc(db, 'studios', studioId), newStudio);

      // Update the request status to approved
      await updateDoc(doc(db, 'admin/studioRequests/requests', requestId), {
        status: 'approved',
        processedBy: adminId,
        processedAt: serverTimestamp(),
        createdStudioId: studioId,
      });

      console.log('[StudioRequestService] Studio approved and created:', studioId);

      return {
        success: true,
        studioId,
        studio: newStudio,
        message: `Studio created for ${requestData.cityName}, ${requestData.stateName}`
      };

    } catch (error) {
      console.error('[StudioRequestService] Error approving studio request:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to approve studio request'
      };
    }
  }

  /**
   * Reject a studio request (admin only)
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Reason for rejection
   * @returns {Promise<Object>} Result object
   */
  static async rejectStudioRequest(requestId, adminId, reason = '') {
    try {
      console.log('[StudioRequestService] Rejecting studio request:', requestId);

      await updateDoc(doc(db, 'admin/studioRequests/requests', requestId), {
        status: 'rejected',
        processedBy: adminId,
        processedAt: serverTimestamp(),
        adminNotes: reason,
      });

      return {
        success: true,
        message: 'Studio request rejected'
      };

    } catch (error) {
      console.error('[StudioRequestService] Error rejecting studio request:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to reject studio request'
      };
    }
  }

  /**
   * Get region from state (helper function)
   * @param {string} state - State abbreviation
   * @returns {string} Region name
   */
  static getRegionFromState(state) {
    const stateToRegion = {
      // Northeast
      'MA': 'Northeast', 'ME': 'Northeast', 'NH': 'Northeast', 'VT': 'Northeast',
      'RI': 'Northeast', 'CT': 'Northeast', 'NY': 'Northeast', 'NJ': 'Northeast',
      'PA': 'Northeast',
      
      // Southeast
      'FL': 'Southeast', 'GA': 'Southeast', 'SC': 'Southeast', 'NC': 'Southeast',
      'VA': 'Southeast', 'WV': 'Southeast', 'KY': 'Southeast', 'TN': 'Southeast',
      'AL': 'Southeast', 'MS': 'Southeast', 'AR': 'Southeast', 'LA': 'Southeast',
      'DC': 'Southeast', 'MD': 'Southeast', 'DE': 'Southeast',
      
      // Midwest
      'OH': 'Midwest', 'MI': 'Midwest', 'IN': 'Midwest', 'IL': 'Midwest',
      'WI': 'Midwest', 'MN': 'Midwest', 'IA': 'Midwest', 'MO': 'Midwest',
      'ND': 'Midwest', 'SD': 'Midwest', 'NE': 'Midwest', 'KS': 'Midwest',
      
      // Southwest
      'TX': 'Southwest', 'OK': 'Southwest', 'NM': 'Southwest', 'AZ': 'Southwest',
      'NV': 'Southwest', 'UT': 'Southwest', 'CO': 'Southwest',
      
      // West Coast
      'CA': 'West Coast', 'OR': 'West Coast', 'WA': 'West Coast',
      'AK': 'West Coast', 'HI': 'West Coast',
      
      // Mountain West
      'ID': 'Mountain West', 'MT': 'Mountain West', 'WY': 'Mountain West',
    };

    return stateToRegion[state.toUpperCase()] || 'Other';
  }

  /**
   * Update an existing studio (admin only)
   * @param {string} studioId - Studio ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Result object
   */
  static async updateStudio(studioId, updateData) {
    try {
      console.log('[StudioRequestService] Updating studio:', studioId);

      // Get current studio data
      const studioDoc = await getDoc(doc(db, 'studios', studioId));
      if (!studioDoc.exists()) {
        throw new Error('Studio not found');
      }

      const currentData = studioDoc.data();
      
      // If coordinates are being updated manually, don't geocode
      let coordinates = updateData.coordinates || currentData.coordinates;
      
      // If location changed but no manual coordinates provided, geocode
      if ((updateData.city || updateData.state || updateData.country) && !updateData.coordinates) {
        const city = updateData.city || currentData.city;
        const state = updateData.state || currentData.state;
        const country = updateData.country || currentData.country;
        
        const geoCoordinates = await this.getCoordinatesForCity(city, state, country);
        if (geoCoordinates) {
          coordinates = geoCoordinates;
        }
      }

      // Prepare update data
      const finalUpdateData = {
        ...updateData,
        ...(coordinates && { coordinates }),
        updatedAt: serverTimestamp(),
      };

      // Update the studio
      await updateDoc(doc(db, 'studios', studioId), finalUpdateData);

      console.log('[StudioRequestService] Studio updated successfully:', studioId);

      return {
        success: true,
        studioId,
        message: 'Studio updated successfully'
      };

    } catch (error) {
      console.error('[StudioRequestService] Error updating studio:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update studio'
      };
    }
  }

  /**
   * Get studio data for editing (admin only)
   * @param {string} studioId - Studio ID
   * @returns {Promise<Object>} Studio data or null
   */
  static async getStudioForEdit(studioId) {
    try {
      const studioDoc = await getDoc(doc(db, 'studios', studioId));
      if (!studioDoc.exists()) {
        return null;
      }
      
      return {
        id: studioDoc.id,
        ...studioDoc.data()
      };
    } catch (error) {
      console.error('[StudioRequestService] Error getting studio for edit:', error);
      return null;
    }
  }

  /**
   * Toggle studio active status (admin only)
   * @param {string} studioId - Studio ID
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Result object
   */
  static async toggleStudioStatus(studioId, isActive) {
    try {
      await updateDoc(doc(db, 'studios', studioId), {
        isActive,
        status: isActive ? 'active' : 'inactive',
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        message: `Studio ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('[StudioRequestService] Error toggling studio status:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update studio status'
      };
    }
  }
}