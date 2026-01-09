import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { normalizeEmail } from '../utils/normalizeEmail';
import '../styles/auth.css';

export default function Auth({ onAuthed, initialError = '' }) {
  const [portal, setPortal] = useState('rep'); // rep | manager
  const [mode, setMode] = useState('sign_in'); // sign_in | sign_up
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);

  const repSignupEnabled = (import.meta.env.VITE_REP_SIGNUP_ENABLED ?? 'true') === 'true';

  const title = useMemo(() => (mode === 'sign_in' ? 'Sign in' : 'Create account'), [mode]);
  const subtitle = useMemo(
    () => (portal === 'manager' ? 'Manager portal' : 'Rep portal'),
    [portal]
  );

  const isSuccessMessage = useMemo(() => {
    const message = String(error || '').trim().toLowerCase();
    return message.startsWith('account created');
  }, [error]);

  useEffect(() => {
    // Managers can only be created/administered in Supabase; no self-signup.
    if (portal === 'manager' && mode === 'sign_up') setMode('sign_in');
  }, [portal, mode]);

  useEffect(() => {
    setConfirmPassword('');
  }, [mode, portal]);

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

      if (!password || password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password
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
    <div className="auth-page">
      <div className="auth-card auth-animate-in" style={{ animationDelay: '0s' }}>
        <h1 className="auth-title auth-animate-in" style={{ animationDelay: '0s' }}>
          PC Financial Availability
        </h1>
        <p className="auth-tagline auth-animate-in" style={{ animationDelay: '0.1s' }}>
          {subtitle}
        </p>
        <p className="auth-mode auth-animate-in" style={{ animationDelay: '0.15s' }}>
          {title}
        </p>

        <div className="auth-tabs auth-animate-in" style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onClick={() => setPortal('rep')}
            disabled={submitting}
            className={`auth-tab ${portal === 'rep' ? 'is-active' : ''}`}
            aria-label="Select role: Representative"
          >
            Rep
          </button>
          <button
            type="button"
            onClick={() => setPortal('manager')}
            disabled={submitting}
            className={`auth-tab ${portal === 'manager' ? 'is-active' : ''}`}
            aria-label="Select role: Manager"
          >
            Manager
          </button>
        </div>

        {portal === 'manager' && (
          <p className="auth-hint auth-animate-in" style={{ animationDelay: '0.25s' }}>
            Requires a manager account (role set in Supabase <code>app_metadata</code>).
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form auth-animate-in" style={{ animationDelay: '0.3s' }}>
          <div>
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <svg className="auth-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M2.94 6.34A2 2 0 014 5h12a2 2 0 011.06.34L10 10.19 2.94 6.34z" />
                <path d="M18 8.07l-7.4 4.53a1 1 0 01-1.2 0L2 8.07V13a2 2 0 002 2h12a2 2 0 002-2V8.07z" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`auth-input ${error && !isSuccessMessage ? 'is-error' : ''}`}
                autoComplete="email"
                placeholder="you@company.com"
                disabled={submitting}
                required
                aria-label="Email address"
              />
            </div>
          </div>

          <div>
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <svg className="auth-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5 8a5 5 0 0110 0v1h1a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a1 1 0 011-1h1V8zm2 1h6V8a3 3 0 10-6 0v1z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`auth-input ${error && !isSuccessMessage ? 'is-error' : ''}`}
                autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                disabled={submitting}
                required
                aria-label="Password"
              />
              <button
                type="button"
                className="auth-toggle"
                onClick={() => setShowPassword((v) => !v)}
                disabled={submitting}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M3.172 3.172a.75.75 0 011.06 0l12.596 12.596a.75.75 0 11-1.06 1.06l-2.22-2.22A8.71 8.71 0 0110 15.5c-4.93 0-8.56-4.19-8.56-4.19a.75.75 0 010-.94A15.68 15.68 0 015.04 6.8L3.172 4.232a.75.75 0 010-1.06zm3.017 4.078A14.2 14.2 0 003.07 10c.93 1.01 3.85 3.5 6.93 3.5a7.2 7.2 0 002.13-.33l-1.46-1.46a2.5 2.5 0 01-3.38-3.38l-1.101-1.101zM14.99 12.93l-1.64-1.64a2.5 2.5 0 00-3.64-3.64L8.17 6.01A7.2 7.2 0 0110 5.5c4.93 0 8.56 4.19 8.56 4.19a.75.75 0 010 .94 15.68 15.68 0 01-3.57 3.31z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 5.5c-4.93 0-8.56 4.19-8.56 4.19a.75.75 0 000 .94S5.07 15.5 10 15.5s8.56-4.19 8.56-4.19a.75.75 0 000-.94S14.93 5.5 10 5.5zm0 8a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
                    <path d="M10 8.25a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'sign_up' && portal === 'rep' && (
            <div>
              <label className="auth-label">Confirm password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5 8a5 5 0 0110 0v1h1a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a1 1 0 011-1h1V8zm2 1h6V8a3 3 0 10-6 0v1z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`auth-input ${error && !isSuccessMessage ? 'is-error' : ''}`}
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                  aria-label="Confirm password"
                />
              </div>
            </div>
          )}

          {error && (
            <div className={`auth-alert ${isSuccessMessage ? 'auth-alert--success' : 'auth-alert--error'}`} role="alert">
              {isSuccessMessage ? (
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="auth-submit"
            aria-label={title}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {submitting && <span className="auth-spinner" aria-hidden="true" />}
              {submitting ? (mode === 'sign_in' ? 'Signing in...' : 'Creating...') : title}
            </span>
          </button>
        </form>

        <div className="auth-footer auth-animate-in" style={{ animationDelay: '0.5s' }}>
          {portal === 'manager' ? (
            <p>No manager sign-up. Use an admin-created manager account.</p>
          ) : mode === 'sign_in' ? (
            <>
              No account?
              <button
                className="auth-link"
                onClick={() => setMode('sign_up')}
                disabled={submitting}
                type="button"
                aria-label="Go to account creation page"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Have an account?
              <button
                className="auth-link"
                onClick={() => setMode('sign_in')}
                disabled={submitting}
                type="button"
                aria-label="Sign in"
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
