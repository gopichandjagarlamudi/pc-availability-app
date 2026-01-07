/**
 * Google Apps Script for PC Financial Availability App
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Name it "PC Financial Availability"
 * 3. Go to Extensions > Apps Script
 * 4. Delete any existing code and paste this entire script
 * 5. Save the project
 * 6. Run the "setupSheet" function once to create the header row
 * 7. Deploy as a web app if you want additional API endpoints
 *
 * SHEET STRUCTURE:
 * Column A: Rep Name
 * Column B: Date (YYYY-MM-DD)
 * Column C: Availability Status (Available/Not Available)
 * Column D: Start Time (07:00)
 * Column E: End Time (21:00)
 * Column F: Cycle ID (e.g., W3-4)
 * Column G: Timestamp
 */

/**
 * Initial setup - creates the header row
 * Run this function once after creating the script
 */
function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Availability');

  if (!sheet) {
    // Create the sheet if it doesn't exist
    const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Availability');
    newSheet.appendRow(['Rep Name', 'Date', 'Availability Status', 'Start Time', 'End Time', 'Cycle ID', 'Timestamp']);
    newSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#0066cc').setFontColor('#ffffff');
    newSheet.setFrozenRows(1);

    // Set column widths
    newSheet.setColumnWidth(1, 150); // Rep Name
    newSheet.setColumnWidth(2, 120); // Date
    newSheet.setColumnWidth(3, 150); // Availability Status
    newSheet.setColumnWidth(4, 100); // Start Time
    newSheet.setColumnWidth(5, 100); // End Time
    newSheet.setColumnWidth(6, 100); // Cycle ID
    newSheet.setColumnWidth(7, 180); // Timestamp

    SpreadsheetApp.getUi().alert('Sheet setup complete!');
  } else {
    SpreadsheetApp.getUi().alert('Sheet already exists!');
  }
}

/**
 * Generate CSV export for a specific cycle
 * This creates a new sheet with the CSV data
 */
function generateCSV() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Enter Cycle ID (e.g., W3-4):');

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const cycleId = response.getResponseText().trim();

  if (!cycleId) {
    ui.alert('Please enter a valid Cycle ID');
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Availability');
  const data = sheet.getDataRange().getValues();

  // Filter and format data for CSV
  const csvData = [['Rep Name', 'Date', 'Start Time', 'End Time']];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const repName = row[0];
    const date = row[1];
    const status = row[2];
    const startTime = row[3];
    const endTime = row[4];
    const rowCycleId = row[5];

    // Only include rows for the specified cycle and where status is "Available"
    if (rowCycleId === cycleId && status === 'Available') {
      csvData.push([repName, date, startTime, endTime]);
    }
  }

  // Sort by rep name, then by date
  csvData.slice(1).sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
    return a[1].localeCompare(b[1]);
  });

  // Create a new sheet with the CSV data
  const csvSheetName = `CSV_${cycleId}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd')}`;
  let csvSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(csvSheetName);

  if (csvSheet) {
    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(csvSheet);
  }

  csvSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(csvSheetName);
  csvSheet.getRange(1, 1, csvData.length, 4).setValues(csvData);
  csvSheet.getRange('A1:D1').setFontWeight('bold').setBackground('#0066cc').setFontColor('#ffffff');

  ui.alert(`CSV data generated in sheet: ${csvSheetName}\n\nTotal rows: ${csvData.length - 1}`);
}

/**
 * Get submission statistics for a cycle
 */
function getSubmissionStats() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Enter Cycle ID (e.g., W3-4):');

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const cycleId = response.getResponseText().trim();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Availability');
  const data = sheet.getDataRange().getValues();

  const reps = new Set();
  let totalDaysAvailable = 0;
  let totalDaysNotAvailable = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[5] === cycleId) {
      reps.add(row[0]);
      if (row[2] === 'Available') {
        totalDaysAvailable++;
      } else {
        totalDaysNotAvailable++;
      }
    }
  }

  const stats = `Submission Statistics for ${cycleId}:\n\n` +
    `Total Reps Submitted: ${reps.size}\n` +
    `Total Days Available: ${totalDaysAvailable}\n` +
    `Total Days Not Available: ${totalDaysNotAvailable}\n` +
    `Average Days Available per Rep: ${(totalDaysAvailable / reps.size).toFixed(1)}`;

  ui.alert(stats);
}

/**
 * Clean up old data (optional)
 * Removes submissions older than 6 months
 */
function cleanupOldData() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clean Up Old Data',
    'This will delete all submissions older than 6 months. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Availability');
  const data = sheet.getDataRange().getValues();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  let deletedCount = 0;

  // Delete from bottom to top to maintain row indices
  for (let i = data.length - 1; i > 0; i--) {
    const timestamp = new Date(data[i][6]);
    if (timestamp < sixMonthsAgo) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  ui.alert(`Cleanup complete! Deleted ${deletedCount} old records.`);
}

/**
 * Create custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Availability Tools')
    .addItem('Generate CSV Export', 'generateCSV')
    .addItem('View Submission Stats', 'getSubmissionStats')
    .addSeparator()
    .addItem('Clean Up Old Data', 'cleanupOldData')
    .addToUi();
}

/**
 * Web app endpoint (optional)
 * Deploy this as a web app to create a custom API endpoint
 */
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getSubmissions') {
    const cycleId = e.parameter.cycleId;
    return getSubmissionsAPI(cycleId);
  }

  return ContentService.createTextOutput('PC Financial Availability API');
}

function getSubmissionsAPI(cycleId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Availability');
  const data = sheet.getDataRange().getValues();

  const submissions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[5] === cycleId) {
      submissions.push({
        repName: row[0],
        date: row[1],
        status: row[2],
        startTime: row[3],
        endTime: row[4],
        timestamp: row[6]
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify(submissions))
    .setMimeType(ContentService.MimeType.JSON);
}
