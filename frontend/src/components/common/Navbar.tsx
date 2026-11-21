import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { Sparkles, Calendar, Ticket, User, Menu, X, LogIn, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  reservationCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, reservationCount = 0 }) => {
  const { currentUser, isAuthenticated, openAuthModal, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 shadow-lg shadow-purple-950/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Fest Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-[2px] shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#0d0922] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white font-['Outfit']">
                  Festiv<span className="text-gradient-fest">All</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Campus 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-1 hidden sm:block">
                College Fest Event & Auditorium Booking
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('home')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                currentTab === 'home'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('events')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                currentTab === 'events'
                  ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              All Events
            </button>
            <button
              onClick={() => onNavigate('reservations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                currentTab === 'reservations'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Ticket className="w-4 h-4" />
              My Reservations
              {reservationCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm">
                  {reservationCount}
                </span>
              )}
            </button>

            {/* Organizer Hub (Organizer & Admin) */}
            {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
              <button
                onClick={() => onNavigate('organizer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  currentTab === 'organizer'
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-purple-400" />
                Organizer Hub
              </button>
            )}

            {/* Admin Console (Admin Only) */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  currentTab === 'admin'
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Admin Console
              </button>
            )}
          </nav>

          {/* Right Header: Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:border-purple-500/50 text-left transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white max-w-[120px] truncate">
                        {currentUser.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold uppercase">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono">
                      {currentUser.email}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-md shadow-pink-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && currentUser ? (
              <button
                onClick={openAuthModal}
                className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-xs font-bold text-purple-300"
              >
                {currentUser.name.split(' ')[0]}
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-2.5 py-1 rounded-lg bg-pink-600/30 border border-pink-500/40 text-xs font-bold text-pink-300"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-white/10 px-4 pt-2 pb-6 space-y-3">
          <button
            onClick={() => {
              onNavigate('home');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'home' ? 'bg-purple-600/20 text-purple-300' : 'text-slate-300'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate('events');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'events' ? 'bg-pink-600/20 text-pink-300' : 'text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              All Events
            </span>
          </button>
          <button
            onClick={() => {
              onNavigate('reservations');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'reservations' ? 'bg-cyan-600/20 text-cyan-300' : 'text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              My Reservations
            </span>
            {reservationCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-pink-500 text-white">
                {reservationCount}
              </span>
            )}
          </button>

          {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
            <button
              onClick={() => {
                onNavigate('organizer');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                currentTab === 'organizer' ? 'bg-purple-600/20 text-purple-300' : 'text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              Organizer Hub
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => {
                onNavigate('admin');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                currentTab === 'admin' ? 'bg-amber-600/20 text-amber-300' : 'text-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Admin Console
            </button>
          )}

          <div className="pt-2 border-t border-white/10">
            {isAuthenticated && currentUser ? (
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-300 bg-rose-500/10 border border-rose-500/30 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({currentUser.name})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  openAuthModal();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
