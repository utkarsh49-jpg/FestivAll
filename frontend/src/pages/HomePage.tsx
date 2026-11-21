import React from 'react';
import { useEvents } from '../context/EventContext';
import { HeroSection } from '../components/home/HeroSection';
import { FeaturedEvents } from '../components/home/FeaturedEvents';
import { Loader } from '../components/common/Loader';
import { Sparkles, Zap, Shield, Trophy } from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string, eventId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { publishedEvents, isLoading, error, refetchEvents } = useEvents();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        onExplore={() => onNavigate('events')}
        onReservations={() => onNavigate('reservations')}
        publishedCount={publishedEvents.length}
      />

      {/* College Fest Category Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('events')}
          className="p-6 rounded-3xl glass-card border border-purple-500/20 hover:border-purple-500/50 cursor-pointer transition-all duration-300 group hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white font-['Outfit'] mb-1">
            Tech & Hackathons
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            24-hour coding sprints, robotics showcases, and web dev bootcamps.
          </p>
        </div>

        <div
          onClick={() => onNavigate('events')}
          className="p-6 rounded-3xl glass-card border border-pink-500/20 hover:border-pink-500/50 cursor-pointer transition-all duration-300 group hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white font-['Outfit'] mb-1">
            Cultural & Music Nights
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live band battles, acoustic evenings, drama club productions, and dance galas.
          </p>
        </div>

        <div
          onClick={() => onNavigate('events')}
          className="p-6 rounded-3xl glass-card border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all duration-300 group hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white font-['Outfit'] mb-1">
            Keynotes & Seminars
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Industry guest speakers, AI research briefings, and career roundtables.
          </p>
        </div>
      </div>

      {/* Featured Events Section */}
      {isLoading ? (
        <Loader message="Loading fest highlights..." />
      ) : error ? (
        <div className="p-8 text-center glass-card rounded-3xl border border-rose-500/30">
          <p className="text-sm text-rose-300 font-semibold mb-3">{error}</p>
          <button
            onClick={refetchEvents}
            className="px-4 py-2 rounded-xl bg-purple-600 text-xs font-bold uppercase tracking-wider text-white"
          >
            Retry Connecting
          </button>
        </div>
      ) : (
        <FeaturedEvents
          events={publishedEvents}
          onSelectEvent={(id) => onNavigate('details', id)}
          onViewAll={() => onNavigate('events')}
        />
      )}

      {/* College Fest Info Banner */}
      <div className="p-8 md:p-12 glass-panel rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            University Auditorium Access
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            Real-Time Campus Seating Engine
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Auditorium seating updates dynamically. When a fellow student books a seat, it locks instantly to prevent double-booking. Reserve early to lock in prime balcony and orchestra seats!
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('events')}
              className="px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-md shadow-pink-600/30"
            >
              Browse Auditorium Lineup
            </button>
          </div>
        </div>

        {/* Ambient background graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-600/20 via-pink-600/10 to-transparent pointer-events-none"></div>
      </div>

    </div>
  );
};
