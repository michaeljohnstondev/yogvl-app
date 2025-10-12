// FILE: ratingUtils.js - Utilities for calculating and displaying host ratings

/**
 * Calculate average rating for a host from the last 6 months
 * @param {Object} userData - User data object containing ratings
 * @returns {Object} { average, count, display } - Average rating, count, and display string
 */
export const calculateHostRating = (userData) => {
  // Check NEW location: userdata.metrics.hostRating
  const stars = userData?.userdata?.metrics?.hostRating?.stars;
  const timeRated = userData?.userdata?.metrics?.hostRating?.timeRated;

  console.log('[ratingUtils] Checking hostRating:', {
    hasStars: !!stars,
    hasTimeRated: !!timeRated,
    starsLength: stars?.length,
    timeRatedLength: timeRated?.length,
  });

  if (!stars || !timeRated || stars.length === 0) {
    console.log('[ratingUtils] No ratings found in userdata.metrics.hostRating');
    return { average: 0, count: 0, display: 'No ratings yet' };
  }

  // Ensure arrays are the same length
  if (stars.length !== timeRated.length) {
    console.warn('[ratingUtils] Ratings arrays length mismatch:', {
      starsLength: stars.length,
      timeRatedLength: timeRated.length,
    });
    return { average: 0, count: 0, display: 'No ratings yet' };
  }

  // Calculate 6 months ago timestamp
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoTimestamp = sixMonthsAgo.getTime();

  console.log('[ratingUtils] Filtering ratings. Total:', stars.length, 'Six months ago:', new Date(sixMonthsAgoTimestamp));

  // Filter ratings from last 6 months
  const recentRatings = [];
  for (let i = 0; i < stars.length; i++) {
    const ratingTime = timeRated[i].toDate
      ? timeRated[i].toDate().getTime()
      : new Date(timeRated[i]).getTime();

    console.log('[ratingUtils] Rating', i, ':', {
      star: stars[i],
      time: new Date(ratingTime),
      isRecent: ratingTime >= sixMonthsAgoTimestamp,
    });

    if (ratingTime >= sixMonthsAgoTimestamp) {
      recentRatings.push(stars[i]);
    }
  }

  // Calculate average
  if (recentRatings.length === 0) {
    console.log('[ratingUtils] No ratings in last 6 months. Total ratings:', stars.length);
    return { average: 0, count: 0, display: 'No recent ratings' };
  }

  const sum = recentRatings.reduce((acc, rating) => acc + rating, 0);
  const average = sum / recentRatings.length;

  console.log('[ratingUtils] Calculated rating:', {
    average: Number(average.toFixed(1)),
    count: recentRatings.length,
    totalRatings: stars.length,
  });

  return {
    average: Number(average.toFixed(1)),
    count: recentRatings.length,
    display: `${average.toFixed(1)} ⭐ (${recentRatings.length} rating${recentRatings.length !== 1 ? 's' : ''})`,
  };
};

/**
 * Get star display for a rating (e.g., "4.5 ⭐⭐⭐⭐⭐")
 * @param {number} rating - Rating value (0-5)
 * @returns {string} Star display string
 */
export const getStarDisplay = (rating) => {
  if (rating === 0) return 'No ratings';

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) {
    stars += '✨'; // Half star
  }

  return `${rating.toFixed(1)} ${stars}`;
};
