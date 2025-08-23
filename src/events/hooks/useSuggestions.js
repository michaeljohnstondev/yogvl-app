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
import { db } from '../../auth/services/firebase';
import { getStudioInterests } from '../../services/interestService';

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
export const useSuggestions = (studioId = null) => {
  const [suggestions, setSuggestions] = useState({
    titles: [],
    locations: [],
    details: [],
    interests: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!studioId) {
        console.warn('No studioId provided to useSuggestions');
        setSuggestions({ titles: [], locations: [], details: [], interests: [] });
        return;
      }
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Load both events and interests in parallel
      const [querySnapshot, studioInterests] = await Promise.all([
        getDocs(query(
          collection(db, 'studios', studioId, 'events'),
          orderBy('createdAt', 'desc'),
          limit(SUGGESTION_LIMITS.TOTAL_EVENTS)
        )),
        getStudioInterests(studioId)
      ]);
      const counts = { titles: {}, locations: {}, details: {} };

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // Client-side filters to avoid composite index
        if (data.createdAt && data.createdAt.toDate() < sixMonthsAgo) {
          return;
        }
        
        // Skip private events
        if (data.isPrivate === true) {
          return;
        }

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
        interests: studioInterests.slice(0, 15), // Top 15 interests
      });
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions({ titles: [], locations: [], details: [], interests: [] });
    } finally {
      setIsLoading(false);
    }
  }, [studioId]);

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
    .filter((item) => {
      // Handle both event data (with .text) and interest data (with .interest)
      const text = item.text || item.interest || '';
      return text.toLowerCase().includes(searchTerm);
    })
    .slice(0, limits.DISPLAY_MAX);
};

// Combined suggestion filtering for title field (includes interests)
export const filterTitleSuggestions = (
  input,
  titleSuggestions,
  interestSuggestions,
  limits = SUGGESTION_LIMITS
) => {
  if (!input.trim()) {
    // Show top titles and top interests when no input
    const topTitles = titleSuggestions.slice(0, Math.floor(limits.DISPLAY_DEFAULT * 0.7));
    const topInterests = interestSuggestions.slice(0, Math.ceil(limits.DISPLAY_DEFAULT * 0.3));
    return [...topTitles, ...topInterests];
  }

  const searchTerm = input.toLowerCase();
  
  // Filter both titles and interests
  const filteredTitles = titleSuggestions
    .filter((item) => item.text.toLowerCase().includes(searchTerm));
  
  const filteredInterests = interestSuggestions
    .filter((item) => item.interest.toLowerCase().includes(searchTerm))
    .map(item => ({ text: item.interest, count: item.count, type: 'interest' }));
  
  // Combine and limit results
  const combined = [...filteredTitles, ...filteredInterests];
  return combined.slice(0, limits.DISPLAY_MAX);
};
