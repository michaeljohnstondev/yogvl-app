import { useState, useEffect } from 'react';
import { ReliabilityService } from '../services/ReliabilityService';

export const useReliability = (userData) => {
  const [reliabilityData, setReliabilityData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      const displayData =
        ReliabilityService.getUserReliabilityDisplay(userData);
      setReliabilityData(displayData);
    }
  }, [userData]);

  const refreshReliability = async (userId, studioId = null) => {
    if (!userId) return;

    // Try to get studioId from userData if not provided
    if (!studioId && userData) {
      studioId = userData?.userdata?.studioId || userData?.studioId;
    }

    try {
      setLoading(true);
      const updatedData = await ReliabilityService.updateUserReliability(
        userId,
        false,
        studioId
      );
      const displayData = ReliabilityService.getUserReliabilityDisplay({
        ...userData,
        userdata: {
          ...userData.userdata,
          metrics: {
            ...userData.userdata?.metrics,
            reliability: {
              score: updatedData.reliabilityScore,
              tier: updatedData.tier.label,
              metrics: updatedData.metrics,
              streaks: updatedData.streaks,
              lastUpdated: updatedData.lastUpdated,
            },
          },
        },
      });
      setReliabilityData(displayData);
      return updatedData;
    } catch (error) {
      console.error('Error refreshing reliability:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    reliabilityData,
    loading,
    refreshReliability,
  };
};
