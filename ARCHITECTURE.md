# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DEVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   iPhone     │  │   Android    │  │   Desktop    │     │
│  │   Safari     │  │    Chrome    │  │    Browser   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    HOSTING LAYER                             │
│              (Netlify / Vercel / CDN)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Static Files (React App)                   │    │
│  │  • index.html                                      │    │
│  │  • JavaScript bundles (React components)           │    │
│  │  • CSS (Tailwind)                                  │    │
│  │  • Service Worker (PWA)                            │    │
│  │  • Manifest.json (PWA config)                      │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
┌─────────────────────┐         ┌──────────────────────┐
│   CLIENT STORAGE    │         │   GOOGLE SHEETS API  │
│   (Offline Mode)    │         │                      │
│                     │         │  ┌────────────────┐  │
│  • LocalStorage     │◄────────┤  │ Spreadsheet    │  │
│  • Service Worker   │  Sync   │  │ (Database)     │  │
│    Cache           │         │  └────────────────┘  │
│                     │         │                      │
│                     │         │  ┌────────────────┐  │
│                     │         │  │ Apps Script    │  │
│                     │         │  │ (CSV Export)   │  │
│                     │         │  └────────────────┘  │
└─────────────────────┘         └──────────────────────┘
```

## Data Flow

### Rep Submission Flow

```
1. Rep opens app
   │
   ├─ Online
   │  └─► Load from Google Sheets API
   │
   └─ Offline
      └─► Load from LocalStorage

2. Rep selects name & toggles days
   │
   └─► Updates local state (React)

3. Rep clicks Submit
   │
   ├─ Online
   │  ├─► Save to Google Sheets
   │  └─► Save to LocalStorage (backup)
   │
   └─ Offline
      └─► Save to LocalStorage
          └─► Auto-sync when online

4. Confirmation shown
   │
   └─► Success message displayed
```

### Manager Dashboard Flow

```
1. Manager clicks manager icon
   │
   └─► Access code prompt

2. Manager enters code
   │
   ├─ Correct
   │  └─► Show dashboard
   │
   └─ Incorrect
      └─► Error message

3. Dashboard loads data
   │
   └─► Fetch from Google Sheets API
       ├─► All submissions
       └─► Calculate stats

4. Manager clicks "Download CSV"
   │
   └─► Process data
       ├─► Filter: only "Available"
       ├─► Format: Rep,Date,Start,End
       ├─► Sort: by rep name, then date
       └─► Download file
```

## Component Architecture

```
App.jsx (Root)
│
├─► State Management
│   ├─ view: 'rep' | 'manager'
│   ├─ apiReady: boolean
│   └─ showManagerAuth: boolean
│
├─► Google API Initialization
│   └─ Load gapi script → init Sheets API
│
├─ View: Rep
│  │
│  └─► RepForm.jsx
│      ├─ Props: repNames[]
│      ├─ State:
│      │  ├─ selectedRep
│      │  ├─ availability{}
│      │  ├─ loading
│      │  ├─ submitted
│      │  └─ error
│      ├─ Utils:
│      │  ├─ dateCalculations.js
│      │  │  ├─ getCollectionPeriod()
│      │  │  ├─ getCollectionDates()
│      │  │  ├─ isSubmissionLocked()
│      │  │  └─ formatDates()
│      │  └─ googleSheets.js
│      │     ├─ submitAvailability()
│      │     ├─ getRepAvailability()
│      │     ├─ saveToLocalStorage()
│      │     └─ getFromLocalStorage()
│      └─ UI:
│         ├─ Header (period info)
│         ├─ Deadline notice
│         ├─ Rep selection
│         ├─ Quick actions
│         ├─ Day toggles (14 days)
│         └─ Submit button
│
└─ View: Manager
   │
   └─► ManagerDashboard.jsx
       ├─ Props: repNames[], onBackToRep()
       ├─ State:
       │  ├─ submissions[]
       │  ├─ submittedReps[]
       │  ├─ loading
       │  └─ downloading
       ├─ Utils:
       │  ├─ dateCalculations.js
       │  └─ googleSheets.js
       │     ├─ getAllSubmissions()
       │     └─ getSubmittedReps()
       └─ UI:
          ├─ Header
          ├─ Stats cards (total, submitted, pending)
          ├─ Progress bar
          ├─ Download CSV button
          ├─ Refresh button
          ├─ Pending list
          └─ Submitted list
```

## Date Calculation Logic

```
Reference Date: Jan 4, 2026 (Week 1 starts)

