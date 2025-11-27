# Testing Mode Setup Guide

## Overview
Testing mode allows you to create game sessions without payment processing. The admin bypass is already implemented in the codebase.

## How to Enable Testing Mode

### 1. Set Environment Variable
Add the following to your environment variables (`.env.local` or hosting platform):

```env
ADMIN_TEST_KEY=your-secret-testing-key-here
```

**Important:** Choose a strong, random key that only you know. Example: `ADMIN_TEST_KEY=riddle-city-test-2024-secure`

### 2. Access Testing Mode
Add the admin parameter to any booking URL:

```
https://yoursite.com/{location}/{mode}?admin=your-secret-testing-key-here
```

For example:
```
https://yoursite.com/barnsley/date?admin=riddle-city-test-2024-secure
```

### 3. Testing Mode Features

When in testing mode, you'll see:
- 🔧 **"Testing Mode - No Payment Required"** badge instead of pricing
- Orange "🔧 Create Test Game" button instead of payment button
- Game session creates immediately without Stripe redirect
- All game functionality works normally (team names, member management, riddles)
- Groups are marked as `paid: true` in database

## What Gets Created

Testing mode creates:
- ✅ Valid group with test UUID
- ✅ Test user profile
- ✅ Group leader assignment
- ✅ Team name saved
- ✅ 24-hour expiration set
- ✅ Direct redirect to first riddle
- ❌ No Stripe session
- ❌ No payment record
- ❌ No email invites sent

## Implementation Details

### Backend (already implemented)
File: `app/api/checkout-session/route.tsx`
- Checks if `adminKey` matches `ADMIN_TEST_KEY` environment variable
- Bypasses Stripe and creates group directly
- Returns `adminTest: true` with direct game URL

### Frontend (already implemented)
File: `app/[location]/[mode]/page.tsx`
- Detects `?admin=` URL parameter
- Sets `isAdminMode` state
- Shows testing badge instead of price
- Changes button styling to orange
- Redirects directly to game after group creation

## Security Notes

1. **Never share your admin key** - it's equivalent to free access
2. **Don't commit the key to git** - use environment variables only
3. **Use different keys for dev/staging/prod** if needed
4. **Consider IP restrictions** for additional security

## Troubleshooting

### "Invalid response" error
- Check that `ADMIN_TEST_KEY` is set in your environment
- Verify the key in URL exactly matches the environment variable
- Restart your server after adding the environment variable

### "Test game created but can't access"
- Check that cookies are enabled
- Verify the group was created in Supabase `groups` table
- Check browser console for errors

### Still going to Stripe
- Confirm URL has `?admin=` parameter with correct key
- Check that `isAdminMode` state is true (check console logs)
- Verify backend is receiving `adminKey` in request payload

## Database Pricing Update

Run this SQL in your Supabase dashboard to update pricing to £12.99:

```sql
UPDATE tracks 
SET price_per_person = 1299
WHERE price_per_person = 1500;
```

Price is stored in pence (smallest currency unit), so:
- £12.99 = 1299 pence
- £15.00 = 1500 pence
