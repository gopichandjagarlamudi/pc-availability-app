# PC Financial Availability App - Complete Index

## 📚 Documentation Guide

### Start Here
1. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Read this first! Complete project overview
2. **[QUICK_START.md](QUICK_START.md)** - Get running in 15 minutes
3. **[README.md](README.md)** - Project documentation and quick reference

### Setup & Deployment
4. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions (Google Sheets, API, etc.)
5. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide (Netlify, Vercel, etc.)
6. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and design decisions

### User Documentation
7. **[USER_GUIDE.md](USER_GUIDE.md)** - Instructions for reps and managers
8. **[INDEX.md](INDEX.md)** - This file - navigation guide

---

## 📁 File Structure

```
pc-availability-app/
│
├── 📄 Documentation (8 files)
│   ├── PROJECT_SUMMARY.md      ⭐ Start here - complete overview
│   ├── QUICK_START.md          ⚡ 15-minute setup guide
│   ├── README.md               📖 Main documentation
│   ├── SETUP_GUIDE.md          🔧 Detailed setup instructions
│   ├── DEPLOYMENT.md           🚀 Production deployment
│   ├── ARCHITECTURE.md         🏗️  Technical architecture
│   ├── USER_GUIDE.md           👥 End-user instructions
│   └── INDEX.md                📑 This navigation guide
│
├── 🎨 Source Code (7 files)
│   ├── src/
│   │   ├── components/
│   │   │   ├── RepForm.jsx              📱 Rep submission form
│   │   │   └── ManagerDashboard.jsx     📊 Manager dashboard
│   │   ├── utils/
│   │   │   ├── dateCalculations.js      📅 Date logic (2-week cycles)
│   │   │   └── googleSheets.js          ☁️  Google Sheets integration
│   │   ├── App.jsx                      🏠 Main application
│   │   ├── main.jsx                     🚪 React entry point
│   │   └── index.css                    🎨 Global styles (Tailwind)
│
├── ⚙️  Configuration (8 files)
│   ├── package.json             📦 Dependencies & scripts
│   ├── vite.config.js           ⚡ Build configuration + PWA
│   ├── tailwind.config.js       🎨 Styling configuration
│   ├── postcss.config.js        🔧 CSS processing
│   ├── netlify.toml             🌐 Netlify deployment config
│   ├── vercel.json              ▲ Vercel deployment config
│   ├── .env.example             🔐 Environment variable template
│   └── .gitignore               🚫 Git exclusions
│
├── 🌐 Public Assets (4 files)
│   ├── public/
│   │   ├── manifest.json        📱 PWA configuration
│   │   ├── robots.txt           🤖 SEO configuration
│   │   └── .gitkeep             📝 Icon instructions
│   └── index.html               📄 HTML entry point
│
└── 🛠️  Scripts (1 file)
    └── scripts/
        └── googleAppsScript.js  ☁️  Google Sheets backend code
```

---

## 🎯 Quick Navigation

### I want to...

