import React from 'react';
import { SystemStats } from '../../types';
import { Users, Calendar, MapPin, Ticket, Percent } from 'lucide-react';

interface AdminStatsOverviewProps {
  stats: SystemStats;
}

export const AdminStatsOverview: React.FC<AdminStatsOverviewProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Top 5 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Users
            </span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              {stats.users.total_users}
            </span>
            <span className="text-[10px] text-purple-300 block">
              {stats.users.total_students} Std • {stats.users.total_organizers} Org • {stats.users.total_admins} Adm
            </span>
          </div>
        </div>

        {/* Total Events */}
        <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Events
            </span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              {stats.events.total_events}
            </span>
            <span className="text-[10px] text-pink-300 block">
              {stats.events.published_events} Live • {stats.events.draft_events} Draft • {stats.events.cancelled_events} Canc
            </span>
          </div>
        </div>

        {/* Venues */}
        <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Campus Venues
            </span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              {stats.venues.total_venues}
            </span>
            <span className="text-[10px] text-amber-300 block">
              {stats.venues.total_venue_capacity} Total Capacity
            </span>
          </div>
        </div>

        {/* Reservations */}
        <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Reservations
            </span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              {stats.reservations.total_reservations}
            </span>
            <span className="text-[10px] text-cyan-300 block">
              {stats.reservations.active_reservations} Active • {stats.reservations.cancelled_reservations} Cancelled
            </span>
          </div>
        </div>

        {/* Global Occupancy */}
        <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Seat Occupancy
            </span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              {stats.seats.overall_occupancy_percent}%
            </span>
            <span className="text-[10px] text-emerald-300 block">
              {stats.seats.booked_seats} of {stats.seats.total_seats} booked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
