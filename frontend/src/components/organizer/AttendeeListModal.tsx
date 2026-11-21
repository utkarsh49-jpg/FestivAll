import React, { useState, useEffect, useMemo } from 'react';
import { OrganizerEventItem, Attendee } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../common/Badge';
import { Loader } from '../common/Loader';
import { X, Users, Search, AlertCircle, Ticket, Mail, Calendar } from 'lucide-react';

interface AttendeeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OrganizerEventItem | null;
}

export const AttendeeListModal: React.FC<AttendeeListModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');

  useEffect(() => {
    if (isOpen && event) {
      const fetchAttendees = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await api.getEventAttendees(event.id);
          setAttendees(data.attendees || []);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch attendee roster.';
          setError(msg);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAttendees();
    } else {
      setAttendees([]);
      setSearch('');
      setStatusFilter('ALL');
    }
  }, [isOpen, event]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      if (statusFilter !== 'ALL' && a.reservation_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = a.student_name.toLowerCase().includes(q);
        const matchEmail = a.student_email.toLowerCase().includes(q);
        const matchSeat = a.seat_number.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchSeat) return false;
      }
      return true;
    });
  }, [attendees, search, statusFilter]);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-purple-500/30 p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Top Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-['Outfit']">Attendee Roster</h3>
            <p className="text-xs text-slate-400">
              {event.title} — {attendees.length} total pass reservation(s)
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by student name, email, or seat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 self-start sm:self-auto">
            {(['ALL', 'ACTIVE', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
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

        {/* Content Body with Scroll */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <Loader message="Loading registered student attendees..." />
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="p-12 text-center glass-card rounded-2xl border border-white/10 space-y-2">
              <Ticket className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No attendees found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {attendees.length === 0
                  ? 'No students have booked passes for this event yet.'
                  : 'No attendees match your current search or status filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredAttendees.map((att) => (
                <div
                  key={att.reservation_id}
                  className="py-3 px-3 rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {att.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-['Outfit']">
                          {att.student_name}
                        </span>
                        <Badge
                          variant={att.reservation_status === 'ACTIVE' ? 'emerald' : 'rose'}
                          size="sm"
                        >
                          {att.reservation_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {att.student_email}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>ID #{att.student_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 text-xs font-bold">
                      <Ticket className="w-3.5 h-3.5 text-pink-400" />
                      <span>Seat {att.seat_number}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(att.booked_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