#### Get Started
- **Setup the app quickly** → [QUICK_START.md](QUICK_START.md)
- **Understand the project** → [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **See all features** → [README.md](README.md#features)

#### Setup & Configuration
- **Setup Google Sheets** → [SETUP_GUIDE.md](SETUP_GUIDE.md#step-1-google-sheets-setup)
- **Configure environment** → [SETUP_GUIDE.md](SETUP_GUIDE.md#step-2-local-development-setup)
- **Customize rep names** → [SETUP_GUIDE.md](SETUP_GUIDE.md#23-customize-rep-names)
- **Change colors/branding** → [SETUP_GUIDE.md](SETUP_GUIDE.md#change-brand-colors)

#### Deployment
- **Deploy to Netlify** → [DEPLOYMENT.md](DEPLOYMENT.md#option-1-netlify-recommended)
- **Deploy to Vercel** → [DEPLOYMENT.md](DEPLOYMENT.md#option-2-vercel)
- **Setup environment variables** → [DEPLOYMENT.md](DEPLOYMENT.md#environment-variables-reference)
- **Configure custom domain** → [DEPLOYMENT.md](DEPLOYMENT.md#option-1-netlify-recommended)

#### Development
- **Understand architecture** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **See data flow** → [ARCHITECTURE.md](ARCHITECTURE.md#data-flow)
- **Review components** → [ARCHITECTURE.md](ARCHITECTURE.md#component-architecture)
- **Understand date logic** → [ARCHITECTURE.md](ARCHITECTURE.md#date-calculation-logic)

#### User Support
- **Rep instructions** → [USER_GUIDE.md](USER_GUIDE.md#for-reps-submitting-your-availability)
- **Manager instructions** → [USER_GUIDE.md](USER_GUIDE.md#for-managers-using-the-dashboard)
- **Install PWA on phone** → [USER_GUIDE.md](USER_GUIDE.md#installing-the-app-on-your-phone)
- **Download CSV** → [USER_GUIDE.md](USER_GUIDE.md#downloading-csv)

#### Troubleshooting
- **Data not saving** → [SETUP_GUIDE.md](SETUP_GUIDE.md#troubleshooting)
- **Deployment issues** → [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting-deployment)
- **User FAQs** → [USER_GUIDE.md](USER_GUIDE.md#faqs)

#### Customization
- **Change rep names** → `src/App.jsx` line 8
- **Change manager code** → `src/App.jsx` line 32
- **Change colors** → `tailwind.config.js`
- **Modify time ranges** → `src/utils/googleSheets.js` + `src/components/RepForm.jsx`
- **Update date logic** → `src/utils/dateCalculations.js`

---

## 📋 Code Files Reference

### React Components

#### `src/App.jsx`
- **Purpose**: Main application component
- **Key Features**:
  - View management (rep vs manager)
  - Google API initialization
  - Manager authentication modal
  - Rep names configuration
- **Lines to Customize**:
  - Line 8: `REP_NAMES` array
  - Line 32: `MANAGER_CODE`

#### `src/components/RepForm.jsx`
- **Purpose**: Rep availability submission form
- **Key Features**:
  - 14-day calendar view
  - Quick actions (All Available/Unavailable)
  - Offline support
  - Deadline enforcement
  - Auto-lock functionality
- **Dependencies**:
  - `dateCalculations.js`
  - `googleSheets.js`

#### `src/components/ManagerDashboard.jsx`
- **Purpose**: Manager view and CSV export
- **Key Features**:
  - Submission statistics
  - Progress tracking
  - CSV download
  - Pending/submitted lists
  - Real-time refresh
- **Dependencies**:
  - `dateCalculations.js`
  - `googleSheets.js`

### Utility Functions

#### `src/utils/dateCalculations.js`
- **Purpose**: Smart date calculation logic
- **Key Functions**:
  - `getCollectionPeriod()` - Calculate which 2 weeks to collect
  - `isSubmissionLocked()` - Check if form should be locked
  - `getCollectionDates()` - Get array of 14 dates
  - `formatDateDisplay()` - Format for UI display
  - `formatDateStorage()` - Format for database storage
- **Logic**: Perpetual 2-week cycles, always 2 weeks ahead

#### `src/utils/googleSheets.js`
- **Purpose**: Google Sheets API integration
- **Key Functions**:
  - `submitAvailability()` - Save submission to Sheets
  - `getRepAvailability()` - Load existing submission
  - `getAllSubmissions()` - Get all submissions for cycle
  - `saveToLocalStorage()` - Offline storage
  - `getFromLocalStorage()` - Offline retrieval
- **Features**: Online/offline sync, automatic retry

### Styling

#### `src/index.css`
- **Purpose**: Global styles and Tailwind imports
- **Features**:
  - Tailwind CSS imports
  - Custom scrollbar
  - Mobile optimizations
  - iOS safe area handling
  - Touch optimizations

### Backend Script

#### `scripts/googleAppsScript.js`
- **Purpose**: Google Sheets backend functionality
- **Key Functions**:
  - `setupSheet()` - Initial sheet setup
  - `generateCSV()` - Export CSV data
  - `getSubmissionStats()` - Calculate statistics
  - `cleanupOldData()` - Remove old records
  - `onOpen()` - Create custom menu
- **Usage**: Copy to Google Sheets Apps Script editor

---

## 🔧 Configuration Files

### `package.json`
- Dependencies: React, Vite, Tailwind
- Scripts: `dev`, `build`, `preview`
- DevDependencies: Build tools

### `vite.config.js`
- Vite configuration
- PWA plugin setup
- Service worker configuration
- Build optimization

### `tailwind.config.js`
- Custom colors (pc-blue, pc-dark, pc-light)
- Content paths
- Theme extensions

### `.env.example`
- Template for environment variables
- Required: `VITE_SPREADSHEET_ID`, `VITE_GOOGLE_API_KEY`

### `netlify.toml` / `vercel.json`
- Deployment configurations
- Build commands
- Redirect rules

---

## 🚀 Common Tasks

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment

```bash
# Deploy to Netlify
npm run build
netlify deploy --prod

# Deploy to Vercel
vercel
```

### Testing

```bash
# Test locally
npm run dev
# Visit http://localhost:5173

# Test production build
npm run build
npm run preview
# Visit http://localhost:4173
```

---

## 📊 Feature Checklist

### Core Features
- [x] Rep name selection
- [x] 14-day availability toggle
- [x] Auto-detect collection period
- [x] Form auto-lock after deadline
- [x] Manager dashboard
- [x] CSV export (exact format)
- [x] Offline support
- [x] PWA installable
- [x] Mobile-optimized

### Date Logic
- [x] Sunday-Saturday weeks
- [x] 2-week collection cycles
- [x] Always 2 weeks in advance
- [x] Odd week = submission period
- [x] Even week = locked period
- [x] Auto-calculate dates

### Technical
- [x] Google Sheets integration
- [x] LocalStorage fallback
- [x] Service Worker caching
- [x] Responsive design
- [x] Fast load times (<2s)
- [x] Cross-browser support

### Security
- [x] HTTPS enforced
- [x] API key restricted
- [x] Manager access code
- [x] No sensitive data stored
- [x] XSS protection

---

## 📞 Support Resources

### For Developers
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Setup**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

### For Managers
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md#for-managers-using-the-dashboard)
- **CSV Export**: [USER_GUIDE.md](USER_GUIDE.md#downloading-csv)
- **Troubleshooting**: [SETUP_GUIDE.md](SETUP_GUIDE.md#troubleshooting)

### For Reps
- **Submission Guide**: [USER_GUIDE.md](USER_GUIDE.md#for-reps-submitting-your-availability)
- **PWA Installation**: [USER_GUIDE.md](USER_GUIDE.md#installing-the-app-on-your-phone)
- **FAQs**: [USER_GUIDE.md](USER_GUIDE.md#faqs)

---

## 🎓 Learning Path

### Beginner (Just getting started)
1. Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
2. Follow [QUICK_START.md](QUICK_START.md)
3. Deploy to production
4. Share [USER_GUIDE.md](USER_GUIDE.md) with team

### Intermediate (Customizing the app)
1. Review [README.md](README.md)
2. Customize colors, names, codes
3. Understand [ARCHITECTURE.md](ARCHITECTURE.md)
4. Modify components as needed

### Advanced (Extending functionality)
1. Study [ARCHITECTURE.md](ARCHITECTURE.md) deeply
2. Understand date calculation logic
3. Review Google Sheets integration
4. Add new features
5. Optimize performance

---

## 🔄 Update Guide

### When to Update

#### Regularly (Weekly)
- Monitor submissions
- Export CSV files
- Check performance

#### Occasionally (Monthly)
- Review rep names list
- Update manager code
- Check for security updates

#### Rarely (Quarterly)
- Run `npm update`
- Review analytics
- Clean old data
- Optimize performance

### How to Update

#### Rep Names
1. Edit `src/App.jsx` line 8
2. Update array
3. Rebuild: `npm run build`
4. Deploy

#### Manager Code
1. Edit `src/App.jsx` line 32
2. Change string
3. Rebuild and deploy

#### Dependencies
```bash
npm update
npm run build
# Test locally
npm run preview
# Deploy if all good
```

---

## 📈 Metrics to Track

### Performance
- Page load time (target: <2s)
- Time to interactive (target: <3s)
- Lighthouse score (target: >90)

### Usage
- Submissions per week
- Submission completion rate
- CSV downloads
- Offline usage rate

### Reliability
- Error rate
- Failed submissions
- Sync issues
- Browser compatibility

---

## 🛡️ Security Checklist

- [ ] API key restricted to Google Sheets API
- [ ] API key restricted to production domain
- [ ] Google Sheet set to view-only public
- [ ] HTTPS enforced
- [ ] Manager code changed from default
- [ ] Environment variables in hosting dashboard (not in code)
- [ ] No sensitive data in LocalStorage
- [ ] Dependencies up to date

---

## ✅ Pre-Launch Checklist

### Technical
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Google Sheet setup complete
- [ ] Apps Script installed
- [ ] Rep names updated
- [ ] Manager code changed
- [ ] Tested locally
- [ ] Tested in production
- [ ] PWA installable
- [ ] Works offline

### Documentation
- [ ] USER_GUIDE.md shared with team
- [ ] Manager trained on dashboard
- [ ] Reps know how to submit
- [ ] Support contact established

### Deployment
- [ ] Deployed to hosting platform
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled
- [ ] Environment variables set
- [ ] Monitoring setup

---

## 🎉 You're Ready!

Everything you need is here. Follow the docs, customize as needed, and launch!

**Questions?** Check the relevant documentation file above.

**Issues?** See troubleshooting sections in SETUP_GUIDE.md and DEPLOYMENT.md.

**Ready to start?** Go to [QUICK_START.md](QUICK_START.md) now!

---

**Project Version**: 1.0.0
**Last Updated**: January 2026
**Built for**: PC Financial
