export const textUtils = {
  extractEmoji(title) {
    if (!title) return { emoji: null, cleanTitle: title };

    // Regex to match emojis (including compound emojis)
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/u;
    const match = title.match(emojiRegex);

    if (match) {
      const emoji = match[0];
      const cleanTitle = title.replace(emojiRegex, '').trim();
      return { emoji, cleanTitle };
    }

    return { emoji: null, cleanTitle: title };
  },

  parseEmojiAndTitle(title) {
    // Alias for extractEmoji with a more descriptive name
    return this.extractEmoji(title);
  },

  formatDisplayName(userData, fallback = 'User') {
    if (!userData?.userdata?.contactInfo) {
      return fallback;
    }

    const { displayName, firstName, lastName } = userData.userdata.contactInfo;

    if (displayName) {
      return displayName;
    }

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    if (firstName) {
      return firstName;
    }

    return fallback;
  },

  truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength).trim() + suffix;
  },

  sanitizeEventTitle(title) {
    if (!title) return '';

    // Remove potential XSS or problematic characters
    return title
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .trim();
  },

  formatEventDescription(description, maxLength = 500) {
    if (!description) return '';

    const sanitized = this.sanitizeEventTitle(description);
    return this.truncateText(sanitized, maxLength);
  },

  capitalizeFirst(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  formatPlural(count, singular, plural = null) {
    if (count === 1) {
      return `${count} ${singular}`;
    }

    const pluralForm = plural || `${singular}s`;
    return `${count} ${pluralForm}`;
  },

  extractHashtags(text) {
    if (!text) return [];

    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);

    return matches ? matches.map((tag) => tag.substring(1)) : [];
  },

  formatEventCapacity(current, max) {
    if (!max) {
      return `${current} attending`;
    }

    const remaining = Math.max(0, max - current);

    if (remaining === 0) {
      return `Full (${current}/${max})`;
    }

    return `${current}/${max} attending`;
  },

  formatLocationDisplay(location, address) {
    if (!location && !address) {
      return 'Location TBD';
    }

    if (location && address) {
      return `${location}, ${address}`;
    }

    return location || address;
  },

  cleanupWhitespace(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();
  },

  isValidEventTitle(title) {
    if (!title || typeof title !== 'string') {
      return false;
    }

    const cleanTitle = title.trim();

    // Check minimum length
    if (cleanTitle.length < 3) {
      return false;
    }

    // Check maximum length
    if (cleanTitle.length > 100) {
      return false;
    }

    // Check for inappropriate content patterns
    const inappropriatePatterns = [
      /spam/i,
      /test\s*test/i,
      /^test$/i,
      /^\.+$/,
      /^-+$/,
    ];

    return !inappropriatePatterns.some((pattern) => pattern.test(cleanTitle));
  },

  formatTimeAgo(date) {
    if (!date) return '';

    const now = new Date();
    const eventDate = date instanceof Date ? date : new Date(date);
    const diffMs = now - eventDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
  },
};
