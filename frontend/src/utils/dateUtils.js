/**
 * Converts a date to a UTC date string in MM/DD/YYYY format
 * This ensures consistent date handling regardless of local timezone
 * @param {Date|string|number} dateInput - Date to convert
 * @returns {string} Date string in UTC MM/DD/YYYY format
 */
export function toUTCDateString(dateInput) {
  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  return (
    String(date.getUTCMonth() + 1).padStart(2, '0') + '/' +
    String(date.getUTCDate()).padStart(2, '0') + '/' +
    date.getUTCFullYear()
  );
}

/**
 * Creates a Date object from date parts, interpreted in UTC
 * @param {string|number} year - Year
 * @param {string|number} month - Month (1-12)
 * @param {string|number} day - Day of month
 * @returns {Date} Date object with the specified UTC date
 */
export function createUTCDate(year, month, day) {
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/**
 * Checks if two dates represent the same UTC day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if dates are the same UTC day
 */
export function isSameUTCDay(date1, date2) {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
} 