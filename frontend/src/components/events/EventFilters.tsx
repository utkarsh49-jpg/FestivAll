import React from 'react';
import { Search, Filter, RotateCcw, MapPin } from 'lucide-react';
import { Venue } from '../../types';

interface EventFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedVenueId: string;
  onVenueChange: (venueId: string) => void;
  sortBy: 'date-asc' | 'date-desc';
  onSortChange: (sort: 'date-asc' | 'date-desc') => void;
  venues: Venue[];
  onReset: () => void;
}

const CATEGORIES = [
  'All',
  'Tech Fest',
  'Cultural',
  'Bootcamp',
  'Workshop',
  'Robotics',
  'Seminar',
];

export const EventFilters: React.FC<EventFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedVenueId,
  onVenueChange,
  sortBy,
  onSortChange,
  venues,
  onReset,
}) => {
  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 mb-8 border border-white/10 shadow-xl space-y-4">
      {/* Top row: Search input + Venue selector + Sort selector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-purple-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search fest events by title, topic, or venue..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-white/15 rounded-2xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>

        {/* Venue dropdown */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 text-pink-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <select
            value={selectedVenueId}
            onChange={(e) => onVenueChange(e.target.value)}
            aria-label="Filter events by campus venue"
            className="w-full pl-10 pr-8 py-2.5 bg-black/40 border border-white/15 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-pink-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Campus Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                {v.name} ({v.location})
              </option>
            ))}
          </select>
        </div>

        {/* Sort dropdown */}
        <div className="md:col-span-3 flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'date-asc' | 'date-desc')}
            aria-label="Sort events by date order"
            className="w-full px-3 py-2.5 bg-black/40 border border-white/15 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
          >
            <option value="date-asc" className="bg-slate-900 text-white">Date: Soonest First</option>
            <option value="date-desc" className="bg-slate-900 text-white">Date: Latest First</option>
          </select>

          <button
            onClick={onReset}
            title="Reset Filters"
            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3 h-3 text-purple-400" />
          Categories:
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-md shadow-pink-600/25 scale-[1.03]'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};
