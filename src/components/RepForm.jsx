import { useState, useEffect } from 'react';
import {
  getCollectionPeriod,
  getCollectionDates,
  formatDateDisplay,
  formatDateStorage,
  formatDateFull,
  getSubmissionDeadline,
  isSubmissionLocked,
  getNextSubmissionOpenDate
} from '../utils/dateCalculations';
import {
  saveToLocalStorage,
  getFromLocalStorage
} from '../utils/googleSheets';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import * as supabaseApi from '../utils/supabaseApi';
import * as sheetsApi from '../utils/googleSheets';
import '../styles/repAvailability.css';

export default function RepForm({ repNames, repName, repEmail, userId }) {
  const supabaseMode = isSupabaseConfigured();
  const lockDisabled = import.meta.env.VITE_DISABLE_SUBMISSION_LOCK === 'true';
  const [selectedRep, setSelectedRep] = useState(repName || '');
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const collectionPeriod = getCollectionPeriod();
  const collectionDates = getCollectionDates();
  const deadline = getSubmissionDeadline();
  const nextOpenDate = getNextSubmissionOpenDate();

  useEffect(() => {
    setIsLocked(lockDisabled ? false : isSubmissionLocked());

    // Check every minute if we've crossed the deadline
    const interval = setInterval(() => {
      setIsLocked(lockDisabled ? false : isSubmissionLocked());
    }, 60000);

    return () => clearInterval(interval);
  }, [lockDisabled]);

  useEffect(() => {
    if (repName) setSelectedRep(repName);
  }, [repName]);

  useEffect(() => {
    if (selectedRep) {
      loadExistingAvailability();
    }
  }, [selectedRep]);

  const loadExistingAvailability = async () => {
    setLoading(true);
    try {
      let data = {};

      if (supabaseMode && userId) {
        data = await supabaseApi.getRepAvailability({ userId, cycleId: collectionPeriod.cycleId });
      } else {
        // Google Sheets mode
        data = await sheetsApi.getRepAvailability(selectedRep, collectionPeriod.cycleId);
      }

      if (Object.keys(data).length === 0) {
        if (!supabaseMode) {
          // Google Sheets offline fallback: check local storage
          const localData = getFromLocalStorage(selectedRep || repName, collectionPeriod.cycleId);
          if (localData) {
            setAvailability(localData.availability);
            return;
          }
        }

        // Initialize with all days as not available
        const initial = {};
        collectionDates.forEach(date => {
          initial[formatDateStorage(date)] = false;
        });
        setAvailability(initial);
      } else {
        setAvailability(data);
      }
    } catch (err) {
      if (!supabaseMode) {
        // Google Sheets offline mode - use local storage
        const localData = getFromLocalStorage(selectedRep, collectionPeriod.cycleId);
        if (localData) {
          setAvailability(localData.availability);
          return;
        }
      }

      const initial = {};
      collectionDates.forEach(date => {
        initial[formatDateStorage(date)] = false;
      });
      setAvailability(initial);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = (dateStr) => {
    setAvailability(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const effectiveName = repName || selectedRep;

    if (!effectiveName) {
      setError(supabaseMode ? 'Profile is still loading. Please try again.' : 'Please select your name');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (supabaseMode) {
        if (!userId) throw new Error('Not signed in');
        const row = await supabaseApi.submitAvailability({
          userId,
          repName: effectiveName,
          repEmail,
          cycleId: collectionPeriod.cycleId,
          availability
        });
        setSuccessMessage(`Saved to database (cycle ${row?.cycle_id}).`);
      } else {
        // Save to local storage first (offline support)
        saveToLocalStorage(effectiveName, availability, collectionPeriod.cycleId);

        // Try to submit to Google Sheets
        await sheetsApi.submitAvailability(selectedRep, availability, collectionPeriod.cycleId);
        setSuccessMessage('Availability submitted successfully!');
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error('Submit failed:', err);
      if (supabaseMode) {
        setError(`Database save failed: ${err?.message || 'Unknown error'}.`);
      } else {
        // If online submission fails, inform user it's saved locally
        setError('Saved locally. Will sync when online.');
      }
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setError('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const selectAllAvailable = () => {
    const allAvailable = {};
    collectionDates.forEach(date => {
      allAvailable[formatDateStorage(date)] = true;
    });
    setAvailability(allAvailable);
  };

  const selectAllUnavailable = () => {
    const allUnavailable = {};
    collectionDates.forEach(date => {
      allUnavailable[formatDateStorage(date)] = false;
    });
    setAvailability(allUnavailable);
  };

  if (isLocked && !lockDisabled) {
    return (
      <div className="rep-availability flex items-center justify-center p-[var(--ra-page-pad)]">
        <div className="max-w-md w-full ra-info-card ra-animate-in">
          <div className="w-14 h-14 rounded-full bg-[var(--ra-bg-2)] flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-[var(--ra-primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V8.25a4.5 4.5 0 10-9 0V10.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 10.5h10.5v9a2.25 2.25 0 01-2.25 2.25h-6A2.25 2.25 0 016.75 19.5v-9z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-[var(--ra-text)] text-center mb-2">Submission Closed</h2>
          <p className="ra-secondary text-center mb-5">The submission period for this cycle has ended.</p>
          <div className="ra-info-card ra-info-card--deadline mb-4">
            <p className="ra-info-label">Next submission opens</p>
            <p className="ra-info-value">{formatDateFull(nextOpenDate)}</p>
          </div>
          <p className="ra-secondary text-center text-[12px]">
            You'll be able to submit your availability for the next period starting Sunday.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rep-availability">
      <div className="max-w-[900px] mx-auto pb-24 p-[var(--ra-page-pad)]">
        {lockDisabled && (
          <div className="ra-banner-warning mb-4 ra-animate-in" style={{ animationDelay: '0s' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.516 11.596c.75 1.335-.213 2.999-1.742 2.999H3.483c-1.53 0-2.492-1.664-1.743-2.999L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              Submission lock is disabled for testing (<code>VITE_DISABLE_SUBMISSION_LOCK=true</code>).
            </div>
          </div>
        )}
        {/* Header */}
        <div className="ra-header mb-5 ra-animate-in" style={{ animationDelay: lockDisabled ? '0.05s' : '0s' }}>
          <h1 className="ra-h1">PC Financial Availability</h1>
          <p className="ra-subtitle">
            Submit your availability for Week {collectionPeriod.weekNumbers[0]}-{collectionPeriod.weekNumbers[1]}
          </p>
          <p className="ra-date-range">{formatDateFull(collectionPeriod.start)} - {formatDateFull(collectionPeriod.end)}</p>
        </div>

        {/* Deadline Notice */}
        <div className="ra-info-card ra-info-card--deadline mb-5 ra-animate-in" style={{ animationDelay: '0.1s' }}>
          <p className="ra-info-label">Deadline</p>
          <p className="ra-info-value">{formatDateFull(deadline)} at 11:59 PM</p>
        </div>

        {/* Rep Selection */}
        {supabaseMode ? (
          <div className="ra-info-card mb-6 ra-animate-in" style={{ animationDelay: '0.2s' }}>
            <p className="ra-identity-label">Signed in as</p>
            <p className="ra-identity-name">
              <svg className="ra-avatar" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 2a5 5 0 00-5 5v1a5 5 0 1010 0V7a5 5 0 00-5-5zm-7 16a7 7 0 0114 0v.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 18.5V18z"
                  clipRule="evenodd"
                />
              </svg>
              {repName || 'Loading...'}
            </p>
          </div>
        ) : (
          <div className="ra-info-card mb-6 ra-animate-in" style={{ animationDelay: '0.2s' }}>
            <label className="ra-identity-label">
              Select Your Name <span className="ra-required">*</span>
            </label>
            <div className="ra-select-wrap">
              <select
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
                className="ra-input"
                disabled={loading}
                aria-label="Select your name"
              >
                <option value="">-- Choose your name --</option>
                {repNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <svg className="ra-select-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.936a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}

        {selectedRep && (
          <form onSubmit={handleSubmit}>
            {/* Quick Actions */}
            <div className="ra-actions mb-6 ra-animate-in" style={{ animationDelay: '0.3s' }}>
              <button
                type="button"
                onClick={selectAllAvailable}
                className="ra-btn ra-btn-primary flex-1"
                aria-label="Toggle all days as available"
              >
                All Available
              </button>
              <button
                type="button"
                onClick={selectAllUnavailable}
                className="ra-btn ra-btn-outline flex-1"
                aria-label="Toggle all days as unavailable"
              >
                All Unavailable
              </button>
            </div>

            {/* Date Selection */}
            <div className="ra-info-card mb-6 ra-animate-in" style={{ animationDelay: '0.35s' }}>
              <h2 className="ra-section-title">Select Available Days</h2>
              <p className="ra-helper mb-4">Available = 08:00 - 20:00 (automatic)</p>
              <div className="space-y-3">
                {collectionDates.map((date, index) => {
                  const dateStr = formatDateStorage(date);
                  const isAvailable = availability[dateStr] || false;
                  const delay = 0.15 + Math.min(index * 0.03, 0.35);

                  return (
                    <label
                      key={dateStr}
                      className={`ra-day-card ra-animate-in ${isAvailable ? 'is-selected' : ''}`}
                      style={{ animationDelay: `${delay}s` }}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isAvailable}
                        onChange={() => toggleAvailability(dateStr)}
                        aria-label={`Select availability for ${formatDateDisplay(date)}`}
                      />
                      <div className="ra-day-left">
                        <div className={`ra-checkbox ${isAvailable ? 'is-checked' : ''}`} aria-hidden="true">
                          {isAvailable && (
                            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="ra-day-title">{formatDateDisplay(date)}</p>
                          <p className="ra-day-time">08:00 - 20:00</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAvailable ? (
                          <span className="ra-badge ra-badge--available">
                            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Available
                          </span>
                        ) : (
                          <span className="ra-badge ra-badge--unavailable">
                            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.646-10.354a.5.5 0 00-.707-.707L10 8.879 8.061 6.94a.5.5 0 10-.707.707L9.293 9.586l-1.939 1.939a.5.5 0 00.707.707L10 10.293l1.939 1.939a.5.5 0 00.707-.707l-1.939-1.939 1.939-1.939z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Not Available
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            {(() => {
              const showSuccess = submitted && !error && Boolean(successMessage);
              return (
                <button
                  type="submit"
                  disabled={loading}
                  className={`ra-submit ra-animate-in ${showSuccess ? 'is-success' : ''}`}
                  style={{ animationDelay: '0.6s' }}
                  aria-label="Submit availability form"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {loading && <span className="ra-spinner" aria-hidden="true" />}
                    {!loading && showSuccess && (
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {loading ? 'Submitting...' : showSuccess ? 'Submitted Successfully' : 'Submit Availability'}
                  </span>
                </button>
              );
            })()}

            {error && !submitted && (
              <div className="ra-feedback ra-feedback--error">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>{error}</div>
              </div>
            )}

            {submitted && (
              <div className={`ra-feedback ${error ? 'ra-feedback--error' : 'ra-feedback--success'}`}>
                {error ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <div>{successMessage || error || 'Availability submitted successfully!'}</div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 ra-note ra-animate-in" style={{ animationDelay: '0.65s' }}>
              <p className="mb-2">
                <strong>Note:</strong> You can edit your submission anytime before the deadline.
              </p>
              <p>
                Days marked as "Available" will automatically be set to 08:00 - 20:00.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
