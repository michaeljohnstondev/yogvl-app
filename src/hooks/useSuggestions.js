// hooks/useSuggestions.js

import { useState, useCallback } from 'react';
import {
  Timestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

// Constants
const SUGGESTION_LIMITS = {
  TOTAL_EVENTS: 500,
  TITLES: 20,
  LOCATIONS: 20,
  DETAILS: 15,
  DISPLAY_DEFAULT: 6,
  DISPLAY_MAX: 8,
};

// Utility function
const parsePhrases = (details) => {
  return details
    .trim()
    .split(/[.!?]\s+/)
    .filter((phrase) => phrase.length > 10 && phrase.length < 100)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
};

// Custom Hook for Suggestions
export const useSuggestions = () => {
  const [suggestions, setSuggestions] = useState({
    titles: [],
    locations: [],
    details: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    try {
      setIsLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const eventsQuery = query(
        collection(db, 'events'),
        where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('createdAt', 'desc'),
        limit(SUGGESTION_LIMITS.TOTAL_EVENTS)
      );

      const querySnapshot = await getDocs(eventsQuery);
      const counts = { titles: {}, locations: {}, details: {} };

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();

        // Process titles
        if (data.title?.trim()) {
          const title = data.title.trim();
          counts.titles[title] = (counts.titles[title] || 0) + 1;
        }

        // Process locations
        if (data.location?.trim()) {
          const location = data.location.trim();
          counts.locations[location] = (counts.locations[location] || 0) + 1;
        }

        // Process details
        if (data.details?.trim()) {
          const phrases = parsePhrases(data.details);
          phrases.forEach((phrase) => {
            counts.details[phrase] = (counts.details[phrase] || 0) + 1;
          });
        }
      });

      const sortByCount = (obj, limit) =>
        Object.entries(obj)
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

      setSuggestions({
        titles: sortByCount(counts.titles, SUGGESTION_LIMITS.TITLES),
        locations: sortByCount(counts.locations, SUGGESTION_LIMITS.LOCATIONS),
        details: sortByCount(counts.details, SUGGESTION_LIMITS.DETAILS),
      });
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions({ titles: [], locations: [], details: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggestions, isLoading, loadSuggestions };
};

// Filter suggestions utility function
export const filterSuggestions = (
  input,
  sourceArray,
  limits = SUGGESTION_LIMITS
) => {
  if (!input.trim()) return sourceArray.slice(0, limits.DISPLAY_DEFAULT);
  const searchTerm = input.toLowerCase();
  return sourceArray
    .filter((item) => item.text.toLowerCase().includes(searchTerm))
    .slice(0, limits.DISPLAY_MAX);
};
