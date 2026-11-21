import React, { useState, useEffect, useCallback } from 'react';
import { SystemStats, AdminUserItem, AdminEventItem, VenuePayload, UserRole, EventStatus } from '../types';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { useEvents } from '../context/EventContext';
import { AdminStatsOverview } from '../components/admin/AdminStatsOverview';
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { EventApprovalTab } from '../components/admin/EventApprovalTab';
import { VenueManagementTab } from '../components/admin/VenueManagementTab';
import { SystemAnalyticsTab } from '../components/admin/SystemAnalyticsTab';
import { Loader } from '../components/common/Loader';
import { ShieldCheck, ShieldAlert, Users, Calendar, MapPin, BarChart3, RotateCcw } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const { venues, refetchEvents: refetchGlobalEvents } = useEvents();

  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'venues' | 'analytics'>('users');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, usersData, eventsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminEvents(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setEvents(eventsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch admin system data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Handlers
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    await api.updateUserRole(userId, newRole);
    await fetchAdminData();
  };

  const handleEventStatusChange = async (eventId: string, newStatus: EventStatus) => {
    await api.updateEventStatus(eventId, newStatus);
    await fetchAdminData();
    refetchGlobalEvents();
  };

  const handleCreateVenue = async (payload: VenuePayload) => {
    await api.createVenue(payload);
    await fetchAdminData();
    refetchGlobalEvents();
  };

  const handleUpdateVenue = async (id: string, payload: Partial<VenuePayload>) => {
    await api.updateVenue(id, payload);
    await fetchAdminData();
    refetchGlobalEvents();
  };

  const handleDeleteVenue = async (id: string) => {
    await api.deleteVenue(id);
    await fetchAdminData();
    refetchGlobalEvents();
  };

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="p-16 text-center glass-card rounded-3xl border border-rose-500/30 max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white font-['Outfit']">Admin Authorization Required</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Access to the Central Admin Console is restricted to university festival administrators. Please sign in with an ADMIN account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Master Administration Console</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
            System Admin <span className="text-gradient-fest">Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global festival administration, role delegation, venue configurations, and real-time occupancy metrics.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/30 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all"
        >
          <RotateCcw className="w-4 h-4 text-purple-400" />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* Overview KPIs */}
      {stats && <AdminStatsOverview stats={stats} />}

      {/* Main Admin Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User & Role Management ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'events'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>All Events & Approvals ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('venues')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'venues'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Venues & Capacities ({venues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Auditorium Occupancy</span>
          </button>
        </div>

        {/* Tab Body */}
        {isLoading ? (
          <Loader message="Synchronizing administrative datasets..." />
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-rose-300 font-semibold">{error}</p>
            <button
              onClick={fetchAdminData}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold uppercase"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <UserManagementTab users={users} onUpdateRole={handleUpdateRole} />
            )}

            {activeTab === 'events' && (
              <EventApprovalTab events={events} onStatusChange={handleEventStatusChange} />
            )}

            {activeTab === 'venues' && (
              <VenueManagementTab
                venues={venues}
                onCreateVenue={handleCreateVenue}
                onUpdateVenue={handleUpdateVenue}
                onDeleteVenue={handleDeleteVenue}
              />
            )}

            {activeTab === 'analytics' && <SystemAnalyticsTab />}
          </>
        )}
      </div>
    </div>
  );
};
