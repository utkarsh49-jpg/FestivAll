import React, { useState, useMemo } from 'react';
import { useEvents } from '../context/EventContext';
import { EventFilters } from '../components/events/EventFilters';
import { EventCard } from '../components/events/EventCard';
import { Loader } from '../components/common/Loader';
import { Calendar, SearchX } from 'lucide-react';

interface EventsPageProps {
  onSelectEvent: (eventId: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onSelectEvent }) => {
  const { publishedEvents, venues, isLoading, error, refetchEvents } = useEvents();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc'>('date-asc');

  // Filter and sort events (PUBLISHED ONLY as per requirement 1)
  const filteredEvents = useMemo(() => {
    return publishedEvents
      .filter((event) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = event.title.toLowerCase().includes(q);
          const matchDesc = event.description?.toLowerCase().includes(q);
          const matchVenue = event.venue_name?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchVenue) return false;
        }

        // Category filter
        if (selectedCategory !== 'All') {
          const t = event.title.toLowerCase();
          const cat = selectedCategory.toLowerCase();
          if (cat === 'tech fest' && !t.includes('tech fest')) return false;
          if (cat === 'cultural' && (!t.includes('cultural') && !t.includes('night'))) return false;
          if (cat === 'bootcamp' && (!t.includes('bootcamp') && !t.includes('web'))) return false;
          if (cat === 'workshop' && (!t.includes('workshop') && !t.includes('ai') && !t.includes('data science'))) return false;
          if (cat === 'robotics' && !t.includes('robotics')) return false;
          if (cat === 'seminar' && (!t.includes('seminar') && !t.includes('career'))) return false;
        }

        // Venue filter
        if (selectedVenueId) {
          if (String(event.venue_id) !== String(selectedVenueId)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.event_date).getTime();
        const timeB = new Date(b.event_date).getTime();
        return sortBy === 'date-asc' ? timeA - timeB : timeB - timeA;
      });
  }, [publishedEvents, searchQuery, selectedCategory, selectedVenueId, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedVenueId('');
    setSortBy('date-asc');
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5" />
          <span>Campus Calendar 2026</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
          All Fest <span className="text-gradient-fest">Events & Auditoriums</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Browse upcoming campus competitions, workshops, and guest presentations. Select any event to view the live auditorium seat layout and reserve your pass.
        </p>
      </div>

      {/* Filter Toolbar */}
      <EventFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedVenueId={selectedVenueId}
        onVenueChange={setSelectedVenueId}
        sortBy={sortBy}
        onSortChange={setSortBy}
        venues={venues}
        onReset={handleResetFilters}
      />

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <span>
          Showing <strong className="text-white font-bold">{filteredEvents.length}</strong> of{' '}
          <strong className="text-white">{publishedEvents.length}</strong> published events
        </span>
        {(searchQuery || selectedCategory !== 'All' || selectedVenueId) && (
          <button
            onClick={handleResetFilters}
            className="text-pink-400 hover:text-pink-300 font-semibold transition-colors"
          >
            Clear active filters
          </button>
        )}
      </div>

      {/* Main Events Grid */}
      {isLoading ? (
        <Loader message="Fetching available campus events..." />
      ) : error ? (
        <div className="p-12 text-center glass-card rounded-3xl border border-rose-500/30 space-y-4">
          <p className="text-base text-rose-300 font-semibold">{error}</p>
          <button
            onClick={refetchEvents}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider"
          >
            Retry Loading Events
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-16 text-center glass-card rounded-3xl border border-white/10 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-slate-400">
            <SearchX className="w-8 h-8 text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              No matching events found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Try adjusting your search terms, selecting a different venue, or resetting your category filter.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-pink-600/30"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      )}

    </div>
  );
};
