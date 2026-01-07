import { useState, useEffect } from 'react';
import {
  getCollectionPeriod,
  formatDateFull,
  getSubmissionDeadline,
  formatDateStorage
} from '../utils/dateCalculations';
import {
  getAllSubmissions,
  getSubmittedReps,
  getLocalSubmissions,
  getLocalSubmittedReps,
  isGoogleSheetsConfigured
} from '../utils/googleSheets';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';
import * as supabaseApi from '../utils/supabaseApi';

export default function ManagerDashboard({ repNames, onBackToRep }) {
  const [submissions, setSubmissions] = useState([]);
  const [submittedReps, setSubmittedReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [exportingRep, setExportingRep] = useState(false);
  const [exportingAvailability, setExportingAvailability] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingRepEmail, setDeletingRepEmail] = useState(null);
  const [allowlist, setAllowlist] = useState([]);
  const [allowEmail, setAllowEmail] = useState('');
  const [allowName, setAllowName] = useState('');
  const [allowAddress, setAllowAddress] = useState('');
  const [allowEmploymentType, setAllowEmploymentType] = useState('full-time');
  const [allowStatus, setAllowStatus] = useState('active');
  const [allowSaving, setAllowSaving] = useState(false);
  const [allowError, setAllowError] = useState('');
  const [allowInfo, setAllowInfo] = useState('');

  const collectionPeriod = getCollectionPeriod();
  const deadline = getSubmissionDeadline();

  useEffect(() => {
    loadSubmissions();
    // Refresh every 30 seconds
    const interval = setInterval(loadSubmissions, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    loadAllowlist();
  }, []);

  const loadSubmissions = async () => {
    try {
      if (isSupabaseConfigured()) {
        const remoteSubs = await supabaseApi.getAllSubmissions(collectionPeriod.cycleId);
        setSubmissions(remoteSubs.map((s) => ({ ...s, source: 'supabase' })));
        setSubmittedReps([]);
      } else {
        const [sheetSubs, sheetReps] = await Promise.all([
          getAllSubmissions(collectionPeriod.cycleId),
          getSubmittedReps(collectionPeriod.cycleId)
        ]);

        const localSubs = getLocalSubmissions(collectionPeriod.cycleId);
        const localReps = getLocalSubmittedReps(collectionPeriod.cycleId);

        const mergedByRep = new Map();
        localSubs.forEach((sub) => mergedByRep.set(sub.repName, { ...sub, source: 'local' }));
        sheetSubs.forEach((sub) => mergedByRep.set(sub.repName, { ...sub, source: 'sheets' }));

        setSubmissions(Array.from(mergedByRep.values()));
        setSubmittedReps(Array.from(new Set([...localReps, ...sheetReps])));
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      if (!isSupabaseConfigured()) {
        // As a fallback, at least show locally saved submissions for this browser.
        const localSubs = getLocalSubmissions(collectionPeriod.cycleId);
        setSubmissions(localSubs);
        setSubmittedReps(getLocalSubmittedReps(collectionPeriod.cycleId));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAllowlist = async () => {
    try {
      setAllowError('');
      const rows = await supabaseApi.getRepAllowlist();
      setAllowlist(rows);
    } catch (error) {
      console.error('Error loading allowlist:', error);
      setAllowError(error?.message || 'Failed to load allowlist');
    }
  };

  const addToAllowlist = async (e) => {
    e.preventDefault();
    setAllowInfo('');
    setAllowError('');

    const email = allowEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAllowError('Enter a valid email');
      return;
    }

    if (!allowEmploymentType) {
      setAllowError('Select employment type');
      return;
    }

    setAllowSaving(true);
    try {
      let warning = '';
      let usedGeocoder = false;

      // Prefer server-side endpoint (does best-effort free geocoding). If unavailable (e.g., npm run dev),
      // fall back to direct Supabase write and warn that lat/lng weren't generated.
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('Not signed in');

        const response = await fetch('/manager/reps', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            full_name: allowName,
            home_address: allowAddress,
            employment_type: allowEmploymentType,
            status: allowStatus
          })
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Unexpected response type');
        }

        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || `Request failed (${response.status})`);
        warning = json?.warning || '';
        usedGeocoder = true;
      } catch (error) {
        console.warn('Manager rep endpoint unavailable, falling back to direct Supabase:', error);
        await supabaseApi.upsertRepAllowlist({
          email,
          fullName: allowName,
          homeAddress: allowAddress,
          employmentType: allowEmploymentType,
          status: allowStatus
        });
        warning = 'Saved, but could not auto-generate latitude/longitude in this environment. Run via Netlify/Vercel to geocode.';
      }

      setAllowEmail('');
      setAllowName('');
      setAllowAddress('');
      setAllowEmploymentType('full-time');
      setAllowStatus('active');
      setAllowInfo(
        warning
          ? usedGeocoder
            ? `Rep saved. ${warning}`
            : warning
          : 'Rep saved. They can now create an account.'
      );
      await loadAllowlist();
    } catch (error) {
      console.error('Error adding to allowlist:', error);
      setAllowError(error?.message || 'Failed to add rep');
    } finally {
      setAllowSaving(false);
    }
  };

  const removeFromAllowlist = async (email) => {
    setAllowInfo('');
    setAllowError('');
    setAllowSaving(true);
    try {
      await supabaseApi.removeRepFromAllowlist(email);
      setAllowInfo('Removed from permitted list.');
      await loadAllowlist();
    } catch (error) {
      console.error('Error removing from allowlist:', error);
      setAllowError(error?.message || 'Failed to remove rep');
    } finally {
      setAllowSaving(false);
    }
  };

  const pendingReps = repNames.filter(name => !submittedReps.includes(name));

  const submissionsByEmail = new Map(
    submissions
      .filter((s) => s?.source === 'supabase' && s?.repEmail)
      .map((s) => [String(s.repEmail).toLowerCase(), s])
  );

  const supabaseRepStatus = allowlist
    .map((r) => {
      const email = String(r.email || '').toLowerCase();
      const sub = submissionsByEmail.get(email);
      const availableDays = sub ? Object.values(sub.availability || {}).filter(Boolean).length : 0;
      return {
        repId: r.rep_id,
        email: r.email,
        fullName: r.full_name,
        homeAddress: r.home_address,
        homeLat: r.home_lat,
        homeLng: r.home_lng,
        status: r.status || 'active',
        employmentType: r.employment_type,
        displayName: r.full_name || sub?.repName || r.email,
        submitted: Boolean(sub),
        availableDays,
        submission: sub
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const totalRepCount = isSupabaseConfigured() ? supabaseRepStatus.length : repNames.length;
  const submittedCount = isSupabaseConfigured()
    ? supabaseRepStatus.filter((r) => r.submitted).length
    : submittedReps.length;
  const pendingCount = totalRepCount - submittedCount;
  const submissionRate = totalRepCount > 0 ? Math.round((submittedCount / totalRepCount) * 100) : 0;
  const pendingRepsEffective = isSupabaseConfigured()
    ? supabaseRepStatus.filter((r) => !r.submitted).map((r) => r.displayName)
    : pendingReps;

  const generateCSV = () => {
    setDownloading(true);

    try {
      const csvRows = [];
      csvRows.push(['Rep Name', 'Date', 'Start Time', 'End Time']);

      submissions.forEach(sub => {
        Object.entries(sub.availability).forEach(([date, isAvailable]) => {
          if (isAvailable) {
            csvRows.push([
              sub.repName,
              date,
              '08:00',
              '20:00'
            ]);
          }
        });
      });

      // Sort by rep name, then by date
      csvRows.slice(1).sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return a[1].localeCompare(b[1]);
      });

      const csvContent = csvRows.map(row => row.join(','));
const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `availability_${collectionPeriod.cycleId}_${formatDateStorage(new Date())}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Error generating CSV. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadXlsx = async (endpoint, fallbackFilename, setBusy) => {
    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
          const json = await response.json();
          if (json?.error) message = json.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        throw new Error(
          `Unexpected response type (${contentType || 'unknown'}). Check your Netlify/Vercel export route rewrites.`
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || fallbackFilename;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert(error?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSubmission = async (sub) => {
    if (!isSupabaseConfigured()) return;
    if (!sub?.id) return;

    const ok = window.confirm(
      `Delete ${sub.repName}'s submission for ${collectionPeriod.cycleId}?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(sub.id);
    try {
      await supabaseApi.deleteSubmission(sub.id);
      await loadSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert(error?.message || 'Failed to delete submission');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteRep = async (rep) => {
    if (!isSupabaseConfigured()) return;
    if (!rep?.email) return;

    const ok = window.confirm(
      `Delete rep ${rep.displayName} (${rep.email})?\n\nThis will:\n- Remove them from the permitted rep list\n- Delete any submissions stored for this email\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setAllowInfo('');
    setAllowError('');
    setDeletingRepEmail(rep.email);
    try {
      await supabaseApi.removeRepFromAllowlist(rep.email);
      let submissionsDeleted = true;
      try {
        await supabaseApi.deleteSubmissionsByRepEmail(rep.email);
      } catch (error) {
        submissionsDeleted = false;
        console.error('Error deleting rep submissions:', error);
      }

      setAllowInfo(submissionsDeleted ? 'Rep deleted.' : 'Rep removed. Failed to delete some submissions.');
      await Promise.all([loadAllowlist(), loadSubmissions()]);
    } catch (error) {
      console.error('Error deleting rep:', error);
      setAllowError(error?.message || 'Failed to delete rep');
    } finally {
      setDeletingRepEmail(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pc-light to-white">
      <div className="max-w-4xl mx-auto p-4 pb-24">
        {!isSupabaseConfigured() && !isGoogleSheetsConfigured() && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-yellow-800">
              Google Sheets is not configured (missing `VITE_SPREADSHEET_ID` / `VITE_GOOGLE_API_KEY`). Showing only
              submissions saved in this browser.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="bg-pc-blue text-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Manager Dashboard</h1>
              <p className="text-pc-light text-sm">
                Week {collectionPeriod.weekNumbers[0]}-{collectionPeriod.weekNumbers[1]}
              </p>
            </div>
            <div className="flex gap-2">
              {!isSupabaseConfigured() && (
                <button
                  onClick={onBackToRep}
                  className="px-4 py-2 bg-white text-pc-blue rounded-lg font-medium hover:bg-pc-light transition"
                >
                  Rep View
                </button>
              )}
              {isSupabaseConfigured() && (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-4 py-2 bg-transparent border border-white text-white rounded-lg font-medium hover:bg-white hover:text-pc-blue transition"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
          <p className="text-white font-medium">
            {formatDateFull(collectionPeriod.start)} - {formatDateFull(collectionPeriod.end)}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Reps</p>
            <p className="text-3xl font-bold text-gray-900">{totalRepCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Submitted</p>
            <p className="text-3xl font-bold text-green-600">{submittedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Submission Progress</p>
            <p className="text-lg font-bold text-pc-blue">{submissionRate}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-pc-blue h-4 rounded-full transition-all duration-500"
              style={{ width: `${submissionRate}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Deadline: {formatDateFull(deadline)} at 11:59 PM
          </p>
        </div>

        {/* Action Buttons */}
        {isSupabaseConfigured() ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() =>
                downloadXlsx('/manager/export/rep-table', 'rep_table_v4_hours.xlsx', setExportingRep)
              }
              disabled={exportingRep || exportingAvailability}
              className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition ${
                exportingRep || exportingAvailability ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {exportingRep ? 'Downloading...' : 'Download Rep Table'}
            </button>
            <button
              onClick={() =>
                downloadXlsx('/manager/export/availability', 'availability_v4_forced_6h.xlsx', setExportingAvailability)
              }
              disabled={exportingRep || exportingAvailability}
              className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition ${
                exportingRep || exportingAvailability ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {exportingAvailability ? 'Downloading...' : 'Download Availability'}
            </button>
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-pc-blue bg-white border-2 border-pc-blue hover:bg-pc-light transition"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={generateCSV}
              disabled={downloading || submissions.length === 0}
              className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition ${
                downloading || submissions.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {downloading ? 'Generating...' : 'Download CSV'}
            </button>
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-pc-blue bg-white border-2 border-pc-blue hover:bg-pc-light transition"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
          </div>
        )}

        {/* Rep Allowlist (Supabase) */}
        {isSupabaseConfigured() && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Reps</h2>
                <p className="text-sm text-gray-600">
                  Only emails in this list can create rep accounts. Status shows submissions for {collectionPeriod.cycleId}.
                </p>
              </div>
              <button
                onClick={loadAllowlist}
                disabled={allowSaving}
                className="px-4 py-2 rounded-lg font-medium border-2 border-pc-blue text-pc-blue hover:bg-pc-light transition disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <form onSubmit={addToAllowlist} className="space-y-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={allowEmail}
                  onChange={(e) => setAllowEmail(e.target.value)}
                  placeholder="rep@company.com"
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
                  disabled={allowSaving}
                />
                <input
                  value={allowName}
                  onChange={(e) => setAllowName(e.target.value)}
                  placeholder="(optional) Full name"
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
                  disabled={allowSaving}
                />
                <select
                  value={allowStatus}
                  onChange={(e) => setAllowStatus(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
                  disabled={allowSaving}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <input
                  value={allowAddress}
                  onChange={(e) => setAllowAddress(e.target.value)}
                  placeholder="Home address (for lat/lng)"
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none md:col-span-2"
                  disabled={allowSaving}
                />
                <select
                  value={allowEmploymentType}
                  onChange={(e) => setAllowEmploymentType(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
                  disabled={allowSaving}
                >
                  <option value="full-time">full-time</option>
                  <option value="part-time">part-time</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={allowSaving}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${
                  allowSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-pc-blue hover:bg-pc-dark'
                }`}
              >
                {allowSaving ? 'Saving...' : 'Add/Update Rep'}
              </button>
            </form>

            {allowInfo && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                {allowInfo}
              </div>
            )}
            {allowError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {allowError}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">All Reps ({allowlist.length})</p>
            </div>

            {allowlist.length === 0 ? (
              <p className="text-sm text-gray-600">No permitted reps yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {supabaseRepStatus.map((row) => (
                  <div
                    key={row.email}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-medium">{row.displayName}</p>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            row.submitted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {row.submitted ? 'Submitted' : 'Not submitted'}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            row.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{row.email}</p>
                      {row.homeAddress && <p className="text-xs text-gray-500">{row.homeAddress}</p>}
                      {row.submitted && (
                        <p className="text-xs text-gray-500">{row.availableDays} days available</p>
                      )}
                      {(row.homeLat != null || row.homeLng != null) && (
                        <p className="text-xs text-gray-500">
                          {row.homeLat != null ? row.homeLat : ''}{row.homeLat != null && row.homeLng != null ? ', ' : ''}
                          {row.homeLng != null ? row.homeLng : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {row.submitted && row.submission?.id && (
                        <button
                          onClick={() => handleDeleteSubmission(row.submission)}
                          disabled={deletingId === row.submission.id}
                          className={`px-3 py-2 rounded-lg font-bold transition ${
                            deletingId === row.submission.id
                              ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {deletingId === row.submission.id ? 'Deleting...' : 'Delete Submission'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRep(row)}
                        disabled={allowSaving || deletingRepEmail === row.email}
                        className={`px-3 py-2 rounded-lg font-bold transition disabled:opacity-50 ${
                          allowSaving || deletingRepEmail === row.email
                            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {deletingRepEmail === row.email ? 'Deleting...' : 'Delete Rep'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Reps */}
        {!isSupabaseConfigured() && pendingRepsEffective.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Pending Submissions ({pendingRepsEffective.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingRepsEffective.map(name => (
                <div key={name} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-800">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Reps */}
        {!isSupabaseConfigured() && submittedReps.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Submitted ({submittedReps.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {submissions.map(sub => {
                const availableDays = Object.values(sub.availability).filter(Boolean).length;
                return (
                  <div key={sub.repName} className="flex items-center justify-between gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-gray-800 font-medium">{sub.repName}</p>
                        <p className="text-sm text-gray-600">{availableDays} days available</p>
                      </div>
                    </div>

                    {isSupabaseConfigured() && sub.source === 'supabase' && sub.id ? (
                      <button
                        onClick={() => handleDeleteSubmission(sub)}
                        disabled={deletingId === sub.id}
                        className={`px-3 py-2 rounded-lg font-bold transition ${
                          deletingId === sub.id
                            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {deletingId === sub.id ? 'Deleting...' : 'Delete'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {sub.source === 'local' ? 'Local only' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-pc-blue"></div>
            <p className="mt-4 text-gray-600">Loading submissions...</p>
          </div>
        )}

        {!loading && submissions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-600">No submissions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
