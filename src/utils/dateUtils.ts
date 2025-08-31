/**
 * Formats a date to a localized date string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
};

/**
 * Formats a date to a localized date and time string
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
};

/**
 * Formats a date to a time string only
 */
export const formatTime = (date?: Date | string): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString();
};

/**
 * Calculates duration between two dates in seconds
 */
export const getDuration = (startTime?: Date, endTime?: Date): string => {
  if (!startTime) return '';
  const endTimeToUse = endTime || new Date();
  const duration = Math.round((endTimeToUse.getTime() - startTime.getTime()) / 1000);
  return `${duration}s`;
};

/**
 * Formats duration in a human-readable format
 */
export const formatDuration = (startDate: Date | number, endDate?: Date): string => {
  let seconds: number;
  
  if (typeof startDate === 'number') {
    // If first parameter is number, use it as seconds directly (legacy behavior)
    seconds = startDate;
  } else {
    // Calculate duration between two dates
    const endTime = endDate || new Date();
    seconds = Math.floor((endTime.getTime() - startDate.getTime()) / 1000);
  }
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
};

/**
 * Checks if a date is older than specified days
 */
export const isOlderThan = (date: Date | string, days: number): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const daysInMs = days * 24 * 60 * 60 * 1000;
  return (Date.now() - dateObj.getTime()) > daysInMs;
};

/**
 * Gets a relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObj);
  }
};