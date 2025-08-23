// FILE: src/lib/emojiUtils.js - Reusable emoji detection and assignment

/**
 * Get appropriate emoji for a given text based on keywords
 * @param {string} text - Input text to analyze
 * @returns {string} - Appropriate emoji or default
 */
export const getEmojiForText = (text) => {
  const cleanText = text.toLowerCase().trim();
  if (!cleanText) return '✨';

  // Sports & Activities
  if (cleanText.includes('golf')) return '⛳';
  if (cleanText.includes('fantasy football')) return '🏆';
  if (cleanText.includes('football') || cleanText.includes('nfl')) return '🏈';
  if (cleanText.includes('basketball')) return '🏀';
  if (cleanText.includes('baseball')) return '⚾';
  if (cleanText.includes('soccer')) return '⚽';
  if (cleanText.includes('tennis')) return '🎾';
  if (cleanText.includes('pickleball')) return '🏓';
  if (cleanText.includes('volleyball')) return '🏐';
  if (cleanText.includes('ball') && !cleanText.includes('football') && !cleanText.includes('basketball') && !cleanText.includes('baseball') && !cleanText.includes('pickleball') && !cleanText.includes('volleyball')) return '🏀';
  if (cleanText.includes('clemson') || cleanText.includes('tigers')) return '🐾';
  if (cleanText.includes('game') || cleanText.includes(' vs ') || cleanText.includes(' v ')) return '🏟️';
  if (cleanText.includes('hockey')) return '🏒';
  if (cleanText.includes('swim') || cleanText.includes('pool')) return '🏊';
  if (cleanText.includes('run') || cleanText.includes('jog') || cleanText.includes('marathon')) return '🏃';
  if (cleanText.includes('bike') || cleanText.includes('cycling')) return '🚴';
  if (cleanText.includes('gym') || cleanText.includes('workout') || cleanText.includes('fitness')) return '💪';
  if (cleanText.includes('yoga')) return '🧘';
  if (cleanText.includes('climb') || cleanText.includes('mountain')) return '🧗';
  if (cleanText.includes('ski') || cleanText.includes('snow')) return '⛷️';
  if (cleanText.includes('surf')) return '🏄';

  // Work & Professional
  if (cleanText.includes('work') || cleanText.includes('office') || cleanText.includes('meeting')) return '💼';
  if (cleanText.includes('team') || cleanText.includes('coworker') || cleanText.includes('colleague')) return '👥';
  if (cleanText.includes('client') || cleanText.includes('business')) return '🤝';
  if (cleanText.includes('project') || cleanText.includes('deadline')) return '📋';
  if (cleanText.includes('conference') || cleanText.includes('seminar')) return '🎤';
  if (cleanText.includes('startup') || cleanText.includes('entrepreneur')) return '🚀';

  // Social & Friends
  if (cleanText.includes('friend') || cleanText.includes('buddy') || cleanText.includes('pal')) return '👯';
  if (cleanText.includes('family') || cleanText.includes('relative')) return '👨‍👩‍👧‍👦';
  if (cleanText.includes('party') || cleanText.includes('celebration')) return '🎉';
  if (cleanText.includes('birthday')) return '🎂';
  if (cleanText.includes('wedding')) return '💒';
  if (cleanText.includes('date') || cleanText.includes('romantic')) return '❤️';
  if (cleanText.includes('neighbor') || cleanText.includes('hood')) return '🏘️';

  // Hobbies & Interests
  if (cleanText.includes('book') || cleanText.includes('read')) return '📚';
  if (cleanText.includes('movie') || cleanText.includes('film') || cleanText.includes('cinema')) return '🎬';
  if (cleanText.includes('music') || cleanText.includes('concert') || cleanText.includes('band')) return '🎵';
  if (cleanText.includes('jazz')) return '🎷';
  if (cleanText.includes('rock') || cleanText.includes('classic rock')) return '🎸';
  if (cleanText.includes('edm') || cleanText.includes('electronic')) return '🎧';
  if (cleanText.includes('house music')) return '🏠';
  if (cleanText.includes('rap') || cleanText.includes('hip hop')) return '🎤';
  if (cleanText.includes('classical')) return '🎼';
  if (cleanText.includes('art') || cleanText.includes('paint') || cleanText.includes('draw')) return '🎨';
  if (cleanText.includes('painting')) return '🖼️';
  if (cleanText.includes('photo') || cleanText.includes('picture')) return '📸';
  if (cleanText.includes('game') || cleanText.includes('gaming')) return '🎮';
  if (cleanText.includes('board game') || cleanText.includes('board')) return '🎲';
  if (cleanText.includes('card game') || cleanText.includes('cards')) return '🃏';
  if (cleanText.includes('poker')) return '♠️';
  if (cleanText.includes('garden') || cleanText.includes('plant') || cleanText.includes('green thumb')) return '🌱';
  if (cleanText.includes('cook') || cleanText.includes('chef') || cleanText.includes('recipe')) return '👨‍🍳';
  if (cleanText.includes('dancing') || cleanText.includes('dance')) return '💃';
  if (cleanText.includes('clubbing') || cleanText.includes('club') || cleanText.includes('nightclub')) return '🕺';
  if (cleanText.includes('book club')) return '📚';
  if (cleanText.includes('investment') || cleanText.includes('investing')) return '📈';
  if (cleanText.includes('entrepreneur') || cleanText.includes('startup')) return '🚀';
  if (cleanText.includes('real estate')) return '🏠';
  if (cleanText.includes('karaoke')) return '🎤';

  // Food & Dining
  if (cleanText.includes('coffee') || cleanText.includes('cafe')) return '☕';
  if (cleanText.includes('breakfast') || cleanText.includes('brunch')) return '🥐';
  if (cleanText.includes('lunch')) return '🥙';
  if (cleanText.includes('dinner') || cleanText.includes('restaurant')) return '🍽️';
  if (cleanText.includes('potluck')) return '🥘';
  if (cleanText.includes('family dinner')) return '👨‍👩‍👧‍👦';
  if (cleanText.includes('out for dinner') || cleanText.includes('dining out')) return '🍽️';
  if (cleanText.includes('pizza')) return '🍕';
  if (cleanText.includes('burger') || cleanText.includes('bbq')) return '🍔';
  if (cleanText.includes('sushi') || cleanText.includes('japanese')) return '🍣';
  if (cleanText.includes('taco') || cleanText.includes('mexican')) return '🌮';
  if (cleanText.includes('beer') || cleanText.includes('drinks') || cleanText.includes('bar')) return '🍺';
  if (cleanText.includes('drinking') || cleanText.includes('cocktails')) return '🍻';
  if (cleanText.includes('wine') || cleanText.includes('vineyard')) return '🍷';

  // Travel & Places
  if (cleanText.includes('beach') || cleanText.includes('ocean') || cleanText.includes('surf')) return '🏖️';
  if (cleanText.includes('camping') || cleanText.includes('camp')) return '🏕️';
  if (cleanText.includes('hiking') || cleanText.includes('hike') || cleanText.includes('trail')) return '🥾';
  if (cleanText.includes('travel') || cleanText.includes('trip') || cleanText.includes('vacation')) return '✈️';
  if (cleanText.includes('city') || cleanText.includes('urban')) return '🏙️';
  if (cleanText.includes('park') || cleanText.includes('nature')) return '🌳';
  if (cleanText.includes('lake') || cleanText.includes('fishing')) return '🎣';

  // Events & Occasions
  if (cleanText.includes('grad') || cleanText.includes('graduation')) return '🎓';
  if (cleanText.includes('holiday') || cleanText.includes('christmas')) return '🎄';
  if (cleanText.includes('halloween')) return '🎃';
  if (cleanText.includes('new year')) return '🎊';
  if (cleanText.includes('volunteer') || cleanText.includes('charity')) return '🤲';
  if (cleanText.includes('study') || cleanText.includes('school') || cleanText.includes('student')) return '📖';

  // Default emoji for unmatched text
  return '✨';
};

