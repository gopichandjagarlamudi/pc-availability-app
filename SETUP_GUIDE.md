# PC Financial Availability App - Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- Google Account
- Netlify or Vercel account (free tier)

## Step 1: Google Sheets Setup

### 1.1 Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "PC Financial Availability"
4. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

### 1.2 Setup Apps Script
1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Copy the entire contents of `scripts/googleAppsScript.js`
4. Paste it into the Apps Script editor
5. Click **Save** (disk icon)
6. Name the project "PC Availability Script"
7. Run the `setupSheet` function:
   - Select `setupSheet` from the function dropdown
   - Click **Run**
   - Authorize the script when prompted
   - You should see "Sheet setup complete!"

### 1.3 Enable Google Sheets API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services > Library"
   - Search for "Google Sheets API"
   - Click **Enable**

### 1.4 Create API Key
1. Go to "APIs & Services > Credentials"
2. Click **Create Credentials > API Key**
3. Copy the API key
4. Click **Restrict Key**:
   - Under "API restrictions", select "Restrict key"
   - Check "Google Sheets API"
   - Click **Save**

### 1.5 Make Sheet Public (Read-Only)
1. In your Google Sheet, click **Share**
2. Under "General access", select "Anyone with the link"
3. Set permission to "Viewer"
4. Click **Done**

## Step 2: Local Development Setup

### 2.1 Install Dependencies
```bash
cd pc-availability-app
npm install
```

### 2.2 Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Choose one backend:

   **Option A: Google Sheets**
   ```
   VITE_SPREADSHEET_ID=your_spreadsheet_id_from_step_1.1
   VITE_GOOGLE_API_KEY=your_api_key_from_step_1.4
   ```

   **Option B: Supabase (Auth + Postgres)**
   1. Create a Supabase project
   2. In Supabase SQL Editor, run `SUPABASE_SCHEMA.sql`
   3. Copy your Project URL + anon key into `.env`:
      ```
      VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
      VITE_SUPABASE_ANON_KEY=your_anon_key
      ```
   4. (Optional) Create a manager user:
      - Supabase Dashboard → Authentication → Users → select a user
      - Set `app_metadata` to include: `{ "role": "manager" }`
   5. Restrict rep signups (recommended):
      - Keep `VITE_REP_SIGNUP_ENABLED=true` (default)
      - As a manager, open the app → Manager dashboard → **Permitted Reps** and add rep emails.
      - Only permitted emails can create rep accounts (enforced in `SUPABASE_SCHEMA.sql`).
      - To disable rep self-signup completely: set `VITE_REP_SIGNUP_ENABLED=false` and create rep users in Supabase.
   6. (Optional) Enable manager XLSX exports:
      - Place the template files in your repo root (same level as `package.json`) OR set:
        - `EXPORT_REP_TEMPLATE_PATH`
        - `EXPORT_AVAIL_TEMPLATE_PATH`
      - The Manager dashboard has:
        - **Download Rep Table** → `GET /manager/export/rep-table`
        - **Download Availability** → `GET /manager/export/availability`
   7. (Optional) Enable rep address → lat/lng auto-fill:
      - Default uses OpenStreetMap Nominatim (no API key).
      - Set `GEOCODER_BASE_URL` / `GEOCODER_USER_AGENT` (see `.env.example`).

### 2.3 Customize Rep Names
1. Open `src/App.jsx`
2. Find the `REP_NAMES` array (around line 8)
3. Replace with your actual employee names:
   ```javascript
   const REP_NAMES = [
     'Employee Name 1',
     'Employee Name 2',
     // ... add all your reps
   ].sort();
   ```

### 2.4 Change Manager Access Code (Optional)
1. In `src/App.jsx`, find line 32:
   ```javascript
   const MANAGER_CODE = '1234';
   ```
2. Change '1234' to your preferred code

