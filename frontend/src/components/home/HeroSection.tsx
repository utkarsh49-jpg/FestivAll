import React from 'react';
import { Ticket, Compass, Flame } from 'lucide-react';
import { useUser } from '../../context/UserContext';

interface HeroSectionProps {
  onExplore: () => void;
  onReservations: () => void;
  publishedCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExplore,
  onReservations,
  publishedCount,
}) => {
  const { currentUser } = useUser();

  return (
    <div className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      
      {/* Background colorful fest glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-600/25 via-pink-600/20 to-amber-500/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-cyan-500/15 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      <div className="max-w-4xl mx-auto text-center space-y-6">
        
        {/* Fest Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-pink-500/30 text-xs font-bold uppercase tracking-wider text-pink-300 shadow-lg shadow-pink-500/10">
          <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>Annual College Mega Festival • 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
          <span className="text-amber-300">Live Booking Active</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white font-['Outfit'] tracking-tight leading-[1.1]">
          Experience Campus Life <br />
          <span className="text-gradient-fest">In Full Vibration</span>
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Reserve your front-row auditorium seats for hackathons, guest keynotes, robotics clashes, and unforgettable cultural nights with real-time seat availability.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <button
            onClick={onExplore}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 shadow-xl shadow-pink-600/30 hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
          >
            <Compass className="w-4 h-4" />
            <span>Explore {publishedCount} Published Events</span>
          </button>

          <button
            onClick={onReservations}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-wider text-slate-200 glass-card border border-white/15 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2.5"
          >
            <Ticket className="w-4 h-4 text-cyan-400" />
            <span>My Reservations</span>
          </button>
        </div>

        {/* User Session Indicator */}
        <div className="pt-2">
          {currentUser ? (
            <p className="text-xs text-slate-400">
              Signed in as <strong className="text-purple-300 font-semibold">{currentUser.name}</strong> ({currentUser.email} • {currentUser.role})
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Sign in or register to reserve auditorium seats and manage bookings.
            </p>
          )}
        </div>

        {/* Fest Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 max-w-3xl mx-auto">
          <div className="p-4 rounded-2xl glass-card border border-white/5">
            <div className="text-2xl font-black text-white font-['Outfit']">{publishedCount}+</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 mt-0.5">
              Published Events
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/5">
            <div className="text-2xl font-black text-white font-['Outfit']">20+</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-pink-300 mt-0.5">
              Campus Venues
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/5">
            <div className="text-2xl font-black text-white font-['Outfit']">100%</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 mt-0.5">
              Live Seat Grid
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/5">
            <div className="text-2xl font-black text-white font-['Outfit']">Instant</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 mt-0.5">
              Pass Issuance
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
