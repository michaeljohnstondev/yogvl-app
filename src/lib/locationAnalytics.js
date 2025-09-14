// FILE: lib/locationAnalytics.js - Analytics and usage tracking for location services

import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYTICS_KEY = 'location_analytics';
const USAGE_KEY = 'location_usage';

/**
 * Analytics and usage tracking for location services
 */
export class LocationAnalytics {
  /**
   * Track location service usage
   * @param {string} service - Service name (google_places, firebase_venues, local_db)
   * @param {string} action - Action type (search, select, error)
   * @param {Object} data - Additional data
   */
  static async trackUsage(service, action, data = {}) {
    try {
      const timestamp = Date.now();
      const usageData = {
        timestamp,
        service,
        action,
        ...data,
      };

      // Get existing usage data
      const existingUsage = await AsyncStorage.getItem(USAGE_KEY);
      const usageArray = existingUsage ? JSON.parse(existingUsage) : [];

      // Add new usage
      usageArray.push(usageData);

      // Keep only last 1000 entries to avoid storage bloat
      const recentUsage = usageArray.slice(-1000);

      // Save back to storage
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(recentUsage));

      console.log(`[LocationAnalytics] Tracked: ${service}.${action}`, data);
    } catch (error) {
      console.warn('[LocationAnalytics] Failed to track usage:', error);
    }
  }

  /**
   * Track Google Places API quota usage
   * @param {string} apiType - API type (autocomplete, details, nearby)
   * @param {boolean} success - Whether the request was successful
   * @param {number} responseTime - Response time in milliseconds
   */
  static async trackGooglePlacesUsage(apiType, success, responseTime) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const analyticsData = await this.getAnalyticsData();

      if (!analyticsData.googlePlaces) {
        analyticsData.googlePlaces = {};
      }

      if (!analyticsData.googlePlaces[today]) {
        analyticsData.googlePlaces[today] = {
          autocomplete: { requests: 0, successes: 0, totalResponseTime: 0 },
          details: { requests: 0, successes: 0, totalResponseTime: 0 },
          nearby: { requests: 0, successes: 0, totalResponseTime: 0 },
        };
      }

      const dayData = analyticsData.googlePlaces[today];
      if (!dayData[apiType]) {
        dayData[apiType] = { requests: 0, successes: 0, totalResponseTime: 0 };
      }

      // Update usage
      dayData[apiType].requests += 1;
      if (success) {
        dayData[apiType].successes += 1;
      }
      dayData[apiType].totalResponseTime += responseTime;

      await this.saveAnalyticsData(analyticsData);

      // Check for quota warnings
      const totalRequests = this.getTotalDailyRequests(
        analyticsData.googlePlaces[today]
      );
      if (totalRequests > 800) {
        // Warning at 80% of 1000 daily limit
        console.warn(
          `[LocationAnalytics] Approaching daily API limit: ${totalRequests}/1000 requests`
        );
      }
    } catch (error) {
      console.warn(
        '[LocationAnalytics] Failed to track Google Places usage:',
        error
      );
    }
  }

  /**
   * Get analytics data from storage
   * @returns {Promise<Object>} Analytics data
   */
  static async getAnalyticsData() {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('[LocationAnalytics] Failed to get analytics data:', error);
      return {};
    }
  }

  /**
   * Save analytics data to storage
   * @param {Object} data - Analytics data to save
   */
  static async saveAnalyticsData(data) {
    try {
      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[LocationAnalytics] Failed to save analytics data:', error);
    }
  }

  /**
   * Get total daily requests for Google Places
   * @param {Object} dayData - Day data object
   * @returns {number} Total requests
   */
  static getTotalDailyRequests(dayData) {
    if (!dayData) return 0;

    return (
      (dayData.autocomplete?.requests || 0) +
      (dayData.details?.requests || 0) +
      (dayData.nearby?.requests || 0)
    );
  }

  /**
   * Get usage statistics
   * @param {number} days - Number of days to analyze (default: 7)
   * @returns {Promise<Object>} Usage statistics
   */
  static async getUsageStats(days = 7) {
    try {
      const usageData = await AsyncStorage.getItem(USAGE_KEY);
      const analyticsData = await this.getAnalyticsData();

      if (!usageData) {
        return { totalUsage: 0, serviceBreakdown: {}, recentUsage: [] };
      }

      const usage = JSON.parse(usageData);
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      const recentUsage = usage.filter((item) => item.timestamp > cutoffTime);

      // Service breakdown
      const serviceBreakdown = {};
      recentUsage.forEach((item) => {
        if (!serviceBreakdown[item.service]) {
          serviceBreakdown[item.service] = { total: 0, actions: {} };
        }
        serviceBreakdown[item.service].total += 1;

        if (!serviceBreakdown[item.service].actions[item.action]) {
          serviceBreakdown[item.service].actions[item.action] = 0;
        }
        serviceBreakdown[item.service].actions[item.action] += 1;
      });

      // Google Places quota info
      const googlePlacesQuota = this.getGooglePlacesQuotaInfo(analyticsData);

      return {
        totalUsage: recentUsage.length,
        serviceBreakdown,
        recentUsage: recentUsage.slice(-50), // Last 50 entries
        googlePlacesQuota,
        period: `${days} days`,
      };
    } catch (error) {
      console.warn('[LocationAnalytics] Failed to get usage stats:', error);
      return { totalUsage: 0, serviceBreakdown: {}, recentUsage: [] };
    }
  }

  /**
   * Get Google Places quota information
   * @param {Object} analyticsData - Analytics data
   * @returns {Object} Quota information
   */
  static getGooglePlacesQuotaInfo(analyticsData) {
    if (!analyticsData.googlePlaces) {
      return { dailyRequests: 0, monthlyRequests: 0, quotaWarning: false };
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyRequests = this.getTotalDailyRequests(
      analyticsData.googlePlaces[today]
    );

    // Calculate monthly requests (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let monthlyRequests = 0;
    Object.keys(analyticsData.googlePlaces).forEach((date) => {
      if (new Date(date) >= thirtyDaysAgo) {
        monthlyRequests += this.getTotalDailyRequests(
          analyticsData.googlePlaces[date]
        );
      }
    });

    return {
      dailyRequests,
      monthlyRequests,
      quotaWarning: dailyRequests > 800 || monthlyRequests > 20000,
      dailyLimit: 1000,
      monthlyLimit: 25000,
    };
  }

  /**
   * Clear old analytics data to save storage
   * @param {number} daysToKeep - Number of days to keep (default: 30)
   */
  static async cleanupAnalytics(daysToKeep = 30) {
    try {
      const analyticsData = await this.getAnalyticsData();

      if (analyticsData.googlePlaces) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateString = cutoffDate.toISOString().split('T')[0];

        // Remove old Google Places data
        Object.keys(analyticsData.googlePlaces).forEach((date) => {
          if (date < cutoffDateString) {
            delete analyticsData.googlePlaces[date];
          }
        });

        await this.saveAnalyticsData(analyticsData);
      }

      // Clean up usage data
      const usageData = await AsyncStorage.getItem(USAGE_KEY);
      if (usageData) {
        const usage = JSON.parse(usageData);
        const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
        const recentUsage = usage.filter((item) => item.timestamp > cutoffTime);

        await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(recentUsage));
      }

      console.log(
        `[LocationAnalytics] Cleaned up analytics data older than ${daysToKeep} days`
      );
    } catch (error) {
      console.warn('[LocationAnalytics] Failed to cleanup analytics:', error);
    }
  }

  /**
   * Get performance metrics
   * @returns {Promise<Object>} Performance data
   */
  static async getPerformanceMetrics() {
    try {
      const analyticsData = await this.getAnalyticsData();
      const stats = await this.getUsageStats(7);

      return {
        googlePlacesQuota: stats.googlePlacesQuota,
        serviceReliability: this.calculateServiceReliability(
          stats.serviceBreakdown
        ),
        averageResponseTimes: this.calculateAverageResponseTimes(analyticsData),
        cacheHitRate: this.calculateCacheHitRate(stats.recentUsage),
        totalApiCalls: stats.totalUsage,
      };
    } catch (error) {
      console.warn(
        '[LocationAnalytics] Failed to get performance metrics:',
        error
      );
      return {};
    }
  }

  /**
   * Calculate service reliability (success rate)
   * @param {Object} serviceBreakdown - Service breakdown data
   * @returns {Object} Reliability percentages by service
   */
  static calculateServiceReliability(serviceBreakdown) {
    const reliability = {};

    Object.keys(serviceBreakdown).forEach((service) => {
      const actions = serviceBreakdown[service].actions;
      const successes = (actions.select || 0) + (actions.search || 0);
      const errors = actions.error || 0;
      const total = successes + errors;

      reliability[service] =
        total > 0 ? Math.round((successes / total) * 100) : 100;
    });

    return reliability;
  }

  /**
   * Calculate average response times
   * @param {Object} analyticsData - Analytics data
   * @returns {Object} Average response times by API type
   */
  static calculateAverageResponseTimes(analyticsData) {
    const responseTimes = {};

    if (analyticsData.googlePlaces) {
      ['autocomplete', 'details', 'nearby'].forEach((apiType) => {
        let totalTime = 0;
        let totalRequests = 0;

        Object.values(analyticsData.googlePlaces).forEach((dayData) => {
          if (dayData[apiType]) {
            totalTime += dayData[apiType].totalResponseTime;
            totalRequests += dayData[apiType].requests;
          }
        });

        responseTimes[`google_places_${apiType}`] =
          totalRequests > 0 ? Math.round(totalTime / totalRequests) : 0;
      });
    }

    return responseTimes;
  }

  /**
   * Calculate cache hit rate
   * @param {Array} recentUsage - Recent usage data
   * @returns {number} Cache hit rate percentage
   */
  static calculateCacheHitRate(recentUsage) {
    const cacheEvents = recentUsage.filter(
      (item) => item.action === 'cache_hit' || item.action === 'cache_miss'
    );

    if (cacheEvents.length === 0) return 0;

    const hits = cacheEvents.filter(
      (item) => item.action === 'cache_hit'
    ).length;
    return Math.round((hits / cacheEvents.length) * 100);
  }
}
