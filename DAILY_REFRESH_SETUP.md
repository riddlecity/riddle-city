# Daily Opening Hours Refresh Setup

## Option 1: Vercel Cron Jobs (Recommended if using Vercel)

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/refresh-hours",
      "schedule": "0 3 * * *"
    }
  ]
}
```

## Option 2: Manual Cron (Linux/Mac server)

Add to crontab (`crontab -e`):

```bash
# Run daily at 3 AM UK time (adjust for your timezone)
0 3 * * * curl -X POST "https://yourapp.com/api/refresh-hours" -H "x-admin-key: riddle-city-refresh-2025"
```

## Option 3: GitHub Actions (if using GitHub)

Create `.github/workflows/daily-refresh.yml`:

```yaml
name: Daily Opening Hours Refresh
on:
  schedule:
    - cron: '0 3 * * *' # 3 AM daily
  workflow_dispatch: # Allow manual trigger

jobs:
  refresh-hours:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh Opening Hours
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/refresh-hours" \
            -H "x-admin-key: ${{ secrets.REFRESH_KEY }}" \
            -H "Content-Type: application/json"
```

## Option 4: Manual Testing

Test the endpoint manually:

```bash
# Test endpoint
curl -X GET "http://localhost:3000/api/refresh-hours"

# Trigger refresh (development)
curl -X POST "http://localhost:3000/api/refresh-hours" \
  -H "x-admin-key: riddle-city-refresh-2025" \
  -H "Content-Type: application/json"

# Trigger refresh (production)
curl -X POST "https://yourapp.com/api/refresh-hours" \
  -H "x-admin-key: riddle-city-refresh-2025" \
  -H "Content-Type: application/json"
```

## Performance Notes

- **Scraping Speed**: 1-3 seconds per location
- **Batch Size**: 3 locations at a time (respectful to Google)
- **Delay**: 3 seconds between batches
- **Total Time**: ~20-30 minutes for 50 locations
- **Cost**: FREE! 🎉

## Benefits

✅ **Free**: No API costs
✅ **Accurate**: Daily updates
✅ **Automatic**: Runs in background  
✅ **Fast for users**: Data pre-cached
✅ **Reliable**: Fallback to existing cache if scraping fails
✅ **Bank holiday support**: Google Maps shows temporary closures

## Monitoring

Check logs after the daily run:
- Success count
- Error details
- Total processing time
- Any failed locations for manual review
