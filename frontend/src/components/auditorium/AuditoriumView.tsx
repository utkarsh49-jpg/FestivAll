import React, { useState, useEffect, useCallback } from 'react';
import { EventItem, Seat } from '../../types';
import { api } from '../../services/api';
import { SeatItem } from './SeatItem';
import { SeatLegend } from './SeatLegend';
import { BookingSummaryModal } from './BookingSummaryModal';
import { Loader } from '../common/Loader';
import { useUser } from '../../context/UserContext';
import { Sparkles, AlertCircle, RotateCcw } from 'lucide-react';

interface AuditoriumViewProps {
  event: EventItem;
  onNavigateToReservations: () => void;
}

export const AuditoriumView: React.FC<AuditoriumViewProps> = ({ event, onNavigateToReservations }) => {
  const { currentUser, isAuthenticated, openAuthModal } = useUser();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch seats from existing Express API
  const fetchSeats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getEventSeats(event.id);
      setSeats(data);
      // If currently selected seat became booked during refetch, reset selection
      if (selectedSeat) {
        const stillAvail = data.find((s) => s.id === selectedSeat.id && s.status === 'AVAILABLE');
        if (!stillAvail) {
          setSelectedSeat(null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load auditorium seats';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [event.id, selectedSeat]);

  useEffect(() => {
    fetchSeats();
  }, [event.id]);

  const handleSeatClick = (seat: Seat) => {
    if (selectedSeat && selectedSeat.id === seat.id) {
      setSelectedSeat(null);
    } else {
      setSelectedSeat(seat);
    }
  };

  const handleBookingSuccess = () => {
    // Refetch the event's seats from the existing API so the UI reflects the real database state
    fetchSeats();
    setSelectedSeat(null);
  };

  // Organize seats into rows (10 seats per row)
  const organizeIntoRows = (seatList: Seat[]) => {
    const rowSize = 10;
    const rows: { label: string; index: number; seats: Seat[] }[] = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < seatList.length; i += rowSize) {
      const rowIndex = Math.floor(i / rowSize);
      let rowLabel = '';
      if (rowIndex < 26) {
        rowLabel = `Row ${alphabet[rowIndex]}`;
      } else {
        const firstLetter = alphabet[Math.floor(rowIndex / 26) - 1];
        const secondLetter = alphabet[rowIndex % 26];
        rowLabel = `Row ${firstLetter}${secondLetter}`;
      }
      rows.push({
        label: rowLabel,
        index: rowIndex,
        seats: seatList.slice(i, i + rowSize),
      });
    }

    return rows;
  };

  const seatRows = organizeIntoRows(seats);
  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;
  const bookedCount = seats.filter((s) => s.status === 'BOOKED').length;

  return (
    <div className="space-y-8">
      
      {/* Seating Statistics Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-card rounded-3xl border border-white/10">
        <div>
          <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            Interactive Auditorium Seating
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select an open seat to reserve your campus festival entry pass
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200">
            Total Seats: <strong className="text-white font-bold">{seats.length}</strong>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            Available: <strong className="text-white font-bold">{availableCount}</strong>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-850/60 border border-slate-700 text-slate-400">
            Booked: <strong className="text-slate-300 font-bold">{bookedCount}</strong>
          </div>
          <button
            onClick={fetchSeats}
            title="Refresh Seats"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <SeatLegend />

      {/* Seating Canvas */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-10 relative overflow-hidden shadow-2xl">
        
        {/* Stage Curved Screen Visual at Top */}
        <div className="max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="relative">
            {/* Ambient Neon Beam below stage */}
            <div className="w-full h-16 bg-stage-glow -mb-8 pointer-events-none"></div>

            {/* Stage Bar */}
            <div className="w-full h-8 rounded-t-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 p-[2px] shadow-lg shadow-purple-500/30">
              <div className="w-full h-full bg-[#120a2e] rounded-t-full flex items-center justify-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-amber-200 font-['Outfit']">
                  🎭 STAGE & SCREEN
                </span>
              </div>
            </div>
            <p className="text-center text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2">
              Front of Auditorium
            </p>
          </div>
        </div>

        {/* Content State: Loading, Error, or Seat Grid */}
        {isLoading ? (
          <Loader message="Loading real-time auditorium seating..." />
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-rose-300 font-semibold">{error}</p>
            <button
              onClick={fetchSeats}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-500"
            >
              Retry Loading Seats
            </button>
          </div>
        ) : seats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No seat records found for this venue in the database.
          </div>
        ) : (
          /* Organized Rows */
          <div className="space-y-4 max-w-3xl mx-auto overflow-x-auto pb-6">
            {seatRows.map((row) => (
              <div key={`${row.label}-${row.index}`} className="flex items-center gap-3 sm:gap-4 justify-center min-w-[500px]">
                {/* Row Label Left */}
                <span className="w-12 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  {row.label}
                </span>

                {/* Seat Items Grid */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Left block of row */}
                  {row.seats.slice(0, 5).map((seat) => (
                    <SeatItem
                      key={seat.id}
                      seat={seat}
                      isSelected={selectedSeat?.id === seat.id}
                      onSelect={handleSeatClick}
                    />
                  ))}

                  {/* Aisle Spacer */}
                  <div className="w-4 sm:w-6 border-b border-dashed border-white/10 shrink-0"></div>

                  {/* Right block of row */}
                  {row.seats.slice(5, 10).map((seat) => (
                    <SeatItem
                      key={seat.id}
                      seat={seat}
                      isSelected={selectedSeat?.id === seat.id}
                      onSelect={handleSeatClick}
                    />
                  ))}
                </div>

                {/* Row Label Right */}
                <span className="w-12 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Floating Bottom Selection Drawer */}
      {selectedSeat ? (
        <div className="sticky bottom-6 z-30 max-w-3xl mx-auto p-4 sm:p-5 glass-panel rounded-3xl border-2 border-pink-500/50 shadow-2xl shadow-pink-900/40 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0">
                {selectedSeat.seat_number}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-['Outfit']">
                    Seat {selectedSeat.seat_number} Selected
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                    AVAILABLE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAuthenticated && currentUser ? (
                    <>Booking for: <strong className="text-purple-300">{currentUser.name}</strong> ({currentUser.role})</>
                  ) : (
                    <span className="text-pink-300 font-semibold">Sign in required to confirm booking</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal();
                    return;
                  }
                  setIsModalOpen(true);
                }}
                className="flex-1 sm:flex-initial py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-pink-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isAuthenticated ? 'Book This Seat' : 'Sign In to Book'}</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-400">
          💡 Click on any available colored seat in the auditorium to reserve.
        </div>
      )}

      {/* Booking Confirmation & Confetti Modal */}
      {selectedSeat && (
        <BookingSummaryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          event={event}
          selectedSeat={selectedSeat}
          onBookingSuccess={handleBookingSuccess}
          onNavigateToReservations={onNavigateToReservations}
        />
      )}

    </div>
  );
};
