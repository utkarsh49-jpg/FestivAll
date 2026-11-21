import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-24 border-t border-white/10 glass-panel relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black text-white font-['Outfit']">
                Festiv<span className="text-gradient-fest">All</span> Campus 2026
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              The central booking & interactive auditorium reservation portal for university hackathons, cultural nights, tech showcases, and guest keynote seminars.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 animate-pulse" />
              <span>for Campus Fest Submissions</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
              Event Highlights
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-purple-300 transition-colors cursor-pointer">Tech Fest & Hackathons</li>
              <li className="hover:text-pink-300 transition-colors cursor-pointer">Cultural & Music Nights</li>
              <li className="hover:text-amber-300 transition-colors cursor-pointer">Web & AI Bootcamps</li>
              <li className="hover:text-cyan-300 transition-colors cursor-pointer">Robotics Demonstrations</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300 mb-3">
              Auditoriums & Venues
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Main Auditorium 8</li>
              <li>Seminar Hall A & B</li>
              <li>Innovation Center 15</li>
              <li>Central Courtyard & Lawns</li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 FestivAll Campus Events. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
              React + Vite + TypeScript
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
              Tailwind CSS
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
              Express API Integrated
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
