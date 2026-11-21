import React from 'react';

export const SeatLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 glass-card rounded-2xl border border-white/10 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-lg bg-purple-950/80 border border-cyan-400/50 shadow-sm shadow-cyan-500/20"></div>
        <span className="text-slate-300 font-medium">Available</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-pink-500 to-amber-400 border border-white/40 shadow-md shadow-pink-500/30 scale-105"></div>
        <span className="text-pink-300 font-bold">Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-lg bg-slate-800/80 border border-slate-700 opacity-60"></div>
        <span className="text-slate-400 font-medium">Already Booked</span>
      </div>
    </div>
  );
};
