import React, { useState, useMemo } from 'react';
import { OrganizerEventItem, EventStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Calendar, Clock, MapPin, Users, Edit3, Ban, CheckCircle, Search } from 'lucide-react';

interface OrganizerEventListProps {
  events: OrganizerEventItem[];
  onEdit: (event: OrganizerEventItem) => void;
  onViewAttendees: (event: OrganizerEventItem) => void;
  onStatusChange: (event: OrganizerEventItem, newStatus: EventStatus) => Promise<void>;
}

export const OrganizerEventList: React.FC<OrganizerEventListProps> = ({
  events,
  onEdit,
  onViewAttendees,
  onStatusChange,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchVenue = e.venue_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue) return false;
      }
      return true;
    });
  }, [events, search, statusFilter]);

  const handleStatusClick = async (event: OrganizerEventItem, newStatus: EventStatus) => {
    try {
      setUpdatingId(event.id);
      await onStatusChange(event, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeVariant = (status: EventStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return 'emerald';
      case 'DRAFT':
        return 'amber';
      case 'CANCELLED':
        return 'rose';
      default:
        return 'purple';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search your events by title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-auto overflow-x-auto">
          {(['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table / Card Layout */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center glass-card rounded-3xl border border-white/10 space-y-3">
          <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">No events match your criteria</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {events.length === 0
              ? 'You have not created any events yet. Click "Create New Event" to get started!'
              : 'Try clearing your search query or switching your status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const booked = Number(event.booked_seats) || 0;
            const total = Number(event.total_seats) || 0;
            const occupancy = total > 0 ? Math.round((booked / total) * 100) : 0;
            const isUpdating = updatingId === event.id;

            return (
              <div
                key={event.id}
                className="p-5 sm:p-6 glass-card rounded-3xl border border-white/10 hover:border-purple-500/40 transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Event Core Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={getStatusBadgeVariant(event.status)} size="sm">
                        {event.status}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">Event #{event.id}</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white font-['Outfit']">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="text-xs text-slate-300 line-clamp-2 max-w-2xl font-normal">
                        {event.description}
                      </p>
                    )}

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>{new Date(event.event_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-pink-400" />
                        <span>
                          {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {event.venue_name} ({event.venue_location})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seating & Occupancy Bar */}
                  <div className="lg:w-64 p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Auditorium Seating
                      </span>
                      <span className="text-white font-bold">{occupancy}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${occupancy}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>
                        <strong className="text-white font-bold">{booked}</strong> Booked
                      </span>
                      <span>
                        <strong className="text-white font-bold">{total}</strong> Total
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 lg:pt-0">
                    <button
                      onClick={() => onViewAttendees(event)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-bold uppercase tracking-wider transition-all"
                      title="View Attendee List"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Attendees ({booked})</span>
                    </button>

                    <button
                      onClick={() => onEdit(event)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                      title="Edit Event & Seating"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                      <span>Edit</span>
                    </button>

                    {/* Status Toggle Actions */}
                    {event.status === 'DRAFT' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusClick(event, 'PUBLISHED')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        title="Publish Event Live"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    )}

                    {event.status === 'PUBLISHED' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusClick(event, 'CANCELLED')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        title="Cancel Event"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
