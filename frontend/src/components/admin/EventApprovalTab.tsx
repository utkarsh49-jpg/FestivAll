import React, { useState, useMemo } from 'react';
import { AdminEventItem, EventStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Search, Calendar, Clock, MapPin, User, CheckCircle, Ban, AlertCircle } from 'lucide-react';

interface EventApprovalTabProps {
  events: AdminEventItem[];
  onStatusChange: (eventId: string, newStatus: EventStatus) => Promise<void>;
}

export const EventApprovalTab: React.FC<EventApprovalTabProps> = ({ events, onStatusChange }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchVenue = e.venue_name?.toLowerCase().includes(q);
        const matchOrg = e.organizer_name?.toLowerCase().includes(q) || e.organizer_email?.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchOrg) return false;
      }
      return true;
    });
  }, [events, search, statusFilter]);

  const handleStatusClick = async (eventId: string, status: EventStatus) => {
    setActionError(null);
    setUpdatingId(eventId);
    try {
      await onStatusChange(eventId, status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update event status.';
      setActionError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: EventStatus) => {
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
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search events by title, venue, or organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-auto overflow-x-auto">
          {(['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards Table */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center glass-card rounded-3xl border border-white/10 space-y-2">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-white">No events found matching your search.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const booked = Number(event.booked_seats) || 0;
            const total = Number(event.total_seats) || 0;
            const occupancy = total > 0 ? Math.round((booked / total) * 100) : 0;
            const isUpdating = updatingId === event.id;

            return (
              <div
                key={event.id}
                className="p-5 glass-card rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge variant={getStatusBadge(event.status)} size="sm">
                      {event.status}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono">ID #{event.id}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                    {event.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      {new Date(event.event_date).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-pink-400" />
                      {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {event.venue_name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <User className="w-3.5 h-3.5" />
                      Organizer: {event.organizer_name} ({event.organizer_email})
                    </span>
                  </div>
                </div>

                {/* Seating snapshot */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-4 text-xs shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Occupancy</span>
                    <span className="text-sm font-bold text-white">{occupancy}%</span>
                  </div>
                  <div className="h-6 w-[1px] bg-white/10"></div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Booked</span>
                    <span className="text-sm font-bold text-purple-300">{booked} / {total}</span>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {event.status === 'DRAFT' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleStatusClick(event.id, 'PUBLISHED')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  )}

                  {event.status === 'PUBLISHED' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleStatusClick(event.id, 'CANCELLED')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Event</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
