import { useState, useEffect } from 'react';
import RepForm from './components/RepForm';
import ManagerDashboard from './components/ManagerDashboard';
import Auth from './components/Auth';
import { initGoogleSheets, isGoogleSheetsConfigured } from './utils/googleSheets';
import { isSupabaseConfigured, supabase } from './utils/supabaseClient';
import { ensureProfile, getAllReps, isRepAllowlisted } from './utils/supabaseApi';

// Sample rep names - replace with your actual list
const REP_NAMES = [
  'John Smith',
  'Sarah Johnson',
  'Michael Brown',
  'Emily Davis',
  'David Wilson',
  'Jessica Martinez',
  'James Anderson',
  'Ashley Taylor',
  'Christopher Thomas',
  'Amanda Jackson',
  'Matthew White',
  'Jennifer Harris',
  'Daniel Martin',
  'Michelle Thompson',
  'Robert Garcia',
  'Lisa Rodriguez',
  'Joseph Lewis',
  'Karen Lee',
  'Charles Walker',
  'Nancy Hall'
].sort();

// Manager access code - simple authentication
const MANAGER_CODE = '1234';

function App() {
  const [view, setView] = useState('rep'); // 'rep' or 'manager'
  const [apiReady, setApiReady] = useState(false);
  const [showManagerAuth, setShowManagerAuth] = useState(false);
  const [managerInput, setManagerInput] = useState('');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [repNames, setRepNames] = useState(REP_NAMES);
  const [requestedPortal, setRequestedPortal] = useState(null); // rep | manager | null
  const [portalError, setPortalError] = useState('');
  const [authError, setAuthError] = useState('');

  const supabaseMode = isSupabaseConfigured();
  const isManager = supabaseMode && session?.user?.app_metadata?.role === 'manager';

  // In Supabase mode, view is role-based (managers never see rep UI; reps never see manager UI).
  const effectiveView = supabaseMode ? (isManager ? 'manager' : 'rep') : view;

  const effectiveRepName = isSupabaseConfigured()
    ? (profile?.full_name ||
        session?.user?.user_metadata?.full_name ||
        session?.user?.user_metadata?.fullName ||
        session?.user?.email ||
        '')
    : '';

  const effectiveRepEmail = supabaseMode ? session?.user?.email || '' : '';

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });
      setApiReady(true);
      return () => sub.subscription.unsubscribe();
    }

    // Google Sheets mode: load Google API script (only if configured; otherwise offline-only still works)
    if (!isGoogleSheetsConfigured()) {
      setApiReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = async () => {
      try {
        await initGoogleSheets();
        setApiReady(true);
      } catch (error) {
        console.error('Failed to initialize Google Sheets:', error);
        setApiReady(true);
      }
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isSupabaseConfigured()) return;
      if (!session?.user) {
        setProfile(null);
        setRepNames(REP_NAMES);
        setPortalError('');
        return;
      }

      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.fullName ||
        session.user.email;

      try {
        const prof = await ensureProfile({ userId: session.user.id, fullName });
        setProfile(prof);
      } catch (error) {
        console.error('Failed to load profile:', error);
        setProfile(null);
      }
    };

    loadProfile();
  }, [session]);

  useEffect(() => {
    const enforceRepAccess = async () => {
      if (!supabaseMode) return;
      if (!session?.user) return;
      if (isManager) return;
      if (!session.user.email) return;

      try {
        const allowed = await isRepAllowlisted(session.user.email);
        if (!allowed) {
          setAuthError('This account is not permitted. Please contact a manager.');
          await supabase.auth.signOut();
        } else {
          setAuthError('');
        }
      } catch (error) {
        console.error('Failed to verify rep permission:', error);
      }
    };

    enforceRepAccess();
  }, [supabaseMode, isManager, session?.user?.id, session?.user?.email]);

  useEffect(() => {
    const loadReps = async () => {
      if (!isSupabaseConfigured()) return;
      const isManager = profile?.role === 'manager' || session?.user?.app_metadata?.role === 'manager';
      if (!isManager) return;

      try {
        const reps = await getAllReps();
        setRepNames(
          reps
            .filter((r) => r.role === 'rep')
            .map((r) => r.full_name)
            .filter(Boolean)
            .sort()
        );
      } catch (error) {
        console.error('Failed to load reps:', error);
      }
    };

    loadReps();
  }, [profile?.role, session?.user?.app_metadata?.role]);

  useEffect(() => {
    if (!supabaseMode) return;
    if (!session?.user) return;
    if (!requestedPortal) return;

    if (requestedPortal === 'manager') {
      setPortalError(isManager ? '' : 'This account is not authorized for the manager portal.');
      return;
    }

    setPortalError('');
  }, [requestedPortal, session?.user, supabaseMode, isManager]);

  const handleManagerAccess = () => {
    if (managerInput === MANAGER_CODE) {
      setView('manager');
      setShowManagerAuth(false);
      setManagerInput('');
    } else {
      alert('Incorrect access code');
      setManagerInput('');
    }
  };

  if (!apiReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pc-light to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-pc-blue mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured() && !session) {
    return (
      <Auth
        initialError={authError}
        onAuthed={(nextSession, portal) => {
          setAuthError('');
          setRequestedPortal(portal);
          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <div className="relative">
      {effectiveView === 'rep' ? (
        <>
          {portalError && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <p className="text-sm text-yellow-800">{portalError}</p>
            </div>
          )}
          <RepForm
            repNames={supabaseMode ? [] : repNames}
            repName={supabaseMode ? effectiveRepName : undefined}
            repEmail={supabaseMode ? effectiveRepEmail : undefined}
            userId={supabaseMode ? session?.user?.id : undefined}
          />

          {/* Floating Manager Button */}
          {supabaseMode ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="fixed bottom-6 right-6 px-5 py-3 bg-white text-pc-blue border-2 border-pc-blue rounded-xl shadow-lg hover:bg-pc-light transition font-bold"
              aria-label="Sign Out"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => setShowManagerAuth(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-pc-blue text-white rounded-full shadow-lg hover:bg-pc-dark transition flex items-center justify-center"
              aria-label="Manager Access"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Manager Auth Modal */}
          {!isSupabaseConfigured() && showManagerAuth && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Manager Access</h3>
                <input
                  type="password"
                  value={managerInput}
                  onChange={(e) => setManagerInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManagerAccess()}
                  placeholder="Enter access code"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowManagerAuth(false);
                      setManagerInput('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManagerAccess}
                    className="flex-1 px-4 py-2 bg-pc-blue text-white rounded-lg font-medium hover:bg-pc-dark transition"
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <ManagerDashboard
          repNames={repNames}
          onBackToRep={() => setView('rep')}
        />
      )}
    </div>
  );
}

export default App;
