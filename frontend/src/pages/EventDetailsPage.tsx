import React from 'react';
import { useEvents } from '../context/EventContext';
import { AuditoriumView } from '../components/auditorium/AuditoriumView';
import { ArrowLeft, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface EventDetailsPageProps {
  eventId: string;
  onBack: () => void;
  onNavigateToReservations: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  eventId,
  onBack,
  onNavigateToReservations,
}) => {
  const { getEventById, getVenueById } = useEvents();
  const event = getEventById(eventId);
  const venue = event ? getVenueById(event.venue_id) : undefined;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!event) {
    return (
      <div className="p-12 text-center glass-card rounded-3xl border border-white/10 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white font-['Outfit']">Event Not Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested campus event with ID #{eventId} does not exist or may have been removed.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold uppercase tracking-wider text-white"
        >
          Return to Events
        </button>
      </div>
    );
  }

  // Requirement 1: Do not allow booking DRAFT or CANCELLED events
  const isBookable = event.status === 'PUBLISHED';

  return (
    <div className="space-y-8">
      
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </button>
      </div>

      {/* Main Event Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 relative overflow-hidden shadow-2xl">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-600/20 via-pink-600/15 to-transparent blur-3xl pointer-events-none -z-10"></div>

        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="purple" size="md">
              Campus Fest 2026
            </Badge>
            {isBookable ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ● Live Booking Available
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ● {event.status} (Booking Closed)
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white font-['Outfit'] tracking-tight">
            {event.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            {event.description || 'Join this exciting campus fest event featuring hands-on activities, talks and student showcases.'}
          </p>

          {/* Metadata pill grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Date
                </span>
                <span className="text-xs font-bold text-white">
                  {formatDate(event.event_date)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Auditorium Slot
                </span>
                <span className="text-xs font-bold text-white">
                  {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Venue & Hall
                </span>
                <span className="text-xs font-bold text-white truncate block">
                  {event.venue_name} ({event.venue_location})
                </span>
                {venue && (
                  <span className="text-[10px] text-slate-400">Capacity: {venue.capacity} seats</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Interactive Seating Area */}
      {isBookable ? (
        <AuditoriumView
          event={event}
          onNavigateToReservations={onNavigateToReservations}
        />
      ) : (
        <div className="p-12 text-center glass-card rounded-3xl border border-amber-500/30 space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white font-['Outfit']">
            Seat Reservations Not Allowed
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This event is currently in {event.status} status. Only PUBLISHED events are open for student auditorium seat booking.
          </p>
        </div>
      )}

    </div>
  );
};
