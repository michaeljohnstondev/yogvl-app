import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../../styles/inviteScreenStyles';
import { extractInterestsFromEventTitle } from '../../../../services/interestService';

const FilterSection = ({
  showFavorites,
  setShowFavorites,
  showFriends,
  setShowFriends,
  showLocalNode,
  setShowLocalNode,
  selectedInterests,
  setSelectedInterests,
  eventTitle,
  themeColor,
  themeBgColor
}) => {
  const [suggestedInterests, setSuggestedInterests] = useState([]);

  // Extract interests from event title when it changes
  useEffect(() => {
    if (eventTitle) {
      const interests = extractInterestsFromEventTitle(eventTitle);
      setSuggestedInterests(interests);
      // Auto-select interests from event title
      if (interests.length > 0) {
        setSelectedInterests(interests);
      }
    } else {
      setSuggestedInterests([]);
      setSelectedInterests([]);
    }
  }, [eventTitle, setSelectedInterests]);

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleEventTitle = () => {
    if (!eventTitle) return;
    
    const eventTitleAsInterest = eventTitle.toLowerCase().trim();
    if (eventTitleAsInterest) {
      setSelectedInterests(prev => 
        prev.includes(eventTitleAsInterest)
          ? prev.filter(i => i !== eventTitleAsInterest)
          : [...prev, eventTitleAsInterest]
      );
    }
  };
  return (
    <View>
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Show:</Text>
        <View style={styles.filterToggles}>
          <TouchableOpacity
            style={[styles.filterToggle, showFavorites && { backgroundColor: themeBgColor, borderColor: themeColor }]}
            onPress={() => setShowFavorites(!showFavorites)}
          >
            <Text style={[styles.filterToggleText, showFavorites && { color: themeColor }]}>
              ⭐ Favorites
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterToggle, showFriends && { backgroundColor: themeBgColor, borderColor: themeColor }]}
            onPress={() => setShowFriends(!showFriends)}
          >
            <Text style={[styles.filterToggleText, showFriends && { color: themeColor }]}>
              👫 Friends
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterToggle, showLocalNode && { backgroundColor: themeBgColor, borderColor: themeColor }]}
            onPress={() => setShowLocalNode(!showLocalNode)}
          >
            <Text style={[styles.filterToggleText, showLocalNode && { color: themeColor }]}>
              🌐 Local
            </Text>
          </TouchableOpacity>
        </View>
      </View>


    </View>
  );
};

export default FilterSection;