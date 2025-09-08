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

      await setDoc(doc(db, 'studioRequests', requestId), requestData);

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

      const requestsRef = collection(db, 'studioRequests');
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
      const requestRef = doc(db, 'studioRequests', requestId);
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
      const requestsRef = collection(db, 'studioRequests');
      const q = query(
        requestsRef,
        where('status', '==', 'pending'),
        orderBy('requestCount', 'desc'), // Most requested first
        orderBy('requestedAt', 'desc')
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
      const requestsRef = collection(db, 'studioRequests');
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
   * Approve a studio request (admin only)
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin user ID
   * @param {Object} studioData - Additional studio data
   * @returns {Promise<Object>} Result object
   */
  static async approveStudioRequest(requestId, adminId, studioData = {}) {
    try {
      console.log('[StudioRequestService] Approving studio request:', requestId);

      // Get the request data
      const requestDoc = await getDoc(doc(db, 'studioRequests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }

      const requestData = requestDoc.data();
      
      // Generate unique studio ID
      const studioId = `${requestData.normalizedCity}_${requestData.normalizedState}`;
      
      // Create the studio in the studios collection
      const newStudio = {
        id: studioId,
        name: `${requestData.cityName} Studio`,
        city: requestData.cityName,
        state: requestData.stateName,
        country: requestData.country,
        region: this.getRegionFromState(requestData.stateName),
        status: 'active',
        isActive: true,
        createdBy: adminId,
        createdAt: serverTimestamp(),
        approvedBy: adminId,
        approvedAt: serverTimestamp(),
        requestCount: requestData.requestCount,
        originalRequestId: requestId,
        // Merge any additional studio data
        ...studioData,
      };

      await setDoc(doc(db, 'studios', studioId), newStudio);

      // Update the request status
      await updateDoc(doc(db, 'studioRequests', requestId), {
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

      await updateDoc(doc(db, 'studioRequests', requestId), {
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
}