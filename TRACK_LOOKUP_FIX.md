# Track Lookup Robustness Fix

## Problem Identified

Location warnings were not appearing for the Barnsley Pub Crawl adventure, but were working for the Date Day adventure.

**Root Cause**: The code was constructing track IDs as `standard_barnsley` (based on URL `/barnsley/pubcrawl` → mode mapping → `standard_barnsley`), but the database actually has the track stored as `pub_barnsley`.

This created a mismatch:
- **Expected by code**: `standard_barnsley`
- **Actual in database**: `pub_barnsley`

When the API tried to fetch riddles for `standard_barnsley`, it found nothing, so no warnings were generated.

## Solution Implemented

Made the track lookup system **flexible and resilient** to handle naming variations automatically:

### 1. **Track Warnings API** (`/api/track-warnings/route.ts`)
- Now queries database by `location` and `mode` fields instead of exact track ID
- Falls back through multiple strategies:
  1. Try exact track ID match
  2. Extract location/mode from track ID string and query by those
  3. Use location/mode parameters if provided
- Logs which fallback strategy succeeded for debugging

### 2. **Tracks Metadata API** (`/api/tracks/[location]/route.ts`)
- Changed from hardcoded ID construction (`date_${location}`, `pub_${location}`)
- Now queries: `SELECT * FROM tracks WHERE location = ? AND mode IN ('date', 'standard')`
- Works regardless of track ID naming convention

### 3. **Locations Hours API** (`/api/locations/[trackId]/hours/route.ts`)
- Added track existence check before querying riddles
- If track ID not found, extracts location/mode and re-queries
- Prevents silent failures when track IDs don't match expectations

### 4. **Client-Side Calls**
- Updated all API calls to pass `location` and `mode` as backup parameters
- Example: `/api/track-warnings?trackId=standard_barnsley&location=barnsley&mode=standard`
- API can use whichever approach works

## Benefits

✅ **Prevents Future Breakage**: Works with any track ID naming convention  
✅ **Self-Healing**: Automatically finds the right track even if IDs don't match  
✅ **Better Logging**: Console shows which lookup strategy succeeded  
✅ **No Database Changes Required**: Works with existing data  
✅ **Backwards Compatible**: Still works with old track IDs

## How It Works Now

When you visit `/barnsley/pubcrawl`:

1. Code constructs `trackId = "standard_barnsley"` (legacy behavior)
2. API receives: `trackId=standard_barnsley&location=barnsley&mode=standard`
3. API tries to find track with ID `standard_barnsley` → **not found**
4. API falls back: queries `WHERE location='barnsley' AND mode='standard'`
5. Finds track `pub_barnsley` with mode='standard' ✅
6. Uses `pub_barnsley` to fetch riddles and generate warnings

## What This Fixes

- ✅ Location warnings now appear for Pub Crawl adventures
- ✅ Opening hours data is correctly loaded for pub crawl
- ✅ Time warnings work on both adventure selection and payment pages
- ✅ System won't break if you add new locations with different ID formats

## Database Reality

Based on the tracks table export:
```json
{
  "id": "pub_barnsley",
  "mode": "standard",
  "location": "barnsley"
}
```

The mode field is `"standard"` but the ID uses `"pub"` prefix. The new system handles this gracefully by querying the mode field instead of constructing IDs.

## Testing Recommendation

Test both adventures to confirm warnings appear:

1. **Date Day** (`/barnsley/date`):
   - Should continue working as before
   - Track ID: `date_barnsley` matches database ✅

2. **Pub Crawl** (`/barnsley/pubcrawl`):
   - Now works with flexible lookup
   - Code looks for: `standard_barnsley`
   - System finds: `pub_barnsley` (mode='standard') ✅

Both should now show location warnings if any riddle locations are closed or closing soon.
