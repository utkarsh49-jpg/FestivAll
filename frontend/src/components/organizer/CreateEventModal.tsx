import React, { useState } from 'react';
import { Venue, CreateEventPayload, EventStatus } from '../../types';
import { X, Sparkles, Calendar, Clock, MapPin, Armchair, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  venues: Venue[];
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  venues,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [venueId, setVenueId] = useState(venues.length > 0 ? String(venues[0].id) : '');
  const [capacity, setCapacity] = useState<number>(50);
  const [status, setStatus] = useState<EventStatus>('PUBLISHED');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedVenue = venues.find((v) => String(v.id) === String(venueId));
  const maxVenueCapacity = selectedVenue ? selectedVenue.capacity : 500;

  const handleVenueChange = (vId: string) => {
    setVenueId(vId);
    const targetVenue = venues.find((v) => String(v.id) === String(vId));
    if (targetVenue && capacity > targetVenue.capacity) {
      setCapacity(targetVenue.capacity);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage('Please enter an event title of at least 3 characters.');
      return;
    }

    if (!eventDate) {
      setErrorMessage('Please specify an event date.');
      return;
    }

    if (!startTime || !endTime || startTime >= endTime) {
      setErrorMessage('Start time must be strictly before end time.');
      return;
    }

    if (!venueId) {
      setErrorMessage('Please select a campus venue.');
      return;
    }

    if (capacity <= 0 || capacity > maxVenueCapacity) {
      setErrorMessage(`Seating capacity must be between 1 and ${maxVenueCapacity} (venue limit).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: eventDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        venue_id: venueId,
        status,
        capacity,
      });

      setSuccessMessage('Event and auditorium seats created successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create event. Please verify inputs.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-purple-500/30 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Fest gradient top strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-['Outfit']">Create New Campus Event</h3>
            <p className="text-xs text-slate-400">Configure event details and auditorium seating</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. AI & Robotics Hackathon 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Provide a brief summary of the workshop, contest, or keynote..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
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
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="PUBLISHED" className="bg-[#120a2e]">PUBLISHED (Open for booking)</option>
                <option value="DRAFT" className="bg-[#120a2e]">DRAFT (Hidden from public)</option>
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
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
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
                className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Venue Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Auditorium / Venue *
              </span>
            </label>
            <select
              value={venueId}
              onChange={(e) => handleVenueChange(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#120a2e]">
                  {v.name} ({v.location}) — Max Capacity: {v.capacity}
                </option>
              ))}
            </select>
          </div>

          {/* Seating Capacity Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5 text-purple-400" />
                Auditorium Seating Capacity *
              </span>
              <span className="text-purple-300 font-normal text-[11px]">
                Max for Venue: {maxVenueCapacity}
              </span>
            </div>
            <input
              type="number"
              min={1}
              max={maxVenueCapacity}
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The system will automatically generate seats S1 through S{capacity} ready for real-time booking.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Creating Event & Seats...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create & Launch Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
