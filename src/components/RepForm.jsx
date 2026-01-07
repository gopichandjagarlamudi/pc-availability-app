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
      <div className="min-h-screen bg-gradient-to-b from-pc-light to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Submission Closed</h2>
          <p className="text-gray-600 mb-6">
            The submission period for this cycle has ended.
          </p>
          <div className="bg-pc-light rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Next submission opens:</p>
            <p className="text-lg font-bold text-pc-blue">
              {formatDateFull(nextOpenDate)}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            You'll be able to submit your availability for the next period starting Sunday.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pc-light to-white">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {lockDisabled && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-yellow-800">
              Submission lock is disabled for testing (`VITE_DISABLE_SUBMISSION_LOCK=true`).
            </p>
          </div>
        )}
        {/* Header */}
        <div className="bg-pc-blue text-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">PC Financial Availability</h1>
          <p className="text-pc-light text-sm">
            Submit your availability for Week {collectionPeriod.weekNumbers[0]}-{collectionPeriod.weekNumbers[1]}
          </p>
          <p className="text-white font-medium mt-2">
            {formatDateFull(collectionPeriod.start)} - {formatDateFull(collectionPeriod.end)}
          </p>
        </div>

        {/* Deadline Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-bold">Deadline:</span> {formatDateFull(deadline)} at 11:59 PM
          </p>
        </div>

        {/* Rep Selection */}
        {supabaseMode ? (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <p className="text-sm text-gray-600 mb-1">Signed in as</p>
            <p className="text-lg font-bold text-gray-900">{repName || 'Loading...'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Name
            </label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
              disabled={loading}
            >
              <option value="">-- Choose your name --</option>
              {repNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedRep && (
          <form onSubmit={handleSubmit}>
            {/* Quick Actions */}
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={selectAllAvailable}
                className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition"
              >
                All Available
              </button>
              <button
                type="button"
                onClick={selectAllUnavailable}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                All Unavailable
              </button>
            </div>

            {/* Date Selection */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Select Available Days
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Available = 08:00 - 20:00 (automatic)
              </p>

              <div className="space-y-3">
                {collectionDates.map(date => {
                  const dateStr = formatDateStorage(date);
                  const isAvailable = availability[dateStr] || false;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => toggleAvailability(dateStr)}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition ${
                        isAvailable
                          ? 'bg-green-50 border-green-400'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isAvailable
                            ? 'bg-green-500 border-green-500'
                            : 'bg-white border-gray-300'
                        }`}>
                          {isAvailable && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatDateDisplay(date)}
                          </p>
                          {isAvailable && (
                            <p className="text-sm text-green-600">08:00 - 20:00</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        isAvailable ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {isAvailable ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition transform ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-pc-blue hover:bg-pc-dark active:scale-95'
              }`}
            >
              {loading ? 'Submitting...' : 'Submit Availability'}
            </button>

            {/* Success Message */}
            {submitted && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-lg text-green-800 text-center font-medium">
                {successMessage || error || 'Availability submitted successfully!'}
              </div>
            )}

            {/* Error Message */}
            {error && !submitted && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-lg text-red-800 text-center">
                {error}
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-600">
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
