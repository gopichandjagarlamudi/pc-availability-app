# PC Financial Availability App

A mobile-first Progressive Web App (PWA) for collecting employee availability at PC Financial locations.

## Features

### For Reps
- Simple name selection (no password required)
- Quick toggle for 14-day availability
- Auto-detects collection period (always 2 weeks in advance)
- Available = automatic 07:00-21:00 time slots
- Edit anytime before deadline
- Works offline with automatic sync
- Install to phone home screen

### For Managers
- Real-time submission tracking
- One-click CSV export in exact required format
- View pending and submitted reps
- Submission progress dashboard
- Simple access code protection

### Smart Date Logic
- **Week Structure**: Sunday to Saturday
- **Collection Cycle**: Always collect 2 weeks ahead
- **Auto-Lock**: Form locks after odd week ends (Sat 11:59 PM)
- **Auto-Unlock**: Opens Sunday of next odd week with new dates

#### Example Timeline
- **Week 1** (Dec 28 - Jan 3): Collect for Week 3-4 (Jan 11-24)
- **Week 2** (Jan 4-10): Submission period closed
- **Week 3** (Jan 11-17): Collect for Week 5-6 (Jan 25 - Feb 7)
- **Week 4** (Jan 18-24): Submission period closed
- Continues indefinitely...

## Quick Start

### 1. Installation
```bash
cd pc-availability-app
npm install
```

### 2. Setup Google Sheets
See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

Quick version:
1. Create Google Sheet
2. Add Apps Script from `scripts/googleAppsScript.js`
3. Get Spreadsheet ID and API Key
4. Make sheet publicly viewable

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Google Sheets credentials
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA Plugin
- **Database**: Google Sheets
- **Deployment**: Netlify / Vercel
- **Offline**: Service Worker + LocalStorage

## Project Structure

```
pc-availability-app/
├── src/
│   ├── components/
│   │   ├── RepForm.jsx           # Rep submission form
│   │   └── ManagerDashboard.jsx  # Manager view
│   ├── utils/
│   │   ├── dateCalculations.js   # Date logic
│   │   └── googleSheets.js       # API integration
│   ├── App.jsx                   # Main app
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── scripts/
│   └── googleAppsScript.js       # Google Sheets backend
├── public/                       # Static assets
├── index.html                    # HTML template
├── vite.config.js                # Vite + PWA config
├── tailwind.config.js            # Tailwind config
├── SETUP_GUIDE.md               # Detailed setup
└── README.md                     # This file
```

## Configuration

### Rep Names
Edit `src/App.jsx` line 8:
```javascript
const REP_NAMES = [
  'Employee 1',
  'Employee 2',
  // Add your reps here
].sort();
```

### Manager Code
Edit `src/App.jsx` line 32:
```javascript
const MANAGER_CODE = '1234'; // Change this
```

### Brand Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  'pc-blue': '#0066cc',
  'pc-dark': '#004c99',
  'pc-light': '#e6f2ff',
}
```

## CSV Export Format

Exact output format as requested:

```csv
Rep Name,Date,Start Time,End Time
John Smith,2026-01-11,07:00,21:00
John Smith,2026-01-12,07:00,21:00
Sarah Johnson,2026-01-11,07:00,21:00
```

**Note**: Only includes dates marked "Available". Excludes "Not Available" dates.

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Mobile browsers (iOS Safari, Chrome Android)

## Performance

- Initial load: < 2 seconds on mobile
- Subsequent loads: < 500ms (cached)
- Offline-capable
- Optimized for 3G networks

## Security

- Google Sheets API key restricted to Sheets API only
- Manager dashboard requires access code
- No sensitive data stored locally
- HTTPS enforced in production

## Offline Support

The app works offline:
1. Form caches in browser
2. Submissions save to LocalStorage
3. Auto-syncs when connection restored
4. Shows sync status to user

## Deployment

### Netlify (Recommended)
```bash
npm run build
# Upload dist/ folder to Netlify
# Add environment variables in Netlify dashboard
```

### Vercel
```bash
vercel
# Follow prompts
# Add environment variables in Vercel dashboard
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed deployment instructions.

## Usage

### Rep Workflow (< 60 seconds)
1. Open app
2. Select name
3. Toggle 14 days
4. Submit
5. Done!

### Manager Workflow
1. Tap manager icon
2. Enter code
3. View submissions
4. Download CSV
5. Done!

## Troubleshooting

**Data not saving?**
- Check Google Sheet sharing (must be public)
- Verify API key
- Check browser console

**Can't access manager view?**
- Default code: 1234
- Check `src/App.jsx` for current code

**CSV empty?**
- Ensure dates marked "Available"
- Check correct cycle ID
- Verify data in Google Sheet

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for more troubleshooting.

## Customization

Want to change something?
- **Time slots**: Edit `googleSheets.js` and `RepForm.jsx`
- **Collection period**: Edit `dateCalculations.js`
- **Colors**: Edit `tailwind.config.js`
- **Rep list**: Edit `App.jsx`

## Maintenance

### Regular Tasks
- Export CSV before deadlines
- Monitor submission rates
- Update rep names as needed

### Periodic Tasks
- Clean up old data (6+ months)
- Review and backup Google Sheet
- Update manager access code

## Future Enhancements

Potential additions:
- Email reminders for pending reps
- SMS notifications
- "Copy from last time" feature
- Analytics dashboard
- Multi-location support
- Custom time ranges per day

## License

MIT License - Feel free to use and modify

## Support

For issues:
1. Check Google Sheet data
2. Review browser console
3. Test in incognito mode
4. See SETUP_GUIDE.md

## Credits

Built with React, Vite, Tailwind CSS, and Google Sheets API.

---

**Made for PC Financial** | Mobile-first | Offline-capable | Fast & Simple