Week Calculation:
┌──────────────┬──────────────┬────────────────────┐
│ Week Number  │    Dates     │  Collection Period │
├──────────────┼──────────────┼────────────────────┤
│ Week 1 (odd) │ Jan 4-10     │ Collect W3-4       │
│ Week 2 (even)│ Jan 11-17    │ LOCKED             │
│ Week 3 (odd) │ Jan 18-24    │ Collect W5-6       │
│ Week 4 (even)│ Jan 25-31    │ LOCKED             │
│ Week 5 (odd) │ Feb 1-7      │ Collect W7-8       │
│ Week 6 (even)│ Feb 8-14     │ LOCKED             │
└──────────────┴──────────────┴────────────────────┘

Formula:
- weekNumber = floor((currentDate - referenceDate) / 7) + 1
- isOddWeek = weekNumber % 2 === 1
- collectionWeekStart = weekNumber + 2
- collectionWeekEnd = weekNumber + 3
```

## State Management

### Client-Side State (React)

```javascript
// App Level
{
  view: 'rep' | 'manager',
  apiReady: boolean,
  showManagerAuth: boolean,
  managerInput: string
}

// RepForm Level
{
  selectedRep: string,
  availability: {
    '2026-01-11': true,
    '2026-01-12': false,
    // ... 14 days
  },
  loading: boolean,
  submitted: boolean,
  error: string,
  isLocked: boolean
}

// ManagerDashboard Level
{
  submissions: [
    {
      repName: string,
      timestamp: string,
      availability: {...}
    }
  ],
  submittedReps: string[],
  loading: boolean,
  downloading: boolean
}
```

### LocalStorage (Offline)

```javascript
// Key format: availability_{cycleId}_{repName}
{
  'availability_W3-4_John Smith': {
    repName: 'John Smith',
    availability: { ... },
    cycleId: 'W3-4',
    timestamp: '2026-01-05T10:30:00Z',
    synced: false
  }
}
```

### Google Sheets (Database)

```
Column A: Rep Name
Column B: Date (YYYY-MM-DD)
Column C: Availability Status (Available/Not Available)
Column D: Start Time (07:00)
Column E: End Time (21:00)
Column F: Cycle ID (W3-4)
Column G: Timestamp (ISO 8601)

Example Row:
John Smith | 2026-01-11 | Available | 07:00 | 21:00 | W3-4 | 2026-01-05T10:30:00Z
```

## API Integration

### Google Sheets API

```javascript
// Read
GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/Availability!A:G
→ Returns all data

// Write (Append)
POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/Availability!A:G:append
Body: { values: [[row1], [row2], ...] }
→ Adds new rows

// Delete (via batchUpdate)
POST https://sheets.googleapis.com/v4/spreadsheets/{id}:batchUpdate
Body: { requests: [{ deleteDimension: {...} }] }
→ Removes rows
```

### Offline Sync Strategy

```
1. User submits form
   ↓
2. Try Google Sheets API
   ↓
   ├─ Success
   │  ├─ Save to Sheets
   │  ├─ Save to LocalStorage (backup)
   │  └─ Mark as synced
   │
   └─ Failure (offline)
      ├─ Save to LocalStorage
      ├─ Mark as unsynced
      └─ Show "Saved locally" message
         ↓
3. When online again
   ↓
4. Service Worker detects connection
   ↓
5. Check for unsynced items
   ↓
6. Sync to Google Sheets
   ↓
7. Mark as synced
```

## PWA Architecture

### Service Worker Lifecycle

```
1. Install
   ├─ Cache static assets
   │  ├─ HTML
   │  ├─ JavaScript
   │  ├─ CSS
   │  └─ Images
   └─ Wait until activated

2. Activate
   └─ Clean up old caches

3. Fetch
   ├─ Check cache first
   │  └─ Return if found
   └─ Network request
      ├─ Success: cache & return
      └─ Failure: return cached version
```

### Caching Strategy

```
Static Assets (App Shell):
Strategy: Cache First
- HTML, JS, CSS
- Icons, manifest
- Fonts

Google Sheets API:
Strategy: Network First
- Fetch fresh data
- Fallback to cache if offline
- Cache for 5 minutes

User Submissions:
Strategy: LocalStorage
- Save immediately
- Sync when online
```

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                  │
├─────────────────────────────────────────┤
│                                          │
│ 1. Transport Security                    │
│    └─ HTTPS enforced                     │
│                                          │
│ 2. API Security                          │
│    ├─ API key restricted to Sheets API  │
│    └─ Domain restrictions               │
│                                          │
│ 3. Data Access                           │
│    ├─ Google Sheet: view-only public    │
│    └─ Write via API only                │
│                                          │
│ 4. Manager Access                        │
│    └─ Access code required               │
│                                          │
│ 5. Client Security                       │
│    ├─ React XSS protection              │
│    ├─ No eval() usage                   │
│    └─ Content Security Policy           │
│                                          │
│ 6. Data Privacy                          │
│    ├─ No sensitive data stored          │
│    └─ LocalStorage cleared on logout    │
│                                          │
└─────────────────────────────────────────┘
```

