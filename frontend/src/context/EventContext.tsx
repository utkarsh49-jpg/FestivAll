import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EventItem, Venue } from '../types';
import { api } from '../services/api';

interface EventContextType {
  events: EventItem[];
  publishedEvents: EventItem[];
  venues: Venue[];
  isLoading: boolean;
  error: string | null;
  refetchEvents: () => Promise<void>;
  getVenueById: (id: string | number) => Venue | undefined;
  getEventById: (id: string | number) => EventItem | undefined;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsData, venuesData] = await Promise.all([
        api.getEvents(),
        api.getVenues().catch(() => [] as Venue[]),
      ]);
      setEvents(eventsData);
      setVenues(venuesData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to campus event server';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Requirement 1: Public event listings and featured events must show only events whose status is PUBLISHED
  const publishedEvents = events.filter((e) => e.status === 'PUBLISHED');

  const getVenueById = useCallback(
    (id: string | number) => {
      const idStr = String(id);
      return venues.find((v) => String(v.id) === idStr);
    },
    [venues]
  );

  const getEventById = useCallback(
    (id: string | number) => {
      const idStr = String(id);
      return events.find((e) => String(e.id) === idStr);
    },
    [events]
  );

  return (
    <EventContext.Provider
      value={{
        events,
        publishedEvents,
        venues,
        isLoading,
        error,
        refetchEvents: fetchData,
        getVenueById,
        getEventById,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
