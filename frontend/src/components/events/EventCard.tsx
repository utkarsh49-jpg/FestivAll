import React from 'react';
import { EventItem } from '../../types';
import { Calendar, Clock, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface EventCardProps {
  event: EventItem;
  onSelect: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  // Format event date
  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Determine category badge based on title or keywords
  const getCategoryInfo = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('tech fest')) return { label: 'Tech Fest', variant: 'purple' as const };
    if (t.includes('cultural') || t.includes('night')) return { label: 'Cultural Night', variant: 'pink' as const };
    if (t.includes('bootcamp') || t.includes('web')) return { label: 'Bootcamp', variant: 'blue' as const };
    if (t.includes('workshop') || t.includes('data science') || t.includes('ai')) return { label: 'Workshop', variant: 'amber' as const };
    if (t.includes('robotics')) return { label: 'Robotics', variant: 'rose' as const };
    if (t.includes('seminar') || t.includes('career')) return { label: 'Seminar', variant: 'emerald' as const };
    return { label: 'Campus Fest', variant: 'purple' as const };
  };

  const category = getCategoryInfo(event.title);
  const isPublished = event.status === 'PUBLISHED';

  return (
    <div className="group glass-card rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      
      {/* Decorative top accent glow on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 opacity-60 group-hover:opacity-100 transition-opacity"></div>
      
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <Badge variant={category.variant}>
            {category.label}
          </Badge>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Open for Booking
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white font-['Outfit'] group-hover:text-pink-300 transition-colors line-clamp-2 mb-2.5">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-5">
          {event.description || 'Join this exciting campus fest event featuring hands-on activities, talks and student showcases.'}
        </p>

        {/* Event Details: Date, Time, Venue */}
        <div className="space-y-2 mb-6 text-xs text-slate-300 bg-black/25 p-3 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-medium text-slate-200">{formatEventDate(event.event_date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>
              {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {event.venue_name || 'Auditorium'} ({event.venue_location || 'Campus'})
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          onClick={() => isPublished && onSelect(String(event.id))}
          disabled={!isPublished}
          className={`w-full py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
            isPublished
              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 text-white shadow-lg shadow-purple-900/40 hover:shadow-pink-600/40 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isPublished ? 'Select Auditorium Seats' : 'Booking Closed'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
};
