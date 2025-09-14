// Relative time formatting
export const getRelativeTimeString = (timestamp) => {
  if (!timestamp) return 'Unknown time';

  let date;
  if (timestamp?.toDate) {
    // Firebase Timestamp
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // String or number
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return 'Invalid time';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older messages, show the actual date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export const FormatDate = (utcISOString, eventTimeZone) => {
  //console.log('utcISOString:', utcISOString, 'tz:', eventTimeZone);
  if (!utcISOString || !eventTimeZone) return 'Invalid Date';

  const utcDate = new Date(utcISOString);
  if (isNaN(utcDate.getTime())) {
    console.error('Invalid date string:', utcISOString);
    return 'Invalid Date';
  }

  // Function to get date parts in the specified timezone
  const getDatePartsInTimeZone = (date, timeZone) => {
    const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
    const dateParts = {};
    parts.forEach(({ type, value }) => {
      if (type === 'year') dateParts.year = parseInt(value, 10);
      if (type === 'month') dateParts.month = parseInt(value, 10);
      if (type === 'day') dateParts.day = parseInt(value, 10);
    });
    return dateParts;
  };

  const now = new Date();

  // Get date parts for current date in the event timezone
  const nowParts = getDatePartsInTimeZone(now, eventTimeZone);
  // Get date parts for the event date in the event timezone
  const eventParts = getDatePartsInTimeZone(utcDate, eventTimeZone);

  const isToday =
    nowParts.year === eventParts.year &&
    nowParts.month === eventParts.month &&
    nowParts.day === eventParts.day;

  if (isToday) {
    // Format time only in the event timezone
    const timeOnly = new Intl.DateTimeFormat('en-US', {
      timeZone: eventTimeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(utcDate);
    return `Today @ ${timeOnly}`;
  } else {
    // Format full date
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: eventTimeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    return formatter.format(utcDate);
  }
};
