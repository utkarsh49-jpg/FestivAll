import React, { useState } from 'react';
import { EventItem, Seat } from '../../types';
import { useUser } from '../../context/UserContext';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import { Sparkles, Calendar, MapPin, User, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  selectedSeat: Seat;
  onBookingSuccess: () => void;
  onNavigateToReservations: () => void;
}

export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  onClose,
  event,
  selectedSeat,
  onBookingSuccess,
  onNavigateToReservations,
}) => {
  const { currentUser } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirmBooking = async () => {
    // Validate again before booking per requirements
    if (selectedSeat.status !== 'AVAILABLE') {
      setBookingError('Selected seat is no longer available. Please select another seat.');
      return;
    }

    if (String(selectedSeat.event_id) !== String(event.id)) {
      setBookingError('Invalid seat: This seat does not belong to the current event.');
      return;
    }

    setIsSubmitting(true);
    if (!currentUser) {
      setBookingError('Authentication required. Please sign in to book your seat.');
      return;
    }

    try {
      await api.createReservation({
        event_id: event.id,
        seat_id: selectedSeat.id,
      });

      // Celebration confetti explosion
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#f97316', '#06b6d4', '#facc15'],
        });
      } catch {
        // graceful fallback if canvas-confetti is not loaded
      }

      setIsSuccess(true);
      onBookingSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to book seat. Please try again.';
      setBookingError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-purple-500/30 p-6 md:p-8 shadow-2xl shadow-purple-900/50 overflow-hidden">
        
        {/* Festive top strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <div>
            {/* Modal Title */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-['Outfit']">
                  Confirm Seat <span className="text-gradient-fest">Reservation</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Campus Fest Auditorium Entry Pass
                </p>
              </div>
            </div>

            {/* Ticket Card Preview */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Event
                </span>
                <p className="text-sm font-bold text-white font-['Outfit'] truncate">
                  {event.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-pink-400" />
                    Venue
                  </span>
                  <p className="font-semibold text-white truncate">{event.venue_name}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    Time
                  </span>
                  <p className="font-semibold text-white">
                    {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Selected Seat
                  </span>
                  <p className="text-lg font-black text-gradient-fest">
                    {selectedSeat.seat_number}
                  </p>
                  <span className="text-[9px] text-slate-400">Seat ID: {selectedSeat.id}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                    <User className="w-3 h-3 text-pink-400" />
                    Student Profile
                  </span>
                  <p className="text-xs font-bold text-white truncate">
                    {currentUser?.name || 'Student'}
                  </p>
                  <span className="text-[9px] text-amber-300 font-semibold">{currentUser?.role || 'STUDENT'}</span>
                </div>
              </div>
            </div>

            {/* Error Message if API fails or 409 conflict */}
            {bookingError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Booking Error</p>
                  <p className="text-rose-200 mt-0.5">{bookingError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Booking...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Confirm Pass</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Success Screen */
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white font-['Outfit']">
                Seat Reserved! 🎉
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Your auditorium entry pass for <strong className="text-purple-300">{event.title}</strong> is confirmed.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 text-xs space-y-1.5 text-slate-300 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Seat Number:</span>
                <span className="font-bold text-gradient-fest text-sm">{selectedSeat.seat_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Venue:</span>
                <span className="font-semibold text-white">{event.venue_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reserved For:</span>
                <span className="font-semibold text-white">{currentUser?.name || 'Student'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pass Status:</span>
                <span className="font-bold text-emerald-400 uppercase text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToReservations();
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 transition-all"
              >
                View My Reservations
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
