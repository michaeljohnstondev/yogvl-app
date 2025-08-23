import { useState, useEffect } from 'react';
import { ReliabilityService } from '../services/ReliabilityService';

export const useReliability = (userData) => {
  const [reliabilityData, setReliabilityData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      const displayData = ReliabilityService.getUserReliabilityDisplay(userData);
      setReliabilityData(displayData);
    }
  }, [userData]);

  const refreshReliability = async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const updatedData = await ReliabilityService.updateUserReliability(userId);
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
            }
          }
        }
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