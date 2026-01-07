/**
 * Google Sheets API integration
 * Store and retrieve availability data
 */

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SHEET_NAME = 'Availability';

export function isGoogleSheetsConfigured() {
  return Boolean(SPREADSHEET_ID && API_KEY);
}

/**
 * Initialize Google Sheets API
 */
export async function initGoogleSheets() {
  // This will be called when the app loads
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    } else {
      reject(new Error('Google API not loaded'));
    }
  });
}

/**
 * Submit availability for a rep
 */
export async function submitAvailability(repName, availabilityData, cycleId) {
  const timestamp = new Date().toISOString();
  const rows = [];

  // Build rows for each date
  Object.entries(availabilityData).forEach(([date, isAvailable]) => {
    rows.push([
      repName,
      date,
      isAvailable ? 'Available' : 'Not Available',
      isAvailable ? '07:00' : '',
      isAvailable ? '21:00' : '',
      cycleId,
      timestamp
    ]);
  });

  try {
    // First, delete existing submission for this rep and cycle
    await deleteExistingSubmission(repName, cycleId);

    // Then append new data
    const response = await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
      valueInputOption: 'RAW',
      resource: {
        values: rows
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error submitting availability:', error);
    throw error;
  }
}

/**
 * Delete existing submission for a rep in a specific cycle
 */
async function deleteExistingSubmission(repName, cycleId) {
  try {
    // Get all data
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const rows = response.result.values || [];
    const rowsToDelete = [];

    // Find rows to delete (skip header row)
    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      if (row[0] === repName && row[5] === cycleId) {
        rowsToDelete.push(index);
      }
    });

    // Delete rows in reverse order to maintain indices
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowsToDelete[i],
                endIndex: rowsToDelete[i] + 1
              }
            }
          }]
        }
      });
    }
  } catch (error) {
    // If sheet is empty or doesn't exist, that's okay
    console.log('No existing submission to delete');
  }
}

/**
 * Get availability for a specific rep and cycle
 */
export async function getRepAvailability(repName, cycleId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const rows = response.result.values || [];
    const availability = {};

    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      if (row[0] === repName && row[5] === cycleId) {
        availability[row[1]] = row[2] === 'Available';
      }
    });

    return availability;
  } catch (error) {
    console.error('Error getting availability:', error);
    return {};
  }
}

/**
 * Get all submissions for a specific cycle
 */
export async function getAllSubmissions(cycleId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const rows = response.result.values || [];
    const submissions = {};

    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      if (row[5] === cycleId) {
        if (!submissions[row[0]]) {
          submissions[row[0]] = {
            repName: row[0],
            timestamp: row[6],
            availability: {}
          };
        }
        submissions[row[0]].availability[row[1]] = row[2] === 'Available';
      }
    });

    return Object.values(submissions);
  } catch (error) {
    console.error('Error getting submissions:', error);
    return [];
  }
}

/**
 * Get list of all reps who have submitted for a cycle
 */
export async function getSubmittedReps(cycleId) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`,
    });

    const rows = response.result.values || [];
    const reps = new Set();

    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      if (row[5] === cycleId) {
        reps.add(row[0]);
      }
    });

    return Array.from(reps);
  } catch (error) {
    console.error('Error getting submitted reps:', error);
    return [];
  }
}

/**
 * Offline storage fallback
 */
export function saveToLocalStorage(repName, availabilityData, cycleId) {
  const key = `availability_${cycleId}_${repName}`;
  const data = {
    repName,
    availability: availabilityData,
    cycleId,
    timestamp: new Date().toISOString(),
    synced: false
  };
  localStorage.setItem(key, JSON.stringify(data));
}

export function getFromLocalStorage(repName, cycleId) {
  const key = `availability_${cycleId}_${repName}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export function getLocalSubmissions(cycleId) {
  if (typeof localStorage === 'undefined') return [];

  const prefix = `availability_${cycleId}_`;
  const submissions = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data?.cycleId === cycleId && data?.repName && data?.availability) {
        submissions.push(data);
      }
    } catch {
      // Ignore malformed local entries
    }
  }

  return submissions;
}

export function getLocalSubmittedReps(cycleId) {
  const reps = new Set();
  getLocalSubmissions(cycleId).forEach((sub) => reps.add(sub.repName));
  return Array.from(reps);
}

export function getUnsyncedSubmissions() {
  const unsynced = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('availability_')) {
      const data = JSON.parse(localStorage.getItem(key));
      if (!data.synced) {
        unsynced.push(data);
      }
    }
  }
  return unsynced;
}

export function markAsSynced(repName, cycleId) {
  const key = `availability_${cycleId}_${repName}`;
  const data = JSON.parse(localStorage.getItem(key));
  if (data) {
    data.synced = true;
    localStorage.setItem(key, JSON.stringify(data));
  }
}