/**
 * Generate contextual suggestions based on input text
 * @param {string} input - User input text
 * @param {string} context - Context type ('group', 'event', etc.)
 * @returns {Array} - Array of suggestion objects with text and emoji
 */
export const getContextualSuggestions = (input, context = 'general') => {
  const cleanInput = input.toLowerCase().trim();
  if (!cleanInput || cleanInput.length < 2) return [];
  
  // Helper function for partial matching
  const matches = (keyword) => {
    return cleanInput.includes(keyword) || keyword.startsWith(cleanInput) || keyword.includes(cleanInput);
  };
  
  const suggestions = [];

  // Sports suggestions with improved partial matching
  if (matches('golf')) suggestions.push('Golf');
  if (matches('fantasy football') || matches('fantasy')) suggestions.push('Fantasy Football');
  if (matches('football')) suggestions.push('Football');
  if (matches('basketball')) suggestions.push('Basketball');
  if (matches('ball') && !cleanInput.includes('football') && !cleanInput.includes('basketball')) suggestions.push('Basketball');
  if (matches('clemson')) suggestions.push('Clemson');
  if (matches('game') || cleanInput.includes(' vs ')) suggestions.push('Game');
  if (matches('soccer')) suggestions.push('Soccer');
  if (matches('tennis')) suggestions.push('Tennis');
  if (matches('pickleball')) suggestions.push('Pickleball');
  if (matches('baseball')) suggestions.push('Baseball');
  if (matches('hockey')) suggestions.push('Hockey');
  if (matches('swimming') || matches('swim')) suggestions.push('Swimming');
  if (matches('running') || matches('run') || matches('jog')) suggestions.push('Running');
  if (matches('cycling') || matches('bike')) suggestions.push('Cycling');
  if (matches('workout') || matches('gym')) suggestions.push('Workout');
  if (matches('yoga')) suggestions.push('Yoga');

  // Work suggestions
  if (cleanInput.includes('work') || cleanInput.includes('office')) suggestions.push('Work');
  if (cleanInput.includes('meeting') || cleanInput.includes('conference')) suggestions.push('Meeting');
  if (cleanInput.includes('team') || cleanInput.includes('coworker')) suggestions.push('Team');
  if (cleanInput.includes('project')) suggestions.push('Project');
  if (cleanInput.includes('client') || cleanInput.includes('business')) suggestions.push('Business');
  if (cleanInput.includes('investment') || cleanInput.includes('investing')) suggestions.push('Investment');
  if (cleanInput.includes('entrepreneur') || cleanInput.includes('startup')) suggestions.push('Entrepreneur');
  if (cleanInput.includes('real estate')) suggestions.push('Real Estate');

  // Social suggestions
  if (cleanInput.includes('friend') || cleanInput.includes('buddy')) suggestions.push('Friends');
  if (cleanInput.includes('family')) suggestions.push('Family');
  if (cleanInput.includes('party') || cleanInput.includes('celebration')) suggestions.push('Party');
  if (cleanInput.includes('birthday')) suggestions.push('Birthday');
  if (cleanInput.includes('wedding')) suggestions.push('Wedding');

  // Food suggestions
  if (cleanInput.includes('coffee')) suggestions.push('Coffee');
  if (cleanInput.includes('breakfast') || cleanInput.includes('brunch')) suggestions.push('Brunch');
  if (cleanInput.includes('lunch')) suggestions.push('Lunch');
  if (cleanInput.includes('dinner')) suggestions.push('Dinner');
  if (cleanInput.includes('potluck')) suggestions.push('Potluck');
  if (cleanInput.includes('family dinner')) suggestions.push('Family Dinner');
  if (cleanInput.includes('out for dinner') || cleanInput.includes('dining out')) suggestions.push('Dinner Out');
  if (cleanInput.includes('pizza')) suggestions.push('Pizza');
  if (cleanInput.includes('burger') || cleanInput.includes('bbq')) suggestions.push('BBQ');
  if (cleanInput.includes('drinks') || cleanInput.includes('bar')) suggestions.push('Drinks');
  if (cleanInput.includes('drinking') || cleanInput.includes('cocktails')) suggestions.push('Drinking');

  // Travel suggestions
  if (cleanInput.includes('beach')) suggestions.push('Beach');
  if (cleanInput.includes('camping')) suggestions.push('Camping');
  if (cleanInput.includes('hiking') || cleanInput.includes('hike')) suggestions.push('Hiking');
  if (cleanInput.includes('travel') || cleanInput.includes('trip')) suggestions.push('Trip');
  if (cleanInput.includes('vacation')) suggestions.push('Vacation');

  // Activity suggestions
  if (cleanInput.includes('movie') || cleanInput.includes('film')) suggestions.push('Movie');
  if (cleanInput.includes('music') || cleanInput.includes('concert')) suggestions.push('Concert');
  if (cleanInput.includes('jazz')) suggestions.push('Jazz');
  if (cleanInput.includes('rock')) suggestions.push('Rock');
  if (cleanInput.includes('classic rock')) suggestions.push('Classic Rock');
  if (cleanInput.includes('edm') || cleanInput.includes('electronic')) suggestions.push('EDM');
  if (cleanInput.includes('house music')) suggestions.push('House Music');
  if (cleanInput.includes('rap') || cleanInput.includes('hip hop')) suggestions.push('Rap');
  if (cleanInput.includes('karaoke')) suggestions.push('Karaoke');
  if (cleanInput.includes('game') || cleanInput.includes('gaming')) suggestions.push('Gaming');
  if (cleanInput.includes('board game') || cleanInput.includes('board')) suggestions.push('Board Games');
  if (cleanInput.includes('card game') || cleanInput.includes('cards')) suggestions.push('Card Games');
  if (cleanInput.includes('poker')) suggestions.push('Poker');
  if (cleanInput.includes('book') || cleanInput.includes('read')) suggestions.push('Book Club');
  if (cleanInput.includes('art') || cleanInput.includes('paint')) suggestions.push('Art');
  if (cleanInput.includes('painting')) suggestions.push('Painting');
  if (cleanInput.includes('dancing') || cleanInput.includes('dance')) suggestions.push('Dancing');
  if (cleanInput.includes('clubbing') || cleanInput.includes('club')) suggestions.push('Clubbing');
  if (cleanInput.includes('green thumb') || cleanInput.includes('garden')) suggestions.push('Gardening');

  // Event-specific suggestions
  if (context === 'event') {
    if (cleanInput.includes('meetup')) suggestions.push('Meetup');
    if (cleanInput.includes('workshop')) suggestions.push('Workshop');
    if (cleanInput.includes('class')) suggestions.push('Class');
    if (cleanInput.includes('tournament')) suggestions.push('Tournament');
    if (cleanInput.includes('competition')) suggestions.push('Competition');
    if (cleanInput.includes('festival')) suggestions.push('Festival');
    if (cleanInput.includes('expo') || cleanInput.includes('exhibition')) suggestions.push('Expo');
    if (cleanInput.includes('networking')) suggestions.push('Networking');
  }

  // Return unique suggestions with emojis, limited to 5
  return [...new Set(suggestions)]
    .slice(0, 5)
    .map(suggestion => ({
      text: suggestion,
      emoji: getEmojiForText(suggestion)
    }));
};

/**
 * Legacy function for backward compatibility
 */
export const getEmojiForGroupName = getEmojiForText;
export const getGroupSuggestions = (input) => getContextualSuggestions(input, 'group').map(s => s.text);