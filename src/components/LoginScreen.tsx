import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlobalHeader, type NavDomainKey } from './GlobalHeader';
import { OfflineIndicator } from './PWAInstallButton';

interface LoginScreenProps {
  initialMode?: 'login' | 'register';
  redirectNotice?: string | null;
  onSwitchMode?: (mode: 'login' | 'register') => void;
  onBackToHomepage?: (section?: NavDomainKey) => void;
}

const ROLE_OPTIONS = [
  'Super Admin',
  'Admin',
  'Manager',
  'Safety Officer',
  'Employee',
  'Client',
];

export function LoginScreen({
  initialMode = 'login',
  redirectNotice = null,
  onSwitchMode,
  onBackToHomepage,
}: LoginScreenProps) {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showEmailForm, setShowEmailForm] = useState(initialMode === 'register');
  const [signingIn, setSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleDesignation, setRoleDesignation] = useState('Safety Officer');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (initialMode === 'register') {
      setShowEmailForm(true);
    }
    setLocalError(null);
  }, [initialMode]);

  const changeMode = (next: 'login' | 'register') => {
    setMode(next);
    setLocalError(null);
    if (next === 'register') setShowEmailForm(true);
    onSwitchMode?.(next);
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLocalError(err?.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    setSigningIn(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(fullName.trim(), email.trim(), password, roleDesignation);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#020817] flex flex-col selection:bg-amber-400/30 selection:text-white">
      <OfflineIndicator />

      {/* Consistent Global Header on Login & Register Pages */}
      <GlobalHeader
        variant="public"
        onNavigateSection={(key) => onBackToHomepage?.(key)}
        onOpenLogin={() => changeMode('login')}
        onOpenRegister={() => changeMode('register')}
      />

      {/* Deep ambient background layers */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-10 sm:p-8 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 22% 18%, rgba(0, 191, 255, 0.22), transparent 44%), radial-gradient(circle at 78% 82%, rgba(255, 198, 41, 0.20), transparent 46%), radial-gradient(circle at 50% 50%, rgba(12, 34, 68, 0.85), #020817 78%)',
          }}
        />
        <div className="pointer-events-none absolute inset-0 arshiel-hex-bg opacity-30" />

        {/* Subtle volumetric glow orbs behind the glossy card */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-cyan-400/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[460px] h-[460px] rounded-full bg-amber-400/15 blur-[120px]" />

        {/* Centered Glossy Glass Card */}
        <div className="relative z-10 w-full max-w-[440px]">
          {/* Outer luminous rim glow */}
          <div
            className="pointer-events-none absolute -inset-[1.5px] rounded-[30px] opacity-85"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,198,41,0.45) 35%, rgba(0,191,255,0.45) 70%, rgba(255,255,255,0.25) 100%)',
            }}
          />

          {/* Frosted glossy card body */}
          <div
            className="relative overflow-hidden rounded-[28px] px-7 py-9 sm:px-9 sm:py-10 backdrop-blur-3xl border border-white/20 shadow-[0_32px_90px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.45)] flex flex-col items-center text-center"
            style={{
              background:
                'linear-gradient(155deg, rgba(255,255,255,0.14) 0%, rgba(15,28,54,0.74) 48%, rgba(4,12,28,0.90) 100%)',
            }}
          >
            {/* Specular diagonal gloss highlight */}
            <div
              className="pointer-events-none absolute -top-24 -left-24 w-[140%] h-56 -rotate-12"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0) 100%)',
              }}
            />

            {/* Top specular hairline */}
            <div className="pointer-events-none absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent" />

            {/* Glossy Emblem + Official ARSHIEL Logo */}
            <div className="relative mb-5">
              <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-tr from-amber-400/30 via-cyan-400/20 to-white/20 blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl p-1.5 bg-gradient-to-b from-white/30 via-white/10 to-white/5 border border-white/30 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-xl">
                <img
                  src="/assets/aistudio/Designer__2___1__9fac3732.png"
                  alt="ARSHIEL SAFETY"
                  className="w-full h-full rounded-xl object-cover bg-[#040B18]"
                />
              </div>
            </div>

            {/* App Name */}
            <h1 className="relative font-display text-2xl sm:text-[30px] font-extrabold tracking-[0.06em] arshiel-gold-text drop-shadow-[0_4px_18px_rgba(255,198,41,0.28)] mb-5">
              ARSHIEL SAFETY
            </h1>

            {/* Login / Register Mode Switcher */}
            <div className="relative w-full grid grid-cols-2 p-1 rounded-xl bg-white/[0.07] border border-white/15 mb-6">
              <button
                type="button"
                onClick={() => changeMode('login')}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-[#FFC629] to-[#f5b400] text-[#020817] shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => changeMode('register')}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-[#FFC629] to-[#f5b400] text-[#020817] shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Register / Sign Up
              </button>
            </div>

            {/* Protected Route Redirect Notice */}
            {redirectNotice && (
              <div className="relative w-full mb-4 rounded-xl bg-amber-400/15 border border-amber-400/40 px-3.5 py-2.5 text-xs text-amber-100 text-left flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FFC629] shrink-0" />
                <span>{redirectNotice}</span>
              </div>
            )}

            {/* Error Display */}
            {(error || localError) && (
              <div className="relative w-full mb-4 rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-3 text-xs font-medium text-red-100 text-left backdrop-blur-md">
                {localError || error}
              </div>
            )}

            {/* Primary Glossy Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="group relative w-full h-13 rounded-2xl overflow-hidden flex items-center justify-center gap-3.5 font-semibold text-[15px] text-slate-900 border border-white/80 shadow-[0_14px_34px_-8px_rgba(0,191,255,0.45),0_6px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_18px_42px_-8px_rgba(255,198,41,0.55),0_8px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 52%, #E2E8F0 100%)',
              }}
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 100%)',
                }}
              />
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/70 to-transparent" />

              <span className="relative z-10 flex items-center justify-center gap-3">
                {signingIn ? (
                  <Loader2 className="w-5 h-5 text-slate-800 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                )}
                <span className="tracking-tight">
                  {signingIn
                    ? 'Authenticating...'
                    : mode === 'register'
                      ? 'Sign up with Google'
                      : 'Continue with Google'}
                </span>
              </span>
            </button>

            {/* Toggle Email & Password Auth inside the Glossy Card */}
            <div className="relative w-full my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/15" />
              <button
                type="button"
                onClick={() => setShowEmailForm((v) => !v)}
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-[#FFC629] transition-colors cursor-pointer"
              >
                {showEmailForm ? 'Email & Password' : 'Or use Email & Password'}
              </button>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            {showEmailForm && (
              <form onSubmit={handleEmailSubmit} className="relative w-full space-y-3 text-left">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          required
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.08] border border-white/20 focus:border-[#FFC629] text-sm text-white placeholder-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Role / Designation</label>
                      <select
                        value={roleDesignation}
                        onChange={(e) => setRoleDesignation(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-[#071630] border border-white/20 focus:border-[#FFC629] text-sm text-white focus:outline-none"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.08] border border-white/20 focus:border-[#FFC629] text-sm text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      className="w-full h-10 pl-9 pr-10 rounded-xl bg-white/[0.08] border border-white/20 focus:border-[#FFC629] text-sm text-white placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.08] border border-white/20 focus:border-[#FFC629] text-sm text-white placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full h-11 mt-1 rounded-xl font-bold text-sm text-[#020817] bg-gradient-to-r from-[#FFC629] to-[#f5b400] hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {signingIn
                    ? 'Please wait...'
                    : mode === 'register'
                      ? 'Create Account'
                      : 'Sign In with Password'}
                </button>
              </form>
            )}

            {/* Bottom soft ambient glow reflection inside card */}
            <div className="pointer-events-none absolute bottom-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
