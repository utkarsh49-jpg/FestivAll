import React, { useState, useEffect, useMemo } from 'react';
import { EventAnalyticsItem } from '../../types';
import { api } from '../../services/api';
import { Loader } from '../common/Loader';
import { Badge } from '../common/Badge';
import { Search, AlertCircle, RotateCcw } from 'lucide-react';

export const SystemAnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<EventAnalyticsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getEventAnalytics();
      setAnalytics(data.events || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch analytics data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const filteredAnalytics = useMemo(() => {
    return analytics.filter((ev) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = ev.event_title.toLowerCase().includes(q);
        const matchVenue = ev.venue_name.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue) return false;
      }
      return true;
    });
  }, [analytics, search]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search analytics by event title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/30 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
          <span>Refresh Data</span>
        </button>
      </div>

      {isLoading ? (
        <Loader message="Aggregating SQL seat analytics..." />
      ) : error ? (
        <div className="p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold uppercase"
          >
            Retry
          </button>
        </div>
      ) : filteredAnalytics.length === 0 ? (
        <div className="p-12 text-center glass-card rounded-3xl border border-white/10">
          <p className="text-sm font-bold text-white">No analytics records found</p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Event & Status</th>
                  <th className="py-3.5 px-4 font-bold">Venue & Capacity</th>
                  <th className="py-3.5 px-4 font-bold">Booked / Total</th>
                  <th className="py-3.5 px-4 font-bold">Available</th>
                  <th className="py-3.5 px-4 font-bold">Active / Cancelled</th>
                  <th className="py-3.5 px-4 font-bold text-right">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAnalytics.map((item) => {
                  const rate = Number(item.occupancy_rate_percent) || 0;
                  return (
                    <tr key={item.event_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{item.event_title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={item.event_status === 'PUBLISHED' ? 'emerald' : item.event_status === 'DRAFT' ? 'amber' : 'rose'}
                            size="sm"
                          >
                            {item.event_status}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.event_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-medium text-white">{item.venue_name}</div>
                        <div className="text-[10px] text-slate-500">Venue Cap: {item.venue_capacity} seats</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        <span className="text-purple-300 font-bold">{item.booked_seats}</span> / {item.total_seats}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        <span className="text-cyan-300 font-bold">{item.available_seats}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        <span className="text-emerald-400">{item.active_reservations} active</span> •{' '}
                        <span className="text-rose-400">{item.cancelled_reservations} canc</span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-white text-xs">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
