# Date Handling Fix

## Problem

We identified an inconsistency in date handling between the frontend JavaScript code and the backend MongoDB/Python processing. This inconsistency can lead to:

1. Data being incorrectly grouped by date due to timezone differences
2. Charts and reports showing different results based on the user's local timezone
3. Weekend rollup logic not working correctly

## Root Cause

JavaScript's `Date` object uses the local timezone by default when using methods like `getMonth()`, `getDate()`, etc. However, our MongoDB data is stored in UTC format, and Python pandas processes dates in UTC by default.

This timezone mismatch can cause data points near midnight UTC to shift between days when viewed in different timezones.

## Solution

1. Created a central utility file (`frontend/src/utils/dateUtils.js`) with common UTC date handling functions:
   - `toUTCDateString()` - Converts dates to MM/DD/YYYY format using UTC
   - `createUTCDate()` - Creates Date objects with consistent UTC date handling
   - `isSameUTCDay()` - Compares dates using UTC day boundaries

2. Updated components to use these utilities:
   - Refactored `PackingPage.js` to use the imported utilities instead of local functions
   - Modified `Dashboard.js` to ensure date filtering uses proper UTC boundaries
   - Ensures consistent date handling across all reports

3. Standardized date filtering parameters:
   - For start dates: Set time to 00:00:00 UTC to include full days
   - For end dates: Set time to 23:59:59 UTC to include full days

## Testing

To verify the fix, compare data across different timezones or by changing your system's timezone:
1. Data grouped by date should remain consistent regardless of local timezone
2. Date filtering should include full UTC days
3. Weekend rollup logic should work correctly

## Future Recommendations

1. Use the utility functions in any new components that handle dates
2. Consider adding timezone display in the UI to make users aware of UTC time being used
3. If localized date handling is needed in the future, create separate utilities that clearly indicate local time use 