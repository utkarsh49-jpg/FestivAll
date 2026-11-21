import React, { useState } from 'react';
import { ReservationWithDetails } from '../../types';
import { api } from '../../services/api';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: ReservationWithDetails;
  onCancelled: () => void;
}

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  isOpen,
  onClose,
  reservation,
  onCancelled,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmCancel = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.cancelReservation(reservation.id);
      onCancelled();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel reservation';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-rose-500/40 p-6 md:p-8 shadow-2xl shadow-rose-950/50 overflow-hidden">
        
        {/* Top danger strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 to-amber-500"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white font-['Outfit']">
              Cancel Pass <span className="text-rose-400">Reservation?</span>
            </h3>
            <p className="text-xs text-slate-400">
              Pass ID #{reservation.id}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Are you sure you want to cancel your seat for <strong className="text-white">{reservation.event?.title || `Event #${reservation.event_id}`}</strong>?
          This will release the seat in the auditorium for other students.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors"
          >
            Keep Pass
          </button>

          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Cancellation</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
