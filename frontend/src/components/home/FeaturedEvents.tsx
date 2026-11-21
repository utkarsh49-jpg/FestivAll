import React from 'react';
import { EventItem } from '../../types';
import { EventCard } from '../events/EventCard';
import { Sparkles, ArrowRight } from 'lucide-react';

interface FeaturedEventsProps {
  events: EventItem[];
  onSelectEvent: (eventId: string) => void;
  onViewAll: () => void;
}

export const FeaturedEvents: React.FC<FeaturedEventsProps> = ({
  events,
  onSelectEvent,
  onViewAll,
}) => {
  // Take top 6 published events
  const featured = events.slice(0, 6);

  return (
    <section className="py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
              Fest Spotlights
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            Featured <span className="text-gradient-fest">Campus Events</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Handpicked crowd favorites with high auditorium seat demand
          </p>
        </div>

        <button
          onClick={onViewAll}
          className="self-start sm:self-auto flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300 hover:text-pink-300 transition-colors"
        >
          <span>View All Events ({events.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {featured.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center glass-card rounded-3xl border border-white/5 text-slate-400 text-sm">
          No published fest events currently found.
        </div>
      )}
    </section>
  );
};