### 2.5 Run Development Server
```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Step 3: Testing

### 3.1 Test Rep Submission
1. Select a rep name from the dropdown
2. Toggle some days to "Available"
3. Click "Submit Availability"
4. Check your Google Sheet - data should appear

### 3.2 Test Manager Dashboard
**Google Sheets mode**
1. Click the manager icon (bottom right)
2. Enter access code (default: 1234)
3. Verify submission count
4. Test CSV download

**Supabase mode**
1. Sign in with a manager account (user has `app_metadata.role = "manager"`)
2. Verify rep list + submission status
3. Test **Download Rep Table** and **Download Availability**

### 3.3 Test Offline Mode
1. Open browser DevTools
2. Go to Network tab
3. Select "Offline"
4. Submit availability - should save locally
5. Go back online - data syncs

## Step 4: Production Deployment

### Option A: Deploy to Netlify

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Go to [Netlify](https://www.netlify.com)
   - Click "Add new site > Import an existing project"
   - Connect your Git repository OR drag & drop the `dist` folder

3. **Configure Environment Variables**:
   - Go to Site settings > Environment variables
   - Add:
     - `VITE_SPREADSHEET_ID`
     - `VITE_GOOGLE_API_KEY`

4. **Deploy Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Option B: Deploy to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Add Environment Variables**:
   - Go to your project settings on Vercel
   - Add environment variables:
     - `VITE_SPREADSHEET_ID`
     - `VITE_GOOGLE_API_KEY`

4. **Redeploy** to apply environment variables

## Step 5: Mobile Installation (PWA)

### iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

### Android
1. Open the app in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home Screen"
4. Tap "Add"

## Step 6: Using the App

### For Reps
1. Open the app
2. Select your name
3. Toggle days you're available (07:00-21:00 automatic)
4. Tap "Submit Availability"
5. You can edit anytime before the deadline

### For Managers
1. Tap the manager icon (bottom right)
2. Enter access code
3. View submission status
4. Download CSV with all available shifts
5. See list of pending reps

## Google Apps Script Tools

Access these from your Google Sheet:
- **Availability Tools > Generate CSV Export**: Create a CSV sheet for a specific cycle
- **Availability Tools > View Submission Stats**: See statistics for a cycle
- **Availability Tools > Clean Up Old Data**: Remove submissions older than 6 months

## Troubleshooting

### Data not saving
- Check Google Sheet sharing settings (must be "Anyone with the link")
- Verify API key restrictions (must allow Google Sheets API)
- Check browser console for errors

### "Loading..." stuck
- Check internet connection
- Verify VITE_GOOGLE_API_KEY is correct
- Check if Google Sheets API is enabled

### CSV download empty
- Ensure reps marked days as "Available" (not just submitted)
- Check you're using the correct Cycle ID
- Verify data exists in Google Sheet

### Manager access not working
- Default code is '1234'
- Check `src/App.jsx` line 32 for current code
- Code is case-sensitive

## Customization

### Change Brand Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  'pc-blue': '#YOUR_COLOR',
  'pc-dark': '#YOUR_DARK_COLOR',
  'pc-light': '#YOUR_LIGHT_COLOR',
}
```

### Modify Time Range
Currently hardcoded to 07:00-21:00. To change:
1. Edit `src/utils/googleSheets.js` line 28
2. Edit `src/components/RepForm.jsx` line 184

### Add Email Notifications
Integrate with a service like:
- SendGrid (free tier: 100 emails/day)
- Mailgun (free tier: 5,000 emails/month)
- EmailJS (free tier: 200 emails/month)

## Support

For issues or questions:
1. Check the Google Sheet for data
2. Review browser console for errors
3. Verify environment variables are set
4. Test in incognito mode to rule out cache issues

## Maintenance

### Weekly Tasks
- Monitor submission rates
- Export CSV files before deadlines
- Check for pending submissions

### Monthly Tasks
- Review and update rep names list
- Check Google Sheets API quota usage
- Backup Google Sheet data

### As Needed
- Clean up old data (6+ months)
- Update manager access code
- Modify collection periods if schedule changes
