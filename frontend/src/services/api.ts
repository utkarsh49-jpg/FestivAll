import {
  EventItem,
  Venue,
  Seat,
  Reservation,
  CreateReservationPayload,
  UserProfile,
  AuthResponse,
  OrganizerEventItem,
  CreateEventPayload,
  UpdateEventPayload,
  EventAttendeesResponse,
  SystemStats,
  AdminUserItem,
  AdminEventItem,
  VenuePayload,
  EventAnalyticsItem,
  UserRole,
  EventStatus,
} from '../types';

const BASE_URL = '/api';
const TOKEN_KEY = 'fest_auth_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

/**
 * Helper to handle fetch responses and extract error messages
 */
async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    let errorMessage = 'An unexpected error occurred';
    if (typeof data === 'object' && data !== null && 'error' in data) {
      errorMessage = (data as { error: string }).error;
    } else if (typeof data === 'object' && data !== null && 'message' in data) {
      errorMessage = (data as { message: string }).message;
    } else if (typeof data === 'string' && data.length > 0) {
      errorMessage = data;
    } else if (res.status === 401) {
      errorMessage = 'Authentication required. Please sign in to continue.';
    } else if (res.status === 403) {
      errorMessage = 'Access denied: insufficient permissions.';
    } else if (res.status === 409) {
      errorMessage = 'Conflict: This resource has already been reserved or modified.';
    } else if (res.status === 404) {
      errorMessage = 'Requested resource not found.';
    }

    // Auto-clear invalid/expired token on 401
    if (res.status === 401) {
      tokenStorage.clear();
    }

    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return data as T;
}

function getAuthHeaders(): HeadersInit {
  const token = tokenStorage.get();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // ==========================================
  // Authentication & Profile
  // ==========================================

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await handleResponse<AuthResponse>(res);
    if (data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<AuthResponse>(res);
    if (data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UserProfile>(res);
  },

  logout(): void {
    tokenStorage.clear();
  },

  // ==========================================
  // Public Events & Venues Discovery
  // ==========================================

  async getEvents(): Promise<EventItem[]> {
    const res = await fetch(`${BASE_URL}/events`);
    return handleResponse<EventItem[]>(res);
  },

  async getVenues(): Promise<Venue[]> {
    const res = await fetch(`${BASE_URL}/venues`);
    return handleResponse<Venue[]>(res);
  },

  async getEventSeats(eventId: string | number): Promise<Seat[]> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/seats`);
    return handleResponse<Seat[]>(res);
  },

  // ==========================================
  // Protected Reservations
  // ==========================================

  async createReservation(payload: CreateReservationPayload): Promise<{ message: string; reservation: Reservation }> {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; reservation: Reservation }>(res);
  },

  async getReservations(userId?: string | number): Promise<Reservation[]> {
    const query = userId ? `?user_id=${userId}` : '';
    const res = await fetch(`${BASE_URL}/reservations${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Reservation[]>(res);
  },

  async getReservationById(id: string | number): Promise<Reservation> {
    const res = await fetch(`${BASE_URL}/reservations/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Reservation>(res);
  },

  async cancelReservation(id: string | number): Promise<{ message?: string; reservation_id?: number }> {
    const res = await fetch(`${BASE_URL}/reservations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message?: string; reservation_id?: number }>(res);
  },

  // ==========================================
  // Analytics
  // ==========================================

  async getEventAnalytics(): Promise<{ count: number; events: EventAnalyticsItem[] }> {
    const res = await fetch(`${BASE_URL}/analytics/events`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ count: number; events: EventAnalyticsItem[] }>(res);
  },

  // ==========================================
  // Organizer Operations
  // ==========================================

  async getOrganizerEvents(): Promise<OrganizerEventItem[]> {
    const res = await fetch(`${BASE_URL}/organizer/events`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<OrganizerEventItem[]>(res);
  },

  async createEvent(payload: CreateEventPayload): Promise<{ message: string; event: EventItem; total_seats: number }> {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; event: EventItem; total_seats: number }>(res);
  },

  async updateEvent(id: string | number, payload: UpdateEventPayload): Promise<{ message: string; event: EventItem }> {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; event: EventItem }>(res);
  },

  async updateEventStatus(id: string | number, status: EventStatus): Promise<{ message: string; event: EventItem }> {
    const res = await fetch(`${BASE_URL}/events/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse<{ message: string; event: EventItem }>(res);
  },

  async getEventAttendees(id: string | number): Promise<EventAttendeesResponse> {
    const res = await fetch(`${BASE_URL}/events/${id}/attendees`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<EventAttendeesResponse>(res);
  },

  // ==========================================
  // Admin Operations
  // ==========================================

  async getAdminStats(): Promise<SystemStats> {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<SystemStats>(res);
  },

  async getAdminUsers(): Promise<AdminUserItem[]> {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<AdminUserItem[]>(res);
  },

  async updateUserRole(id: string | number, role: UserRole): Promise<{ message: string; user: AdminUserItem }> {
    const res = await fetch(`${BASE_URL}/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return handleResponse<{ message: string; user: AdminUserItem }>(res);
  },

  async getAdminEvents(): Promise<AdminEventItem[]> {
    const res = await fetch(`${BASE_URL}/admin/events`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<AdminEventItem[]>(res);
  },

  async createVenue(payload: VenuePayload): Promise<{ message: string; venue: Venue }> {
    const res = await fetch(`${BASE_URL}/venues`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; venue: Venue }>(res);
  },

  async updateVenue(id: string | number, payload: Partial<VenuePayload>): Promise<{ message: string; venue: Venue }> {
    const res = await fetch(`${BASE_URL}/venues/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; venue: Venue }>(res);
  },

  async deleteVenue(id: string | number): Promise<{ message: string; id: number }> {
    const res = await fetch(`${BASE_URL}/venues/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; id: number }>(res);
  },
};
