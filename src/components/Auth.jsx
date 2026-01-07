import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { normalizeEmail } from '../utils/normalizeEmail';

export default function Auth({ onAuthed, initialError = '' }) {
  const [portal, setPortal] = useState('rep'); // rep | manager
  const [mode, setMode] = useState('sign_in'); // sign_in | sign_up
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);

  const repSignupEnabled = (import.meta.env.VITE_REP_SIGNUP_ENABLED ?? 'true') === 'true';

  const title = useMemo(() => (mode === 'sign_in' ? 'Sign in' : 'Create account'), [mode]);
  const subtitle = useMemo(
    () => (portal === 'manager' ? 'Manager portal' : 'Rep portal'),
    [portal]
  );

  useEffect(() => {
    // Managers can only be created/administered in Supabase; no self-signup.
    if (portal === 'manager' && mode === 'sign_up') setMode('sign_in');
  }, [portal, mode]);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      if (mode === 'sign_in') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (signInError) throw signInError;
        onAuthed?.(data.session, portal);
        return;
      }

      if (portal !== 'rep') {
        setError('Manager accounts are created by an admin. Please sign in with a manager account.');
        return;
      }

      if (!repSignupEnabled) {
        setError('Rep sign-up is disabled. Please contact a manager to create your account.');
        return;
      }

      if (!fullName.trim()) {
        setError('Please enter your name');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() }
        }
      });
      if (signUpError) throw signUpError;

      if (!data.session) {
        setError('Account created. Please check your email to confirm, then sign in.');
        setMode('sign_in');
        return;
      }

      onAuthed?.(data.session, portal);
    } catch (err) {
      const message = err?.message || 'Authentication failed';
      if (portal === 'rep' && mode === 'sign_up' && message.toLowerCase().includes('not permitted')) {
        setError('This email is not permitted to sign up. Please contact a manager.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pc-light to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">PC Financial Availability</h1>
        <p className="text-gray-600 mb-2">{subtitle}</p>
        <p className="text-gray-600 mb-6">{title}</p>

        <div className="mb-6">
          <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setPortal('rep')}
              disabled={submitting}
              className={`py-3 font-bold transition ${
                portal === 'rep' ? 'bg-pc-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Rep
            </button>
            <button
              type="button"
              onClick={() => setPortal('manager')}
              disabled={submitting}
              className={`py-3 font-bold transition ${
                portal === 'manager' ? 'bg-pc-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Manager
            </button>
          </div>
          {portal === 'manager' && (
            <p className="mt-2 text-xs text-gray-500">
              Requires a manager account (role set in Supabase `app_metadata`).
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'sign_up' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
                autoComplete="name"
                placeholder="Jane Doe"
                disabled={submitting}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
              autoComplete="email"
              placeholder="you@company.com"
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-pc-blue focus:outline-none"
              autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
              disabled={submitting}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition ${
              submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-pc-blue hover:bg-pc-dark'
            }`}
          >
            {submitting ? 'Please wait...' : title}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 text-center">
          {portal === 'manager' ? (
            <p className="text-xs text-gray-500">No manager sign-up. Use an admin-created manager account.</p>
          ) : mode === 'sign_in' ? (
            <>
              No account?{' '}
              <button
                className="text-pc-blue font-medium hover:underline"
                onClick={() => setMode('sign_up')}
                disabled={submitting}
                type="button"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button
                className="text-pc-blue font-medium hover:underline"
                onClick={() => setMode('sign_in')}
                disabled={submitting}
                type="button"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
