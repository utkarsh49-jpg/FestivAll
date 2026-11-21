import React from 'react';
import { Seat } from '../../types';
import { Check, Lock } from 'lucide-react';

interface SeatItemProps {
  seat: Seat;
  isSelected: boolean;
  onSelect: (seat: Seat) => void;
}

export const SeatItem: React.FC<SeatItemProps> = ({ seat, isSelected, onSelect }) => {
  const isBooked = seat.status === 'BOOKED';

  const handleClick = () => {
    if (!isBooked) {
      onSelect(seat);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBooked}
      title={`Seat ${seat.seat_number} - ${seat.status}`}
      className={`relative group w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-[11px] sm:text-xs transition-all duration-200 select-none ${
        isBooked
          ? 'bg-slate-800/60 border border-slate-700/60 text-slate-500 cursor-not-allowed opacity-50'
          : isSelected
          ? 'bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 text-white border-2 border-white shadow-lg shadow-pink-500/50 scale-110 z-10 animate-pulse-slow'
          : 'bg-purple-950/60 border border-cyan-400/40 text-cyan-200 hover:border-pink-400 hover:text-white hover:bg-purple-900/80 hover:scale-105 hover:shadow-md hover:shadow-cyan-500/30'
      }`}
    >
      {isBooked ? (
        <Lock className="w-3.5 h-3.5 text-slate-500" />
      ) : isSelected ? (
        <Check className="w-4 h-4 text-white stroke-[3]" />
      ) : (
        <span>{seat.seat_number.replace('S', '')}</span>
      )}

      {/* Tooltip on hover */}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
        Seat {seat.seat_number} • {seat.status}
      </span>
    </button>
  );
};
