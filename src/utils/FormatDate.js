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
