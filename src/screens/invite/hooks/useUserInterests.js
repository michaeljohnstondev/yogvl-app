import { useState, useEffect, useMemo } from 'react';
import { getUserInterests } from '../../../services/interestService';

export const useUserInterests = (userIds, studioId) => {
  const [userInterestsMap, setUserInterestsMap] = useState({});
  const [loadingInterests, setLoadingInterests] = useState(false);

  // Memoize userIds string for stable dependency
  const userIdsKey = useMemo(
    () => (userIds ? userIds.sort().join(',') : ''),
    [userIds]
  );

  useEffect(() => {
    if (!userIds || userIds.length === 0 || !studioId) {
      setUserInterestsMap({});
      return;
    }

    const loadInterests = async () => {
      setLoadingInterests(true);

      try {
        const interestsMap = {};

        // Load interests for each user
        const interestPromises = userIds.map(async (userId) => {
          try {
            const interests = await getUserInterests(userId);
            return { userId, interests };
          } catch (error) {
            console.warn(
              `[useUserInterests] Failed to load interests for user ${userId}:`,
              error
            );
            return { userId, interests: [] };
          }
        });

        const results = await Promise.all(interestPromises);

        results.forEach(({ userId, interests }) => {
          interestsMap[userId] = interests;
        });

        setUserInterestsMap(interestsMap);
      } catch (error) {
        console.error(
          '[useUserInterests] Error loading user interests:',
          error
        );
        setUserInterestsMap({});
      } finally {
        setLoadingInterests(false);
      }
    };

    loadInterests();
  }, [userIdsKey, studioId]);

  return {
    userInterestsMap,
    loadingInterests,
  };
};