## Performance Optimization

### Build Optimization

```
Vite Build Process:
├─ Code splitting
│  ├─ RepForm.jsx → separate chunk
│  ├─ ManagerDashboard.jsx → separate chunk
│  └─ Utilities → shared chunk
├─ Minification
│  ├─ JavaScript (Terser)
│  └─ CSS (cssnano)
├─ Tree shaking
│  └─ Remove unused code
└─ Asset optimization
   ├─ Images → WebP
   └─ Fonts → subset
```

### Runtime Optimization

```
React Optimizations:
├─ Lazy loading components
├─ Memoization (useMemo, useCallback)
├─ Virtualization for long lists
└─ Debounced input handlers

Network Optimizations:
├─ Service Worker caching
├─ API response caching
├─ Batch API requests
└─ Prefetch next period data

Rendering Optimizations:
├─ CSS-in-JS avoided (Tailwind)
├─ Minimal re-renders
├─ Optimistic UI updates
└─ Skeleton screens
```

## Deployment Pipeline

```
Local Development
│
├─ npm run dev
└─ Hot reload, fast refresh
   │
   ▼
Testing
│
├─ Manual testing
├─ Cross-browser testing
└─ Mobile device testing
   │
   ▼
Build
│
├─ npm run build
├─ Vite production build
├─ PWA generation
└─ Asset optimization
   │
   ▼
Deploy
│
├─ Netlify/Vercel
├─ Environment variables
└─ HTTPS automatic
   │
   ▼
Production
│
├─ CDN distribution
├─ Service Worker active
└─ Analytics tracking
```

## Scalability Considerations

### Current Capacity

```
Users: 100 reps
Submissions: ~200/month
API Calls: ~300/month
Storage: <1 MB
→ Well within free tier limits
```

### Scale to 500 Reps

```
Users: 500 reps
Submissions: ~1,000/month
API Calls: ~1,500/month
Storage: ~5 MB
→ Still within free tier
```

### Scale to 1,000+ Reps

```
Users: 1,000+ reps
Submissions: 2,000+/month
API Calls: 3,000+/month
Storage: 10+ MB

Recommendations:
├─ Consider Google Sheets paid tier
├─ Implement API rate limiting
├─ Add caching layer (Redis)
└─ Consider dedicated database
```

## Technology Decisions

### Why React?
- Component-based architecture
- Large ecosystem
- PWA support
- Fast performance
- Easy state management

### Why Vite?
- Extremely fast builds
- Modern tooling
- Excellent PWA plugin
- Better than Create React App
- ESM native

### Why Tailwind CSS?
- Utility-first approach
- Mobile-first by default
- Tiny production bundle
- No runtime overhead
- Easy customization

### Why Google Sheets?
- No backend needed
- Free (for this scale)
- Familiar interface
- Easy data export
- Google Apps Script support

### Why Not a Database?
- Overkill for this use case
- Adds complexity
- Adds cost
- Sheets is sufficient
- Can migrate later if needed

## Error Handling

```
Error Scenarios:

1. Network Failure
   └─► Save to LocalStorage
       └─► Sync later

2. API Error
   └─► Show error message
       └─► Retry option

3. Invalid Data
   └─► Client validation
       └─► Prevent submission

4. Session Timeout
   └─► Not applicable (no sessions)

5. Concurrent Edits
   └─► Last write wins
       └─► Timestamp tracking

6. Browser Compatibility
   └─► Feature detection
       └─► Graceful degradation
```

## Monitoring & Analytics

### Performance Monitoring

```
Metrics to Track:
├─ Page load time
├─ Time to interactive
├─ First contentful paint
├─ Largest contentful paint
└─ Cumulative layout shift

Tools:
├─ Google Lighthouse
├─ WebPageTest
└─ Browser DevTools
```

### Usage Analytics

```
Events to Track:
├─ Rep submissions
├─ Manager logins
├─ CSV downloads
├─ Offline usage
└─ Error occurrences

Tools:
├─ Google Analytics 4
├─ Custom event tracking
└─ Google Sheets logs
```

---

This architecture is designed for:
- **Simplicity**: Easy to understand and maintain
- **Reliability**: Offline-first, resilient to failures
- **Performance**: Fast load times, optimized for mobile
- **Scalability**: Can grow from 100 to 500+ reps
- **Cost-effectiveness**: Free tier for expected usage
