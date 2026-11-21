import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { X, Sparkles, User, Lock, Mail, AlertCircle, LogOut, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, currentUser, isAuthenticated, login, register, logout } = useUser();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setSuccessMessage('Welcome back! Authentication successful.');
      setTimeout(() => {
        setSuccessMessage(null);
        closeAuthModal();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please check your email and password.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage('Please enter your campus email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(regName.trim(), regEmail.trim(), regPassword);
      setSuccessMessage('Student account created successfully! Pass generated.');
      setTimeout(() => {
        setSuccessMessage(null);
        closeAuthModal();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your details.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-purple-500/30 p-6 md:p-8 shadow-2xl shadow-purple-900/50 overflow-hidden">
        
        {/* Fest gradient top strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-400 p-[2px] shadow-lg shadow-pink-500/20">
            <div className="w-full h-full bg-[#0d0922] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse-slow" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white font-['Outfit']">
              Fest Pass <span className="text-gradient-fest">Portal</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isAuthenticated ? 'Manage Your Student Account' : 'Campus Event Authentication'}
            </p>
          </div>
        </div>

        {/* If already authenticated, show user card */}
        {isAuthenticated && currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Logged In As:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-base font-bold text-white font-['Outfit']">{currentUser.name}</p>
              <p className="text-xs text-slate-300 font-mono">{currentUser.email}</p>
              <p className="text-[10px] text-slate-500">Student ID #{currentUser.id}</p>
            </div>

            <button
              onClick={() => {
                logout();
                closeAuthModal();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'login'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === 'register'
                    ? 'border-pink-500 text-pink-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Register Student
              </button>
            </div>

            {/* Error & Success Feedback */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Tab 1: Real Login Form */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Campus Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="student@campus.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
            )}

            {/* Tab 2: Real Registration Form */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Utkarsh Jha"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Campus Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="student@campus.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-[11px] text-purple-300 leading-tight">
                  ℹ️ Public registration creates an authentic <strong className="text-white">STUDENT</strong> account with encrypted password hashing.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:opacity-95 shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register Student Pass</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
