export type EventStatus = 'PUBLISHED' | 'DRAFT' | 'CANCELLED';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  venue_name: string;
  venue_location: string;
  organizer_id: string;
  status: EventStatus;
  created_at: string;
  category?: string;
  price?: number;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: number;
  created_at?: string;
}

export type SeatStatus = 'AVAILABLE' | 'BOOKED';

export interface Seat {
  id: string;
  event_id: string;
  seat_number: string;
  status: SeatStatus;
}

export type ReservationStatus = 'ACTIVE' | 'CANCELLED';

export interface Reservation {
  id: string;
  event_id: string;
  seat_id: string;
  user_id: string;
  status: ReservationStatus;
  booked_at: string;
  cancelled_at: string | null;
  seat_number?: string;
}

export interface ReservationWithDetails extends Reservation {
  event?: EventItem;
  seat?: Seat;
}

export interface CreateReservationPayload {
  event_id: string | number;
  seat_id: string | number;
}

export type UserRole = 'STUDENT' | 'ORGANIZER' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
  department?: string;
  year?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserProfile;
}

// ==========================================
// Organizer Types
// ==========================================

export interface OrganizerEventItem extends EventItem {
  venue_capacity: number;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_id: string | number;
  status?: EventStatus;
  capacity?: number;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  venue_id?: string | number;
  status?: EventStatus;
  capacity?: number;
}

export interface Attendee {
  reservation_id: string;
  reservation_status: ReservationStatus;
  booked_at: string;
  cancelled_at: string | null;
  seat_number: string;
  student_id: string;
  student_name: string;
  student_email: string;
}

export interface EventAttendeesResponse {
  event_id: string;
  event_title: string;
  count: number;
  attendees: Attendee[];
}

// ==========================================
// Admin Types
// ==========================================

export interface SystemStats {
  users: {
    total_users: number;
    total_students: number;
    total_organizers: number;
    total_admins: number;
  };
  events: {
    total_events: number;
    published_events: number;
    draft_events: number;
    cancelled_events: number;
  };
  venues: {
    total_venues: number;
    total_venue_capacity: number;
  };
  reservations: {
    total_reservations: number;
    active_reservations: number;
    cancelled_reservations: number;
  };
  seats: {
    total_seats: number;
    booked_seats: number;
    available_seats: number;
    overall_occupancy_percent: number;
  };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  reservations_count: number;
  events_count: number;
}

export interface AdminEventItem extends OrganizerEventItem {
  organizer_name: string;
  organizer_email: string;
}

export interface VenuePayload {
  name: string;
  location: string;
  capacity: number;
}

export interface EventAnalyticsItem {
  event_id: string;
  event_title: string;
  event_status: EventStatus;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  venue_name: string;
  venue_capacity: number;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
  active_reservations: number;
  cancelled_reservations: number;
  occupancy_rate_percent: number;
}
