import React, { useState, useEffect, useCallback } from 'react';
import { OrganizerEventItem, CreateEventPayload, UpdateEventPayload, EventStatus } from '../types';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { useEvents } from '../context/EventContext';
import { OrganizerStats } from '../components/organizer/OrganizerStats';
import { OrganizerEventList } from '../components/organizer/OrganizerEventList';
import { CreateEventModal } from '../components/organizer/CreateEventModal';
import { EditEventModal } from '../components/organizer/EditEventModal';
import { AttendeeListModal } from '../components/organizer/AttendeeListModal';
import { Loader } from '../components/common/Loader';
import { Sparkles, Plus, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';

export const OrganizerDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const { venues, refetchEvents: refetchGlobalEvents } = useEvents();

  const [events, setEvents] = useState<OrganizerEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OrganizerEventItem | null>(null);
  const [attendeeEvent, setAttendeeEvent] = useState<OrganizerEventItem | null>(null);

  const fetchOrganizerEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getOrganizerEvents();
      setEvents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load your events.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizerEvents();
  }, [fetchOrganizerEvents]);

  // Create Event Handler
  const handleCreateEvent = async (payload: CreateEventPayload) => {
    await api.createEvent(payload);
    await fetchOrganizerEvents();
    refetchGlobalEvents();
  };

  // Update Event Handler
  const handleUpdateEvent = async (id: string, payload: UpdateEventPayload) => {
    await api.updateEvent(id, payload);
    await fetchOrganizerEvents();
    refetchGlobalEvents();
  };

  // Status Change Handler
  const handleStatusChange = async (event: OrganizerEventItem, newStatus: EventStatus) => {
    await api.updateEventStatus(event.id, newStatus);
    await fetchOrganizerEvents();
    refetchGlobalEvents();
  };

  // Access check
  if (!currentUser || (currentUser.role !== 'ORGANIZER' && currentUser.role !== 'ADMIN')) {
    return (
      <div className="p-16 text-center glass-card rounded-3xl border border-rose-500/30 max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white font-['Outfit']">Access Restricted</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Organizer Dashboard is reserved for verified campus event organizers and administrators. Please sign in with an organizer account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Fest 2026 Organizer Console</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
            Event Management <span className="text-gradient-fest">Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create and edit your events, monitor real-time auditorium seat bookings, and review attendee lists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrganizerEvents}
            className="p-2.5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/40 text-slate-400 hover:text-white transition-colors"
            title="Refresh events"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Organizer KPI Statistics */}
      <OrganizerStats events={events} />

      {/* Main Events Workspace */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white font-['Outfit']">
            Your Scheduled Events ({events.length})
          </h2>
        </div>

        {isLoading ? (
          <Loader message="Loading your events and seating data..." />
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-rose-300 font-semibold">{error}</p>
            <button
              onClick={fetchOrganizerEvents}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold uppercase"
            >
              Retry
            </button>
          </div>
        ) : (
          <OrganizerEventList
            events={events}
            onEdit={(evt) => setEditingEvent(evt)}
            onViewAttendees={(evt) => setAttendeeEvent(evt)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        venues={venues}
        onSubmit={handleCreateEvent}
      />

      <EditEventModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        event={editingEvent}
        venues={venues}
        onSubmit={handleUpdateEvent}
      />

      <AttendeeListModal
        isOpen={!!attendeeEvent}
        onClose={() => setAttendeeEvent(null)}
        event={attendeeEvent}
      />
    </div>
  );
};
