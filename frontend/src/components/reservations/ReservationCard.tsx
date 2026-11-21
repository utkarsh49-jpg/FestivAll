import React, { useState } from 'react';
import { ReservationWithDetails } from '../../types';
import { CancelConfirmModal } from './CancelConfirmModal';
import { Calendar, Clock, MapPin, Ticket, Ban, CheckCircle2 } from 'lucide-react';

interface ReservationCardProps {
  reservation: ReservationWithDetails;
  onRefresh: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onRefresh,
  onSelectEvent,
}) => {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const isActive = reservation.status === 'ACTIVE';

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-purple-500/40">
      
      {/* Top status indicator strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isActive
            ? 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500'
            : 'bg-slate-700'
        }`}
      ></div>

      <div>
        {/* Header: Pass ID & Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-xs font-black text-purple-300">
              <Ticket className="w-4 h-4 text-purple-400" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pass ID
              </span>
              <span className="text-xs font-black text-white font-mono">#{reservation.id}</span>
            </div>
          </div>

          <div>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Active Pass
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Event Title */}
        <h4
          onClick={() => onSelectEvent && reservation.event && onSelectEvent(reservation.event.id)}
          className={`text-lg font-bold text-white font-['Outfit'] mb-2.5 ${
            onSelectEvent ? 'hover:text-pink-300 cursor-pointer transition-colors' : ''
          }`}
        >
          {reservation.event?.title || `Campus Event #${reservation.event_id}`}
        </h4>

        {/* Meta Info: Seat, Venue, Time */}
        <div className="space-y-2 text-xs text-slate-300 bg-black/30 p-3.5 rounded-2xl border border-white/5 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Assigned Seat:</span>
            <span className="font-black text-sm text-gradient-fest">
              {reservation.seat_number || reservation.seat?.seat_number || `Seat ID ${reservation.seat_id}`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-pink-400" />
              Venue:
            </span>
            <span className="font-semibold text-white truncate max-w-[170px]">
              {reservation.event?.venue_name || 'Auditorium'}
            </span>
          </div>

          {reservation.event?.event_date && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                Event Date:
              </span>
              <span className="font-semibold text-white">
                {formatDate(reservation.event.event_date)}
              </span>
            </div>
          )}

          {reservation.event?.start_time && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Time:
              </span>
              <span className="font-semibold text-white">
                {reservation.event.start_time.slice(0, 5)} - {reservation.event.end_time.slice(0, 5)}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Booked:</span>
            <span>{formatDateTime(reservation.booked_at)}</span>
          </div>

          {reservation.cancelled_at && (
            <div className="flex items-center justify-between text-[11px] text-rose-400">
              <span>Cancelled:</span>
              <span>{formatDateTime(reservation.cancelled_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-1">
        {isActive ? (
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="w-full py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span>Cancel Reservation</span>
          </button>
        ) : (
          <div className="py-2.5 text-center text-xs font-medium text-slate-500 bg-white/5 rounded-2xl border border-white/5">
            Seat Released & Pass Inactive
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <CancelConfirmModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          reservation={reservation}
          onCancelled={onRefresh}
        />
      )}

    </div>
  );
};
