# Quick Start Guide

Get up and running in 15 minutes!

## Step 1: Google Sheet Setup (5 min)

1. Create a new Google Sheet: https://sheets.google.com
2. Copy the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_ID_HERE/edit
   ```
3. Click **Extensions > Apps Script**
4. Copy everything from `scripts/googleAppsScript.js` and paste it
5. Save, then run `setupSheet` function (authorize when asked)
6. Click **Share** button, set to "Anyone with the link - Viewer"

## Step 2: Get Google API Key (3 min)

1. Go to: https://console.cloud.google.com
2. Create new project (or select existing)
3. Enable **Google Sheets API**
4. Create Credentials > API Key
5. Restrict key to Google Sheets API only
6. Copy the API key

## Step 3: Local Setup (2 min)

```bash
cd pc-availability-app
npm install
cp .env.example .env
```

Edit `.env`:
```
VITE_SPREADSHEET_ID=paste_your_sheet_id
VITE_GOOGLE_API_KEY=paste_your_api_key
```

## Step 4: Customize (2 min)

Edit `src/App.jsx` (line 8):
```javascript
const REP_NAMES = [
  'Your Rep 1',
  'Your Rep 2',
  'Your Rep 3',
].sort();
```

Change manager code (line 32):
```javascript
const MANAGER_CODE = 'your-code';
```

## Step 5: Test Locally (2 min)

```bash
npm run dev
```

Open http://localhost:5173

Test:
1. Select a rep name
2. Toggle some days
3. Submit
4. Check Google Sheet - data should appear!

## Step 6: Deploy (1 min)

### Option A: Netlify
```bash
npm run build
```
Drag `dist` folder to https://app.netlify.com/drop

### Option B: Vercel
```bash
npm install -g vercel
vercel
```

Don't forget to add environment variables in the hosting dashboard!

## That's It!

Your app is live. Share the URL with your team!

## Next Steps

- Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed configuration
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment options
- Customize colors in `tailwind.config.js`
- Add your logo/branding

## Need Help?

Common issues:
- **Data not saving**: Check Google Sheet is public (Anyone with link - Viewer)
- **Stuck on loading**: Verify API key and Sheet ID
- **Manager view locked**: Default code is `1234`

Check the troubleshooting section in SETUP_GUIDE.md for more help.
