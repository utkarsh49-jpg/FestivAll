import React from 'react';
import { Calendar, Users, Percent, CheckCircle2 } from 'lucide-react';
import { OrganizerEventItem } from '../../types';

interface OrganizerStatsProps {
  events: OrganizerEventItem[];
}

export const OrganizerStats: React.FC<OrganizerStatsProps> = ({ events }) => {
  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === 'PUBLISHED').length;
  const totalBookedSeats = events.reduce((acc, e) => acc + (Number(e.booked_seats) || 0), 0);
  const totalSeats = events.reduce((acc, e) => acc + (Number(e.total_seats) || 0), 0);
  const avgOccupancy = totalSeats > 0 ? ((totalBookedSeats / totalSeats) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Events */}
      <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Managed Events
          </span>
          <span className="text-2xl font-black text-white font-['Outfit']">
            {totalEvents}
          </span>
        </div>
      </div>

      {/* Published Events */}
      <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Published Live
          </span>
          <span className="text-2xl font-black text-white font-['Outfit']">
            {publishedEvents}
          </span>
        </div>
      </div>

      {/* Total Booked Passes */}
      <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Confirmed Attendees
          </span>
          <span className="text-2xl font-black text-white font-['Outfit']">
            {totalBookedSeats}
          </span>
        </div>
      </div>

      {/* Average Occupancy */}
      <div className="p-5 glass-card rounded-2xl border border-white/10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
          <Percent className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Avg Seating Occupancy
          </span>
          <span className="text-2xl font-black text-white font-['Outfit']">
            {avgOccupancy}%
          </span>
        </div>
      </div>
    </div>
  );
};
