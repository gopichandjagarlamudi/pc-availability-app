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
import '../styles/managerDashboard.css';

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

    const fullName = allowName.trim();
    if (!fullName) {
      setAllowError('Enter full name');
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
            full_name: fullName,
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
          fullName,
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
    <div className="manager-dashboard min-h-screen">
      <div className="max-w-4xl mx-auto pb-24 p-[var(--md-page-pad)] md-shell">
        {!isSupabaseConfigured() && !isGoogleSheetsConfigured() && (
          <div className="md-card mb-[var(--md-section-gap)] border-l-4 border-[#D4AF37]">
            <p className="md-secondary">
              Google Sheets is not configured (missing `VITE_SPREADSHEET_ID` / `VITE_GOOGLE_API_KEY`). Showing only
              submissions saved in this browser.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="md-header mb-[var(--md-section-gap)] md-animate-in" style={{ animationDelay: '0s' }}>
          <div className="flex justify-between items-start mb-7">
            <div>
              <h1 className="md-h1 mb-2">Manager Dashboard</h1>
              <p className="text-[12px] font-medium leading-[1.4] text-[#E0E7FF]">
                Week {collectionPeriod.weekNumbers[0]}-{collectionPeriod.weekNumbers[1]}
              </p>
            </div>
            <div className="flex gap-[var(--md-button-gap)]">
              {!isSupabaseConfigured() && (
                <button
                  onClick={onBackToRep}
                  className="md-btn md-btn-header-outline"
                >
                  Rep View
                </button>
              )}
              {isSupabaseConfigured() && (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="md-btn md-btn-header-outline"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
          <p className="text-[14px] font-medium text-[#E0E7FF]">
            {formatDateFull(collectionPeriod.start)} - {formatDateFull(collectionPeriod.end)}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--md-grid-gap)] mb-[var(--md-section-gap)]">
          <div className="md-card md-animate-in" style={{ animationDelay: '0.1s' }}>
            <p className="md-small mb-2">Total Reps</p>
            <p className="md-metric">{totalRepCount}</p>
          </div>
          <div className="md-card md-animate-in" style={{ animationDelay: '0.2s' }}>
            <p className="md-small mb-2">Submitted</p>
            <p className="md-metric" style={{ color: 'var(--md-success)' }}>{submittedCount}</p>
          </div>
          <div className="md-card md-animate-in" style={{ animationDelay: '0.3s' }}>
            <p className="md-small mb-2">Pending</p>
            <p className="md-metric">{pendingCount}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="md-card mb-[var(--md-section-gap)] md-animate-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[14px] font-semibold text-[#1F2937]">Submission Progress</p>
            <p className="text-[14px] font-semibold text-[#1F2937]">{submissionRate}%</p>
          </div>
          <div className="md-progress-track">
            <div
              className="md-progress-fill"
              style={{ width: `${submissionRate}%` }}
            />
          </div>
          <p className="md-small mt-1">
            Deadline: {formatDateFull(deadline)} at 11:59 PM
          </p>
        </div>

        {/* Action Buttons */}
        {isSupabaseConfigured() ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--md-grid-gap)] mb-[var(--md-section-gap)]">
            <button
              onClick={() =>
                downloadXlsx('/manager/export/rep-table', 'rep_table_v4_hours.xlsx', setExportingRep)
              }
              disabled={exportingRep || exportingAvailability}
              className="md-btn md-btn-primary w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 2a1 1 0 011 1v7.586l2.293-2.293a1 1 0 111.414 1.414l-4.007 4.007a1 1 0 01-1.414 0L5.279 9.707a1 1 0 011.414-1.414L9 10.586V3a1 1 0 011-1z" />
                <path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
              {exportingRep ? 'Downloading...' : 'Download Rep Table'}
            </button>
            <button
              onClick={() =>
                downloadXlsx('/manager/export/availability', 'availability_v4_forced_6h.xlsx', setExportingAvailability)
              }
              disabled={exportingRep || exportingAvailability}
              className="md-btn md-btn-primary w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 2a1 1 0 011 1v7.586l2.293-2.293a1 1 0 111.414 1.414l-4.007 4.007a1 1 0 01-1.414 0L5.279 9.707a1 1 0 011.414-1.414L9 10.586V3a1 1 0 011-1z" />
                <path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
              {exportingAvailability ? 'Downloading...' : 'Download Availability'}
            </button>
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="md-btn md-btn-outline w-full"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--md-grid-gap)] mb-[var(--md-section-gap)]">
            <button
              onClick={generateCSV}
              disabled={downloading || submissions.length === 0}
              className="md-btn md-btn-primary w-full"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {downloading ? 'Generating...' : 'Download CSV'}
            </button>
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="md-btn md-btn-outline w-full"
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
          <div className="md-card mb-[var(--md-section-gap)] md-animate-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="md-h2">Reps</h2>
                <p className="md-secondary">
                  Only emails in this list can create rep accounts. Status shows submissions for {collectionPeriod.cycleId}.
                </p>
              </div>
              <button
                onClick={loadAllowlist}
                disabled={allowSaving}
                className="md-btn md-btn-outline"
              >
                <svg className={`w-4 h-4 ${allowSaving ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Refresh
              </button>
            </div>

            <form onSubmit={addToAllowlist} className="space-y-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--md-field-gap)]">
                <div>
                  <label className="md-label">Email</label>
                  <div className="md-input-icon-wrap">
                    <svg className="md-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M2.94 6.34A2 2 0 014 5h12a2 2 0 011.06.34L10 10.19 2.94 6.34z" />
                      <path d="M18 8.07l-7.4 4.53a1 1 0 01-1.2 0L2 8.07V13a2 2 0 002 2h12a2 2 0 002-2V8.07z" />
                    </svg>
                    <input
                      value={allowEmail}
                      onChange={(e) => setAllowEmail(e.target.value)}
                      placeholder="rep@company.com"
                      className="md-input"
                      disabled={allowSaving}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="md-label">
                    Full name <span className="text-[var(--md-primary)] font-semibold">*</span>
                  </label>
                  <input
                    value={allowName}
                    onChange={(e) => setAllowName(e.target.value)}
                    placeholder="Full name"
                    className="md-input"
                    disabled={allowSaving}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="md-label">Status</label>
                  <div className="md-select-wrap">
                    <select
                      value={allowStatus}
                      onChange={(e) => setAllowStatus(e.target.value)}
                      className="md-input"
                      disabled={allowSaving}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                    <svg className="md-select-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.936a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="md-label">Home address</label>
                  <div className="md-input-icon-wrap">
                    <svg className="md-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <input
                      value={allowAddress}
                      onChange={(e) => setAllowAddress(e.target.value)}
                      placeholder="Home address (for lat/lng)"
                      className="md-input"
                      disabled={allowSaving}
                      autoComplete="street-address"
                    />
                  </div>
                </div>

                <div>
                  <label className="md-label">Employment type</label>
                  <div className="md-select-wrap">
                    <select
                      value={allowEmploymentType}
                      onChange={(e) => setAllowEmploymentType(e.target.value)}
                      className="md-input"
                      disabled={allowSaving}
                    >
                      <option value="full-time">full-time</option>
                      <option value="part-time">part-time</option>
                    </select>
                    <svg className="md-select-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.936a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={allowSaving} className="md-btn md-btn-primary w-full">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {allowSaving ? 'Saving...' : 'Add/Update Rep'}
              </button>
            </form>

            {allowInfo && (
              <div className="mb-4 p-3 rounded-[var(--md-radius-12)] bg-[var(--md-bg-2)] border border-[var(--md-border)] md-secondary">
                {allowInfo}
              </div>
            )}
            {allowError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {allowError}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <p className="md-small">All Reps ({allowlist.length})</p>
            </div>

            {allowlist.length === 0 ? (
              <p className="md-secondary">No permitted reps yet.</p>
            ) : (
              <div className="md-table">
                <div className="overflow-x-auto">
                  <div className="min-w-[840px]">
                    <div className="md-table-head grid grid-cols-[2fr_2fr_1fr_auto] gap-4">
                      <div>Name</div>
                      <div>Email</div>
                      <div>Status</div>
                      <div className="text-right">Actions</div>
                    </div>
                    <div className="md-table-body max-h-64 overflow-y-auto">
                      {supabaseRepStatus.map((row) => (
                        <div
                          key={row.email}
                          className="md-table-row grid grid-cols-[2fr_2fr_1fr_auto] gap-4 items-start"
                        >
                          <div>
                            <p className="font-semibold text-[#1F2937]">{row.displayName}</p>
                            <p className="md-small">{row.employmentType}</p>
                            {row.homeAddress && <p className="md-small">{row.homeAddress}</p>}
                          </div>

                          <div>
                            <p className="text-[14px] text-[#1F2937]">{row.email}</p>
                            {row.submitted && <p className="md-small">{row.availableDays} days available</p>}
                            {(row.homeLat != null || row.homeLng != null) && (
                              <p className="md-small">
                                {row.homeLat != null ? row.homeLat : ''}
                                {row.homeLat != null && row.homeLng != null ? ', ' : ''}
                                {row.homeLng != null ? row.homeLng : ''}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-[1.4] ${
                                row.submitted
                                  ? 'border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] text-[rgb(6,95,70)]'
                                  : 'border-[var(--md-border)] bg-[var(--md-bg-2)] text-[var(--md-text-secondary)]'
                              }`}
                            >
                              {row.submitted ? 'Submitted' : 'Not submitted'}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-[1.4] ${
                                row.status === 'active'
                                  ? 'border-[rgba(59,122,143,0.35)] bg-[rgba(59,122,143,0.10)] text-[var(--md-primary-hover)]'
                                  : 'border-[var(--md-border)] bg-[var(--md-bg-2)] text-[var(--md-text-secondary)]'
                              }`}
                            >
                              {row.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            {row.submitted && row.submission?.id && (
                              <button
                                onClick={() => handleDeleteSubmission(row.submission)}
                                disabled={deletingId === row.submission.id}
                                className="md-btn md-btn-danger"
                                aria-label="Delete submission"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path
                                    fillRule="evenodd"
                                    d="M7 2a1 1 0 00-1 1v1H4a1 1 0 100 2h.293l.853 10.234A2 2 0 007.14 18h5.72a2 2 0 001.994-1.766L15.707 6H16a1 1 0 100-2h-2V3a1 1 0 00-1-1H7zm2 4a1 1 0 112 0v9a1 1 0 11-2 0V6zm-2 0a1 1 0 112 0v9a1 1 0 11-2 0V6zm6 0a1 1 0 10-2 0v9a1 1 0 102 0V6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {deletingId === row.submission.id ? 'Deleting...' : 'Delete Submission'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRep(row)}
                              disabled={allowSaving || deletingRepEmail === row.email}
                              className="md-btn md-btn-danger"
                              aria-label="Delete rep"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path
                                  fillRule="evenodd"
                                  d="M7 2a1 1 0 00-1 1v1H4a1 1 0 100 2h.293l.853 10.234A2 2 0 007.14 18h5.72a2 2 0 001.994-1.766L15.707 6H16a1 1 0 100-2h-2V3a1 1 0 00-1-1H7zm2 4a1 1 0 112 0v9a1 1 0 11-2 0V6zm-2 0a1 1 0 112 0v9a1 1 0 11-2 0V6zm6 0a1 1 0 10-2 0v9a1 1 0 102 0V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {deletingRepEmail === row.email ? 'Deleting...' : 'Delete Rep'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Reps */}
        {!isSupabaseConfigured() && pendingRepsEffective.length > 0 && (
          <div className="md-card mb-[var(--md-section-gap)]">
            <h2 className="md-h2 mb-4">
              Pending Submissions ({pendingRepsEffective.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingRepsEffective.map(name => (
                <div key={name} className="flex items-center gap-3 p-3 bg-[var(--md-bg-2)] rounded-[var(--md-radius-12)]">
                  <div className="w-2 h-2 bg-[var(--md-text-secondary)] rounded-full"></div>
                  <span className="text-[#1F2937]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Reps */}
        {!isSupabaseConfigured() && submittedReps.length > 0 && (
          <div className="md-card">
            <h2 className="md-h2 mb-4">
              Submitted ({submittedReps.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {submissions.map(sub => {
                const availableDays = Object.values(sub.availability).filter(Boolean).length;
                return (
                  <div key={sub.repName} className="flex items-center justify-between gap-3 p-3 bg-[var(--md-bg-2)] rounded-[var(--md-radius-12)]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-[var(--md-success)] rounded-full"></div>
                      <div>
                        <p className="text-[#1F2937] font-semibold">{sub.repName}</p>
                        <p className="md-secondary">{availableDays} days available</p>
                      </div>
                    </div>

                    {isSupabaseConfigured() && sub.source === 'supabase' && sub.id ? (
                      <button
                        onClick={() => handleDeleteSubmission(sub)}
                        disabled={deletingId === sub.id}
                        className="md-btn md-btn-danger"
                      >
                        {deletingId === sub.id ? 'Deleting...' : 'Delete'}
                      </button>
                    ) : (
                      <span className="md-small">
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
            <div
              className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--md-border)]"
              style={{ borderTopColor: 'var(--md-primary)' }}
            />
            <p className="mt-4 md-secondary">Loading submissions...</p>
          </div>
        )}

        {!loading && submissions.length === 0 && (
          <div className="text-center py-12 md-card">
            <svg
              className="w-14 h-14 mx-auto mb-4 text-[var(--md-text-secondary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75H15a3 3 0 00-6 0H7.5A2.25 2.25 0 005.25 6v14.25A2.25 2.25 0 007.5 22.5h9a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0016.5 3.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h4.5m-4.5 3h4.5" />
            </svg>
            <p className="md-secondary">No submissions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
