# Testing Guide

## Quick Test (Without Google Sheets)

You can test the app locally without setting up Google Sheets first. It will work in offline mode.

### Step 1: Start Development Server

```bash
cd /Users/gopichandjagarlamudi/Documents/pc-availability-app
npm run dev
```

The app will open at: **http://localhost:5173**

### Step 2: Test Rep Submission Flow

1. **Open the app** in your browser (http://localhost:5173)

2. **Select a rep name** from the dropdown

3. **Toggle some days:**
   - Click on days to mark them as Available (green)
   - Click again to mark as Not Available (gray)

4. **Try quick actions:**
   - Click "All Available" - all days turn green
   - Click "All Unavailable" - all days turn gray

5. **Submit:**
   - Click the blue "Submit Availability" button
   - You should see "Saved locally. Will sync when online."
   - This is normal without Google Sheets - data saves to browser

6. **Edit submission:**
   - Select the same rep name again
   - Change some days
   - Submit again - it should update

### Step 3: Test Manager Dashboard

1. **Click the manager icon** (bottom right - circle with person)

2. **Enter access code:** `1234` (default)

3. **View dashboard:**
   - Shows 0/20 submitted (because no Google Sheets yet)
   - You'll see stats cards and pending reps

4. **Click "Refresh"** - updates the counts

5. **Try CSV download** - will work but be empty without Google Sheets

### Step 4: Test Locked Form

The form automatically locks based on the current date. To test:

1. Check the current period displayed at top
2. Note the deadline shown
3. The form locks after Saturday 11:59 PM of odd weeks

**To test the locked state manually:**
- Open DevTools (F12)
- Console tab
- Type: `localStorage.setItem('testLocked', 'true')`
- Refresh page - you'll see the locked screen

### Step 5: Test Offline Mode

1. **Submit availability** for a rep

2. **Open DevTools** (F12 or Cmd+Option+I on Mac)

3. **Network tab** → Check "Offline"

4. **Try submitting again:**
   - Should show "Saved locally. Will sync when online."
   - Data saves to browser's LocalStorage

5. **Turn network back on:**
   - Uncheck "Offline"
   - Normally would sync to Google Sheets

### Step 6: Test Mobile View

1. **Open DevTools** (F12)

2. **Toggle device toolbar** (Ctrl+Shift+M or Cmd+Shift+M)

3. **Select device:**
   - iPhone 12/13/14
   - Samsung Galaxy
   - Pixel 5

4. **Test touch interactions:**
   - Tap on days to toggle
   - Scroll through the form
   - Submit button should be easily tappable

### Step 7: Test PWA Installation

**Chrome/Edge:**
1. Look for install icon in address bar (+ or computer icon)
2. Click it
3. Click "Install"
4. App opens in standalone window

**Note:** PWA features work best in production build

## What to Check

### ✅ Rep Form Tests
- [ ] Can select rep name
- [ ] Days toggle on/off correctly
- [ ] "All Available" selects all days
- [ ] "All Unavailable" clears all days
- [ ] Submit button works
- [ ] Success message appears
- [ ] Can edit and resubmit
- [ ] Form shows correct dates
- [ ] Deadline is displayed

### ✅ Manager Dashboard Tests
- [ ] Can access with code "1234"
- [ ] Wrong code shows error
- [ ] Stats cards display
- [ ] Pending reps list shows
- [ ] Refresh button works
- [ ] CSV download works
- [ ] Can return to rep view

### ✅ Mobile Tests
- [ ] Form fits on screen
- [ ] Touch targets are large enough
- [ ] No horizontal scroll
- [ ] Readable font sizes
- [ ] Buttons easy to tap

### ✅ Offline Tests
- [ ] Form loads offline
- [ ] Can submit offline
- [ ] "Saved locally" message appears
- [ ] Data persists in LocalStorage

## Full Test (With Google Sheets)

To test with real Google Sheets integration:

### 1. Setup Google Sheets

Follow **SETUP_GUIDE.md** Step 1 to:
- Create Google Sheet
- Add Apps Script
- Get Spreadsheet ID
- Enable API
- Get API Key
- Make sheet public

### 2. Update .env

Replace placeholder values:
```
VITE_SPREADSHEET_ID=your_real_spreadsheet_id
VITE_GOOGLE_API_KEY=your_real_api_key
```

### 3. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4. Test Real Submission

1. Select a rep name
2. Toggle some days
3. Click Submit
4. **Check Google Sheet** - you should see data appear!

### 5. Test Manager CSV

1. Access manager dashboard (code: 1234)
2. Click "Download CSV"
3. Open the CSV file
4. Verify format:
   ```csv
   Rep Name,Date,Start Time,End Time
   John Smith,2026-01-11,07:00,21:00
   ```

## Testing Checklist by Feature

### Date Calculations
- [ ] Current period shows correct weeks
- [ ] Dates are Sunday to Saturday
- [ ] Shows 14 consecutive days
- [ ] Deadline is correct (Saturday 11:59 PM)
- [ ] Form locks after deadline
- [ ] Shows next open date when locked

### Data Persistence
- [ ] Submission saves
- [ ] Can reload and see previous submission
- [ ] Edit overwrites previous submission
- [ ] Multiple reps can submit
- [ ] Data persists in Google Sheet

### CSV Export
- [ ] Downloads correct format
- [ ] Only includes "Available" days
- [ ] Excludes "Not Available" days
- [ ] Sorted by rep name, then date
- [ ] Times are always 07:00-21:00

### Error Handling
- [ ] Shows error if no name selected
- [ ] Handles network errors gracefully
- [ ] Shows offline mode message
- [ ] Prevents submission without selecting rep

## Browser Testing

Test in these browsers:

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Chrome on Android
- [ ] Samsung Internet

## Performance Testing

1. **Load Time:**
   - Open DevTools → Network tab
   - Hard refresh (Cmd+Shift+R)
   - Check load time (should be < 2 seconds)

2. **Lighthouse Audit:**
   - Open DevTools
   - Lighthouse tab
   - Run audit on mobile
   - Check scores (target: 90+)

## Common Issues During Testing

### "Loading..." stuck
**Fix:** Google API key might be invalid. For local testing without Sheets, this is normal - just wait or check browser console.

### Data not appearing in Google Sheet
**Fix:**
- Check Sheet sharing settings (must be public)
- Verify API key
- Check VITE_SPREADSHEET_ID is correct
- Look in browser console for errors

### Form shows wrong dates
**Fix:** Date calculations are based on current date. Ensure system date is correct.

### Manager code not working
**Fix:** Default is "1234". Check `src/App.jsx` line 32 for current code.

## Testing Without Internet

1. **Submit availability** while online
2. **Disconnect from internet**
3. **Refresh the page** - should still load (service worker)
4. **Submit again** - should save locally
5. **Reconnect** - should attempt to sync

## Quick Fixes for Testing

### Reset LocalStorage
```javascript
// In browser console (F12)
localStorage.clear()
location.reload()
```

### View Saved Data
```javascript
// In browser console
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key, JSON.parse(localStorage.getItem(key)));
}
```

### Change Current Date (for testing)
The app uses system date. To test different weeks, temporarily modify your system date.

## Production Build Testing

Test the production build locally:

```bash
npm run build
npm run preview
```

Opens at: **http://localhost:4173**

This simulates production environment with:
- Minified code
- Service worker active
- PWA features enabled

## Automated Testing (Optional)

For future development, you can add:
- Unit tests with Vitest
- E2E tests with Playwright
- Component tests with React Testing Library

## Ready for Production?

Before deploying, ensure:
- [ ] All tests passing
- [ ] Google Sheets working
- [ ] CSV export correct
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] No console errors
- [ ] Performance good (Lighthouse > 90)

---

**Happy Testing!**

For issues, check:
- Browser console (F12) for errors
- Network tab for failed requests
- Application tab → LocalStorage for saved data
- Google Sheet for submission data
