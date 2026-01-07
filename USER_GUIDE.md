# User Guide

## For Reps: Submitting Your Availability

### First Time Setup

#### Installing the App on Your Phone

**iPhone/iPad:**
1. Open Safari (must use Safari, not Chrome)
2. Go to the app URL
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add"
6. App icon appears on your home screen!

**Android:**
1. Open Chrome browser
2. Go to the app URL
3. Tap the three-dot menu (top right)
4. Tap "Add to Home Screen"
5. Tap "Add"
6. App icon appears on your home screen!

### Submitting Availability

**Step 1: Open the App**
- Tap the app icon on your home screen
- Or visit the URL in your browser

**Step 2: Select Your Name**
- Tap the dropdown menu
- Find and tap your name
- The form will load with 14 days

**Step 3: Mark Your Available Days**
- Tap each day you're available
- Green = Available (automatically 07:00-21:00)
- Gray = Not Available

**Quick Tips:**
- Tap "All Available" to select all days at once
- Tap "All Unavailable" to clear all selections
- Tap individual days to toggle on/off

**Step 4: Submit**
- Tap the blue "Submit Availability" button
- You'll see a success message
- Your data is saved!

### Important Information

**Deadline:**
- You'll see the deadline at the top of the form
- Submit by Saturday night
- Form locks Sunday morning (when period ends)

**Editing:**
- You can change your submission anytime before the deadline
- Just select your name again
- Update your availability
- Submit again (overwrites previous submission)

**What "Available" Means:**
- Available = You can work 07:00 to 21:00 that day
- Not Available = You cannot work that day
- Times are fixed (07:00-21:00)

**Offline Mode:**
- App works without internet
- Saves your submission locally
- Syncs automatically when you're back online
- You'll see "Saved locally" message if offline

### FAQs

**Q: Can I change my submission?**
A: Yes! Just submit again before the deadline.

**Q: What if I miss the deadline?**
A: Form locks. You'll need to wait until the next submission period (shown on screen).

**Q: Do I need to submit every week?**
A: No. You submit once every 2 weeks, during the odd weeks (1, 3, 5, etc.).

**Q: What if I don't see my name in the list?**
A: Contact your manager to add you to the system.

**Q: Can I submit from my computer?**
A: Yes! The app works on any device with a web browser.

**Q: What if the app isn't working?**
A: Try these:
- Close and reopen the app
- Check your internet connection
- Clear browser cache
- Contact your manager

---

## For Managers: Using the Dashboard

### Accessing the Dashboard

1. Open the app (same URL as reps use)
2. Tap the manager icon (circle with person, bottom right)
3. Enter the access code
4. Tap "Enter"

### Dashboard Overview

**Stats Cards:**
- **Total Reps**: Number of employees in system
- **Submitted**: How many have submitted
- **Pending**: How many haven't submitted yet

**Progress Bar:**
- Visual representation of submission rate
- Shows percentage complete
- Displays deadline

**Action Buttons:**
- **Download CSV**: Export all availability data
- **Refresh**: Update submission counts

**Submission Lists:**
- **Pending**: Reps who haven't submitted (orange)
- **Submitted**: Reps who have submitted (green)

### Downloading CSV

1. Click "Download CSV" button
2. File downloads automatically
3. File name: `availability_W3-4_2026-01-15.csv`

**CSV Format:**
```csv
Rep Name,Date,Start Time,End Time
John Smith,2026-01-11,07:00,21:00
John Smith,2026-01-12,07:00,21:00
```

**Notes:**
- Only includes days marked "Available"
- Excludes "Not Available" days
- Sorted by rep name, then by date
- Ready to import into scheduling software

### Monitoring Submissions

**During Submission Period:**
- Check dashboard daily
- Monitor submission rate
- Follow up with pending reps
- Tap "Refresh" to update counts

**Before Deadline:**
- Ensure all reps have submitted
- Download CSV for scheduling
- Contact pending reps

**After Deadline:**
- Form automatically locks
- Export final CSV
- Use for scheduling next period

### Google Sheet Access

You can also view data directly in Google Sheets:

1. Open the Google Sheet (get link from IT/setup person)
2. See all raw data
3. Use "Availability Tools" menu for:
   - Generate CSV Export
   - View Submission Stats
   - Clean Up Old Data

### Tips for Managers

**Weekly Routine:**
- **Sunday**: Submission period opens (odd weeks)
- **Monday-Friday**: Monitor submissions, send reminders
- **Saturday**: Final push for pending reps
- **Before Saturday midnight**: Download CSV

**Reminders:**
- Check who's pending in dashboard
- Send friendly reminder via email/text/Slack
- Mention deadline is approaching
- Offer help if they're having trouble

**Troubleshooting:**
- If submission count seems wrong, tap Refresh
- Check Google Sheet for actual data
- Verify rep names match exactly
- Check for duplicate submissions

### Manager FAQs

**Q: How do I add/remove reps?**
A: Edit the rep list in the app code (`src/App.jsx`). Contact your IT person or developer.

**Q: Can I change the deadline?**
A: Deadline is automatic (Saturday of odd weeks). Code change required to modify.

**Q: What if a rep submits after deadline?**
A: They can't - form is locked. They'll need to wait for next period.

**Q: Can I see individual rep schedules?**
A: Yes, in the Google Sheet or after downloading CSV.

**Q: What if CSV is empty?**
A: Ensure reps marked days as "Available" and you're using correct cycle ID.

**Q: Can multiple managers access dashboard?**
A: Yes! Anyone with the access code can view dashboard.

**Q: How do I change the access code?**
A: Contact your IT person or developer to update in app code.

**Q: Can I export for specific dates only?**
A: Use the Google Sheet "Availability Tools" menu for custom exports.

---

## Technical Support

**For Reps:**
- Contact your manager first
- They can help with access and submission issues

**For Managers:**
- Check SETUP_GUIDE.md for detailed troubleshooting
- Contact IT/developer for:
  - Adding/removing reps
  - Changing access codes
  - Technical issues
  - Customization requests

**Common Issues:**

| Issue | Solution |
|-------|----------|
| App won't load | Check internet, clear cache, try different browser |
| Can't find my name | Contact manager to add you to system |
| Submission failed | Check internet, try again, check Google Sheet |
| Manager code won't work | Verify correct code with manager/IT |
| CSV won't download | Try different browser, check popup blocker |
| Wrong dates showing | App auto-detects dates, contact IT if incorrect |

**Emergency Contact:**
- If app is completely down, contact IT immediately
- Use backup method for collecting availability if needed
- Keep manager phone/email handy

---

**Questions?** Check SETUP_GUIDE.md or contact your system administrator.
