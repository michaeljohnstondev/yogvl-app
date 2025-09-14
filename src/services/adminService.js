// FILE: services/adminService.js - Admin Management Service

import { StudioService } from './StudioService';
import { getStudioReports, updateReportStatus } from './reportingService';

/**
 * Check if user is a global admin (can see all studios)
 * @param {Object} userData - User's data object
 * @returns {boolean} True if user is a global admin
 */
export const isGlobalAdmin = (userData) => {
  return userData?.isGlobalAdmin === true;
};

/**
 * Check if user is a studio admin (can see their studio)
 * @param {Object} userData - User's data object
 * @param {string} studioId - Studio ID to check
 * @returns {boolean} True if user is an admin of the specific studio
 */
export const isStudioAdmin = (userData, studioId) => {
  // For now, we'll just check the global admin flag
  // This can be expanded later to support per-studio admins
  return userData?.isAdmin === true || userData?.isGlobalAdmin === true;
};

/**
 * Check if user has any admin privileges
 * @param {Object} userData - User's data object
 * @returns {boolean} True if user has any admin access
 */
export const hasAdminAccess = (userData) => {
  return userData?.isAdmin === true || userData?.isGlobalAdmin === true;
};

/**
 * Get all reports across all studios for global admin
 * @param {number} limit - Maximum number of reports to fetch per studio
 * @returns {Array} Array of reports with studio information
 */
export const getAllReportsForGlobalAdmin = async (limit = 50) => {
  try {
    const studios = await StudioService.getAllStudios();
    const allReports = [];

    console.log(
      `[adminService] Fetching reports from ${studios.length} studios`
    );

    // Fetch reports from each studio
    for (const studio of studios) {
      try {
        console.log(
          `[adminService] Checking studio: ${studio.name} (${studio.id})`
        );
        const reports = await getStudioReports(studio.id, limit);

        // Add studio information to each report
        const reportsWithStudio = reports.map((report) => ({
          ...report,
          studioName: studio.name,
          studioCity: studio.city,
          studioState: studio.state,
          studioDisplayName: `${studio.city}, ${studio.state}`,
        }));

        allReports.push(...reportsWithStudio);
        console.log(
          `[adminService] Found ${reports.length} reports in ${studio.name}`
        );

        if (reports.length > 0) {
          console.log(
            `[adminService] Sample report from ${studio.name}:`,
            reports[0]
          );
        }
      } catch (error) {
        console.warn(
          `[adminService] Error fetching reports from ${studio.name}:`,
          error
        );
        // Continue with other studios even if one fails
      }
    }

    // Sort by report date (newest first)
    allReports.sort((a, b) => {
      const aTime = a.reportedAt?.seconds || 0;
      const bTime = b.reportedAt?.seconds || 0;
      return bTime - aTime;
    });

    console.log(`[adminService] Total reports found: ${allReports.length}`);
    return allReports;
  } catch (error) {
    console.error(
      '[adminService] Error getting all reports for global admin:',
      error
    );
    throw error;
  }
};

/**
 * Get reports for a specific studio
 * @param {string} studioId - Studio ID
 * @param {number} limit - Maximum number of reports to fetch
 * @returns {Array} Array of reports with studio information
 */
export const getStudioReportsWithInfo = async (studioId, limit = 50) => {
  try {
    const studio = StudioService.getStudioById(studioId);
    if (!studio) {
      throw new Error(`Studio not found: ${studioId}`);
    }

    const reports = await getStudioReports(studioId, limit);

    // Add studio information to each report
    return reports.map((report) => ({
      ...report,
      studioName: studio.name,
      studioCity: studio.city,
      studioState: studio.state,
      studioDisplayName: `${studio.city}, ${studio.state}`,
    }));
  } catch (error) {
    console.error(
      `[adminService] Error getting reports for studio ${studioId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get report statistics by studio
 * @param {Array} reports - Array of reports
 * @returns {Object} Statistics by studio
 */
export const getReportStatsByStudio = (reports) => {
  const statsByStudio = {};

  reports.forEach((report) => {
    const studioKey = report.studioId || 'unknown';
    const studioName = report.studioName || 'Unknown Studio';

    if (!statsByStudio[studioKey]) {
      statsByStudio[studioKey] = {
        studioId: studioKey,
        studioName: studioName,
        studioDisplayName: report.studioDisplayName || studioName,
        total: 0,
        pending: 0,
        reviewed: 0,
        resolved: 0,
        dismissed: 0,
        userReports: 0,
        eventReports: 0,
      };
    }

    const stats = statsByStudio[studioKey];
    stats.total++;
    stats[report.status] = (stats[report.status] || 0) + 1;

    if (report.type === 'user') {
      stats.userReports++;
    } else if (report.type === 'event') {
      stats.eventReports++;
    }
  });

  return statsByStudio;
};

/**
 * Update a report's status
 * @param {string} studioId - Studio ID where the report is located
 * @param {string} reportId - Report ID
 * @param {string} status - New status ('pending', 'reviewed', 'resolved', 'dismissed')
 * @param {string} adminNotes - Optional admin notes
 * @returns {Object} Success result
 */
export const updateReport = async (
  studioId,
  reportId,
  status,
  adminNotes = ''
) => {
  try {
    return await updateReportStatus(studioId, reportId, status, adminNotes);
  } catch (error) {
    console.error('[adminService] Error updating report:', error);
    throw error;
  }
};

/**
 * Get available studios for dropdown/filtering
 * @returns {Array} Array of studio options
 */
export const getStudioOptions = () => {
  const studios = StudioService.getAllStudios();
  return [
    { id: 'all', name: 'All Studios', displayName: 'All Studios' },
    ...studios.map((studio) => ({
      id: studio.id,
      name: studio.name,
      displayName: `${studio.city}, ${studio.state}`,
    })),
  ];
};
