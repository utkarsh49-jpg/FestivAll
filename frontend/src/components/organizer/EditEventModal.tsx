import React, { useState, useEffect } from 'react';
import { Venue, OrganizerEventItem, UpdateEventPayload, EventStatus } from '../../types';
import { X, Save, Calendar, Clock, MapPin, Armchair, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OrganizerEventItem | null;
  venues: Venue[];
  onSubmit: (id: string, payload: UpdateEventPayload) => Promise<void>;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  event,
  venues,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [capacity, setCapacity] = useState<number>(50);
  const [status, setStatus] = useState<EventStatus>('PUBLISHED');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventDate(event.event_date.slice(0, 10));
      setStartTime(event.start_time.slice(0, 5));
      setEndTime(event.end_time.slice(0, 5));
      setVenueId(String(event.venue_id));
      setCapacity(Number(event.total_seats) || 50);
      setStatus(event.status);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const bookedSeatsCount = Number(event.booked_seats) || 0;
  const selectedVenue = venues.find((v) => String(v.id) === String(venueId));
  const maxVenueCapacity = selectedVenue ? selectedVenue.capacity : 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage('Event title must be at least 3 characters.');
      return;
    }

    if (!startTime || !endTime || startTime >= endTime) {
      setErrorMessage('Start time must be strictly before end time.');
      return;
    }

    if (capacity < bookedSeatsCount) {
      setErrorMessage(
        `Cannot reduce capacity below currently booked seats (${bookedSeatsCount} seats are already reserved).`
      );
      return;
    }

    if (capacity > maxVenueCapacity) {
      setErrorMessage(`Capacity cannot exceed maximum venue limit (${maxVenueCapacity}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: eventDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        venue_id: venueId,
        status,
        capacity,
      });

      setSuccessMessage('Event updated successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update event.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-pink-500/30 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Fest gradient top strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pink-600/30 border border-pink-500/40 flex items-center justify-center text-pink-300">
            <Save className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-['Outfit']">Edit Event #{event.id}</h3>
            <p className="text-xs text-slate-400">Modify event schedule and seating configuration</p>
          </div>
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Event Date *
                </span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              >
                <option value="PUBLISHED" className="bg-[#120a2e]">PUBLISHED (Live)</option>
                <option value="DRAFT" className="bg-[#120a2e]">DRAFT (Hidden)</option>
                <option value="CANCELLED" className="bg-[#120a2e]">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-400" />
                  Start Time *
                </span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  End Time *
                </span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Auditorium / Venue
              </span>
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#120a2e]">
                  {v.name} ({v.location}) — Max: {v.capacity} seats
                </option>
              ))}
            </select>
          </div>

          {/* Capacity Manager with Booked Invariant Safeguard */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5 text-purple-400" />
                Seating Capacity
              </span>
              <span className="text-pink-300 text-[11px] font-bold">
                Booked: {bookedSeatsCount} / Max: {maxVenueCapacity}
              </span>
            </div>
            <input
              type="number"
              min={bookedSeatsCount || 1}
              max={maxVenueCapacity}
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-pink-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum capacity cannot be less than the {bookedSeatsCount} already booked seat(s).
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
