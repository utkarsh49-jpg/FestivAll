import React, { useState, useEffect } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { EventProvider } from './context/EventContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { api } from './services/api';

type TabType = 'home' | 'events' | 'details' | 'reservations' | 'organizer' | 'admin';

const AppContent: React.FC = () => {
  const { currentUser } = useUser();
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeReservationCount, setActiveReservationCount] = useState<number>(0);

  // Sync with browser hash if present (e.g. #events, #reservations, #organizer, #admin)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('event/')) {
        const id = hash.replace('event/', '');
        setSelectedEventId(id);
        setCurrentTab('details');
      } else if (hash === 'events') {
        setCurrentTab('events');
      } else if (hash === 'reservations') {
        setCurrentTab('reservations');
      } else if (hash === 'organizer') {
        setCurrentTab('organizer');
      } else if (hash === 'admin') {
        setCurrentTab('admin');
      } else if (hash === 'home' || !hash) {
        setCurrentTab('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch active reservation count for current user
  useEffect(() => {
    let isMounted = true;
    if (!currentUser) {
      setActiveReservationCount(0);
      return;
    }
    const fetchCount = async () => {
      try {
        const reservations = await api.getReservations();
        if (isMounted) {
          const userActive = reservations.filter(
            (r) => String(r.user_id) === String(currentUser.id) && r.status === 'ACTIVE'
          );
          setActiveReservationCount(userActive.length);
        }
      } catch {
        // quiet error on badge count
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000); // periodically refresh badge
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  const handleNavigate = (tab: string, eventId?: string) => {
    if (tab === 'details' && eventId) {
      setSelectedEventId(eventId);
      setCurrentTab('details');
      window.location.hash = `event/${eventId}`;
    } else {
      setCurrentTab(tab as TabType);
      window.location.hash = tab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#080518] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-x-hidden selection:bg-pink-500 selection:text-white">
      {/* Background ambient fest lighting */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      <div className="fixed bottom-10 right-1/4 w-[450px] h-[450px] bg-pink-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => handleNavigate(tab)}
        reservationCount={activeReservationCount}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'home' && (
          <HomePage onNavigate={handleNavigate} />
        )}

        {currentTab === 'events' && (
          <EventsPage
            onSelectEvent={(eventId) => handleNavigate('details', eventId)}
          />
        )}

        {currentTab === 'details' && selectedEventId && (
          <EventDetailsPage
            eventId={selectedEventId}
            onBack={() => handleNavigate('events')}
            onNavigateToReservations={() => handleNavigate('reservations')}
          />
        )}

        {currentTab === 'reservations' && (
          <MyReservationsPage
            onSelectEvent={(eventId) => handleNavigate('details', eventId)}
            onExploreEvents={() => handleNavigate('events')}
          />
        )}

        {currentTab === 'organizer' && (
          <OrganizerDashboard />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth UI Modal */}
      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <UserProvider>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </UserProvider>
  );
};

export default App;
