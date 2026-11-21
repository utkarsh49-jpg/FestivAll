import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Reservation, ReservationWithDetails } from '../types';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { useEvents } from '../context/EventContext';
import { ReservationCard } from '../components/reservations/ReservationCard';
import { Loader } from '../components/common/Loader';
import { Ticket, RotateCcw, AlertCircle, Shield, Filter, LogIn } from 'lucide-react';

interface MyReservationsPageProps {
  onSelectEvent: (eventId: string) => void;
  onExploreEvents: () => void;
}

export const MyReservationsPage: React.FC<MyReservationsPageProps> = ({
  onSelectEvent,
  onExploreEvents,
}) => {
  const { currentUser, isAuthenticated, openAuthModal } = useUser();
  const { getEventById, refetchEvents } = useEvents();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'current-user' | 'all'>('current-user');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');

  // Fetch reservations from API
  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getReservations();
      setReservations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load reservations';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Handle refetch after cancellation
  const handleRefresh = async () => {
    await fetchReservations();
    refetchEvents();
  };

  const processedReservations = useMemo(() => {
    let list = reservations;

    if (filterMode === 'current-user' && currentUser) {
      list = list.filter((r) => String(r.user_id) === String(currentUser.id));
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Sort by booked_at newest first
    return list
      .map((r): ReservationWithDetails => {
        const event = getEventById(r.event_id);
        return {
          ...r,
          event,
        };
      })
      .sort((a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime());
  }, [reservations, filterMode, currentUser, statusFilter, getEventById]);

  const currentUserActiveCount = useMemo(() => {
    if (!currentUser) return 0;
    return reservations.filter(
      (r) => String(r.user_id) === String(currentUser.id) && r.status === 'ACTIVE'
    ).length;
  }, [reservations, currentUser]);

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="p-16 text-center glass-card rounded-3xl border border-white/10 space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-slate-400">
          <Ticket className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white font-['Outfit']">
            Sign In to View Passes
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Please sign in with your campus student credentials to access your auditorium reservations and manage passes.
          </p>
        </div>
        <button
          onClick={openAuthModal}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 mx-auto"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Auditorium Entry Passes</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
            My Campus <span className="text-gradient-fest">Reservations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your booked auditorium seats, view entry passes, or cancel reservations in real time.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/40 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all"
        >
          <RotateCcw className="w-4 h-4 text-purple-400" />
          <span>Refresh Passes</span>
        </button>
      </div>

      {/* Authenticated Student Banner */}
      <div className="p-5 glass-panel rounded-3xl border border-purple-500/30 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-['Outfit']">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {currentUser.email} • ID #{currentUser.id}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Authenticated Session Active</span>
        </div>
      </div>

      {/* Filter and View Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-card rounded-2xl border border-white/10">
        
        {/* User filter tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterMode('current-user')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filterMode === 'current-user'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            My Passes
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {currentUserActiveCount}
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                filterMode === 'all'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All Passes (Admin View)
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {reservations.length}
              </span>
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-pink-400" />
            Status:
          </span>
          {(['ALL', 'ACTIVE', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

      </div>

      {/* Main Reservation Cards Grid */}
      {isLoading ? (
        <Loader message="Fetching campus reservations..." />
      ) : error ? (
        <div className="p-12 text-center glass-card rounded-3xl border border-rose-500/30 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm text-rose-300 font-semibold">{error}</p>
          <button
            onClick={fetchReservations}
            className="px-5 py-2.5 rounded-xl bg-purple-600 text-xs font-bold uppercase tracking-wider text-white"
          >
            Retry Loading
          </button>
        </div>
      ) : processedReservations.length === 0 ? (
        <div className="p-16 text-center glass-card rounded-3xl border border-white/10 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-slate-400">
            <Ticket className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-['Outfit']">
              {filterMode === 'current-user'
                ? 'No active reservations found for your account'
                : 'No reservations match your filter'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {filterMode === 'current-user'
                ? 'You have not reserved any auditorium seats yet. Explore published fest events and pick your favorite seat!'
                : 'Try changing the status filter.'}
            </p>
          </div>
          <button
            onClick={onExploreEvents}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30"
          >
            Explore Fest Events Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedReservations.map((res) => (
            <ReservationCard
              key={res.id}
              reservation={res}
              onRefresh={handleRefresh}
              onSelectEvent={onSelectEvent}
            />
          ))}
        </div>
      )}

    </div>
  );
};
