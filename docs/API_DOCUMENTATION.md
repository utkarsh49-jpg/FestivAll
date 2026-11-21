# REST API Documentation
## FestivAll – Campus Event & Auditorium Booking System

Base URL: `http://localhost:5000` (Backend Port `5000`, Frontend Proxy on Port `3000`)  
Specification Format: RESTful JSON over HTTP  
Authentication Standard: JSON Web Tokens (JWT) via HTTP `Authorization: Bearer <token>` Header

---

## 📑 Table of Contents
1. [Authentication Architecture & Roles](#1-authentication-architecture--roles)
2. [Global Conventions & Error Codes](#2-global-conventions--error-codes)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [Events Endpoints (Public)](#4-events-endpoints-public)
5. [Venues Endpoints (Public)](#5-venues-endpoints-public)
6. [Reservations & Booking Endpoints](#6-reservations--booking-endpoints)
7. [Organizer Endpoints](#7-organizer-endpoints)
8. [Admin Management Endpoints](#8-admin-management-endpoints)
9. [Analytics Endpoints (SQL Aggregates)](#9-analytics-endpoints-sql-aggregates)

---

## 1. Authentication Architecture & Roles

FestivAll employs stateless JSON Web Tokens (JWT) signed with a secure server secret using the HMAC SHA-256 algorithm (`HS256`).

### System Roles
- **`STUDENT`**: Standard campus participant. Can browse published events, view real-time seat availability, reserve seats, cancel their own reservations, and inspect their personal profile and booking history.
- **`ORGANIZER`**: Campus department or club coordinator. Can create events, configure auditorium capacity, edit owned events, manage event publishing status (`DRAFT`, `PUBLISHED`, `CANCELLED`), view attendee rosters, and view real-time occupancy analytics for owned events.
- **`ADMIN`**: System administrator. Has full supervisory control across all events, venues, reservations, analytics, and user role assignments.

### Authorization Headers
Protected endpoints require the standard Bearer authentication scheme:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 2. Global Conventions & Error Codes

| Status Code | Reason | Meaning |
| :---: | :--- | :--- |
| **`200 OK`** | Success | Request succeeded and response payload contains the result. |
| **`201 Created`** | Resource Created | Entity (e.g. reservation, user, event, venue) was successfully created. |
| **`400 Bad Request`** | Validation Failure | Missing required fields, invalid date/time sequences, or out-of-range capacity. |
| **`401 Unauthorized`** | Authentication Required | Missing, expired, or malformed JWT token; or placeholder demo user account. |
| **`403 Forbidden`** | Access Denied | Authenticated caller does not have sufficient role privileges or is attempting to modify resources owned by another user. |
| **`404 Not Found`** | Resource Missing | Target event, seat, venue, reservation, or user does not exist in the database. |
| **`409 Conflict`** | Concurrency / Integrity Violation | Target seat is already booked (`SELECT ... FOR UPDATE` lock failed), email is already registered, or venue cannot be deleted due to existing scheduled events. |
| **`500 Internal Server Error`** | Server Exception | Uncaught runtime error; database transactions are automatically rolled back. |

---

## 3. Authentication Endpoints

### 3.1 Register User
- **Method & Route**: `POST /api/auth/register`
- **Purpose**: Creates a new student user account and issues an authentication token.
- **Authentication**: None (Public).
- **Required Role**: None. Public registration strictly enforces `role: "STUDENT"` regardless of payload.
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Validation Rules**:
  - `name`: Non-empty string.
  - `email`: Valid RFC 5322 email format.
  - `password`: Minimum 6 characters.
- **Successful Response (`201 Created`)**:
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "71",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@campus.edu",
      "role": "STUDENT",
      "created_at": "2026-11-10T18:20:05.495Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Valid email address is required" }`
  - `409 Conflict`: `{ "error": "Email already registered" }`

---

### 3.2 Login User
- **Method & Route**: `POST /api/auth/login`
- **Purpose**: Verifies email/password and returns a JWT token.
- **Authentication**: None (Public).
- **Request Body**:
  ```json
  {
    "email": "aarav.sharma@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "71",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@campus.edu",
      "role": "STUDENT"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Email and password are required" }`
  - `401 Unauthorized`: `{ "error": "Invalid email or password" }`
  - `401 Unauthorized` (Seeded User Safeguard): `{ "error": "This demo account uses placeholder credentials. Please register a new account or set a password." }`

---

### 3.3 Get Current Authenticated Profile
- **Method & Route**: `GET /api/auth/me`
- **Purpose**: Retrieves the profile of the caller associated with the supplied Bearer token.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: Any valid authenticated role (`STUDENT`, `ORGANIZER`, `ADMIN`).
- **Successful Response (`200 OK`)**:
  ```json
  {
    "id": "71",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@campus.edu",
    "role": "STUDENT",
    "created_at": "2026-11-10T18:20:05.495Z"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Access token required" }`
  - `403 Forbidden`: `{ "error": "Invalid or expired token" }`
  - `404 Not Found`: `{ "error": "User not found" }`

---

## 4. Events Endpoints (Public)

### 4.1 Browse Published Events
- **Method & Route**: `GET /api/events`
- **Purpose**: Retrieves public event listings with joined venue details.
- **Authentication**: None (Public).
- **Authorization Restrictions**: Strictly returns events with `status = 'PUBLISHED'`. `DRAFT` and `CANCELLED` events are filtered out.
- **Query Parameters (Optional)**:
  - `search` (string): Filters events by title or description (case-insensitive substring).
  - `venue_id` (integer): Filters events hosted in a specific venue.
  - `date` (YYYY-MM-DD): Filters events scheduled on a specific date.
- **Successful Response (`200 OK`)**:
  ```json
  [
    {
      "id": "35",
      "title": "Tech Fest 2026 #35",
      "description": "Annual technical symposium featuring coding challenges and hackathons.",
      "event_date": "2026-10-15T18:30:00.000Z",
      "start_time": "10:00:00",
      "end_time": "14:00:00",
      "venue_id": "8",
      "organizer_id": "65",
      "status": "PUBLISHED",
      "created_at": "2026-09-20T16:16:32.000Z",
      "venue_name": "Main Auditorium",
      "venue_location": "Academic Block A, Ground Floor",
      "venue_capacity": 500
    }
  ]
  ```

---

### 4.2 Get Event Seats
- **Method & Route**: `GET /api/events/:eventId/seats`
- **Purpose**: Retrieves the real-time seating grid and availability for a specific event.
- **Authentication**: None (Public).
- **URL Parameters**:
  - `eventId` (integer): Unique ID of the event.
- **Successful Response (`200 OK`)**:
  ```json
  [
    {
      "id": "1701",
      "event_id": "35",
      "seat_number": "S1",
      "status": "BOOKED"
    },
    {
      "id": "1702",
      "event_id": "35",
      "seat_number": "S2",
      "status": "AVAILABLE"
    }
  ]
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "Event not found" }`

---

## 5. Venues Endpoints (Public)

### 5.1 List All Venues
- **Method & Route**: `GET /api/venues`
- **Purpose**: Retrieves the complete list of campus auditoriums, seminar halls, and activity centers.
- **Authentication**: None (Public).
- **Successful Response (`200 OK`)**:
  ```json
  [
    {
      "id": "1",
      "name": "Main Auditorium",
      "location": "Central Campus",
      "capacity": 500,
      "created_at": "2026-09-20T16:16:32.000Z"
    }
  ]
  ```

---

## 6. Reservations & Booking Endpoints

### 6.1 Book a Seat (Atomic & Concurrency-Protected)
- **Method & Route**: `POST /api/reservations`
- **Purpose**: Atomically reserves a seat for an authenticated user using database transactions and row-level locking (`SELECT ... FOR UPDATE`).
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Authorization Restrictions**: The reserving user ID is derived strictly from `req.user.id`. Any `user_id` passed in the body is discarded to prevent identity spoofing.
- **Request Body**:
  ```json
  {
    "event_id": 35,
    "seat_id": 1702
  }
  ```
- **Transaction & Concurrency Lifecycle**:
  1. Opens transaction `BEGIN`.
  2. Verifies event exists and has `status = 'PUBLISHED'`.
  3. Executes `SELECT ... FROM event_seats WHERE id = $1 AND event_id = $2 FOR UPDATE` (exclusive lock).
  4. Checks seat `status === 'AVAILABLE'`. If already booked, issues `ROLLBACK` and returns `409 Conflict`.
  5. Updates `event_seats SET status = 'BOOKED'`.
  6. Inserts row into `reservations` (`status: 'ACTIVE'`).
  7. Inserts audit log into `booking_history` (`action: 'BOOKED', performed_by: req.user.id`).
  8. Commits transaction `COMMIT`.
- **Successful Response (`201 Created`)**:
  ```json
  {
    "message": "Seat booked successfully",
    "reservation": {
      "id": "2024",
      "event_id": 35,
      "seat_id": 1702,
      "user_id": "71",
      "status": "ACTIVE",
      "booked_at": "2026-11-10T18:20:05.978Z",
      "cancelled_at": null
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "event_id and seat_id are required" }` or `{ "error": "Booking is only allowed for PUBLISHED events" }`
  - `401 Unauthorized`: `{ "error": "Access token required" }`
  - `404 Not Found`: `{ "error": "Seat not found for this event" }`
  - `409 Conflict`: `{ "error": "Seat is already booked" }`

---

### 6.2 Get Reservations
- **Method & Route**: `GET /api/reservations`
- **Purpose**: Retrieves reservation passes with event, venue, and seat data.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Authorization Scoping**:
  - `STUDENT` or `ORGANIZER`: Strictly queries `WHERE r.user_id = req.user.id` (data isolation).
  - `ADMIN`: Returns all reservations across the institution.
- **Successful Response (`200 OK`)**:
  ```json
  [
    {
      "id": "2024",
      "event_id": "35",
      "seat_id": "1702",
      "user_id": "71",
      "status": "ACTIVE",
      "booked_at": "2026-11-10T18:20:05.978Z",
      "cancelled_at": null,
      "event_title": "Tech Fest 2026 #35",
      "event_date": "2026-10-15T18:30:00.000Z",
      "start_time": "10:00:00",
      "end_time": "14:00:00",
      "seat_number": "S2",
      "venue_name": "Main Auditorium",
      "venue_location": "Academic Block A"
    }
  ]
  ```

---

### 6.3 Get Reservation by ID
- **Method & Route**: `GET /api/reservations/:id`
- **Purpose**: Retrieves a specific reservation ticket by ID.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Authorization Restrictions**: Accessible only by the reservation owner (`reservation.user_id === req.user.id`) or an `ADMIN`.
- **Successful Response (`200 OK`)**:
  ```json
  {
    "id": "2024",
    "event_id": "35",
    "seat_id": "1702",
    "user_id": "71",
    "status": "ACTIVE",
    "booked_at": "2026-11-10T18:20:05.978Z",
    "cancelled_at": null,
    "event_title": "Tech Fest 2026 #35",
    "seat_number": "S2"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Token missing.
  - `403 Forbidden`: `{ "error": "Access denied: you can only view your own reservations" }`
  - `404 Not Found`: `{ "error": "Reservation not found" }`

---

### 6.4 Cancel a Reservation
- **Method & Route**: `DELETE /api/reservations/:id`
- **Purpose**: Cancels an active reservation, restores the seat to `AVAILABLE`, and appends to `booking_history`.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Authorization Restrictions**: Must be the ticket owner (`user_id === req.user.id`) or an `ADMIN`.
- **Transaction Details**:
  1. Locks reservation and associated seat with `FOR UPDATE`.
  2. Sets `reservations.status = 'CANCELLED'` and records `cancelled_at = CURRENT_TIMESTAMP`.
  3. Updates `event_seats.status = 'AVAILABLE'`.
  4. Records `action: 'CANCELLED'` in `booking_history`.
  5. Commits `COMMIT`.
- **Successful Response (`200 OK`)**:
  ```json
  {
    "message": "Reservation cancelled successfully",
    "reservation_id": 2024
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Reservation is already cancelled" }`
  - `401 Unauthorized`: Missing token.
  - `403 Forbidden`: `{ "error": "Access denied: you can only cancel your own reservations" }`
  - `404 Not Found`: `{ "error": "Reservation not found" }`

---

## 7. Organizer Endpoints

### 7.1 Get Organizer Events
- **Method & Route**: `GET /api/organizer/events`
- **Purpose**: Lists events managed by the authenticated organizer.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ORGANIZER` or `ADMIN`.
- **Authorization Scoping**: Organizers receive only events where `organizer_id = req.user.id`. Admins receive all events.
- **Successful Response (`200 OK`)**:
  ```json
  [
    {
      "id": "35",
      "title": "Tech Fest 2026 #35",
      "status": "PUBLISHED",
      "event_date": "2026-10-15T18:30:00.000Z",
      "venue_name": "Main Auditorium",
      "total_seats": 50,
      "booked_seats": 22,
      "available_seats": 28
    }
  ]
  ```

---

### 7.2 Create New Event (with Dynamic Seat Generation)
- **Method & Route**: `POST /api/events`
- **Purpose**: Creates an event and dynamically generates its seat matrix.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ORGANIZER` or `ADMIN`.
- **Request Body**:
  ```json
  {
    "title": "AI & Robotics Summit",
    "description": "Keynotes and live robotics demonstration.",
    "event_date": "2026-12-15",
    "start_time": "10:00:00",
    "end_time": "13:00:00",
    "venue_id": 1,
    "status": "PUBLISHED",
    "capacity": 30
  }
  ```
- **Behavior**: Verifies `capacity <= venue.capacity`. Sets `organizer_id = req.user.id`. Inside a transaction, inserts event and batch inserts `S1`..`S{capacity}` into `event_seats`.
- **Successful Response (`201 Created`)**:
  ```json
  {
    "message": "Event created successfully",
    "event": {
      "id": "101",
      "title": "AI & Robotics Summit",
      "status": "PUBLISHED",
      "venue_id": 1
    },
    "total_seats": 30
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure (e.g. `start_time >= end_time`, or requested capacity exceeds venue maximum).

---

### 7.3 Update Event & Dynamic Seat Adjustment
- **Method & Route**: `PUT /api/events/:id`
- **Purpose**: Modifies event details and dynamically expands or prunes unbooked seats if capacity changes.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ORGANIZER` (must be event owner) or `ADMIN`.
- **Request Body**:
  ```json
  {
    "title": "AI & Robotics Summit (Expanded)",
    "capacity": 40
  }
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "message": "Event updated successfully",
    "event": { "id": "101", "title": "AI & Robotics Summit (Expanded)" },
    "total_seats": 40
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: Attempting to modify an event owned by another organizer.
  - `400 Bad Request`: Cannot reduce capacity below the count of already booked seats.

---

### 7.4 Update Event Status
- **Method & Route**: `PATCH /api/events/:id/status`
- **Purpose**: Transitions event lifecycle status between `'DRAFT'`, `'PUBLISHED'`, or `'CANCELLED'`.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ORGANIZER` (owner) or `ADMIN`.
- **Request Body**:
  ```json
  {
    "status": "CANCELLED"
  }
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "message": "Event status updated successfully",
    "event": { "id": "101", "status": "CANCELLED" }
  }
  ```

---

### 7.5 Get Event Attendee List
- **Method & Route**: `GET /api/events/:id/attendees`
- **Purpose**: Retrieves the roster of students holding confirmed passes for an event.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ORGANIZER` (owner) or `ADMIN`.
- **Successful Response (`200 OK`)**:
  ```json
  {
    "event_id": "35",
    "event_title": "Tech Fest 2026 #35",
    "total_attendees": 1,
    "attendees": [
      {
        "reservation_id": "2006",
        "user_id": "1",
        "user_name": "Aarav Sharma",
        "user_email": "aarav@campus.edu",
        "seat_id": "1701",
        "seat_number": "S1",
        "booked_at": "2026-09-20T16:16:32.000Z"
      }
    ]
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: Non-owner organizer or student blocked.

---

## 8. Admin Management Endpoints

### 8.1 System Statistics Overview
- **Method & Route**: `GET /api/admin/stats`
- **Purpose**: Returns platform-wide aggregate counts and metrics.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.
- **Successful Response (`200 OK`)**:
  ```json
  {
    "total_users": 70,
    "total_events": 100,
    "total_venues": 20,
    "total_seats": 5000,
    "total_reservations": 2023,
    "active_reservations": 1420,
    "cancelled_reservations": 603,
    "global_occupancy_rate": 28.4
  }
  ```

---

### 8.2 User Management Roster
- **Method & Route**: `GET /api/admin/users`
- **Purpose**: Lists all users with their roles and active reservation counts.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.
- **Successful Response (`200 OK`)**:
  ```json
  [
    {
      "id": "66",
      "name": "Demo Admin",
      "email": "demo_admin@campus.edu",
      "role": "ADMIN",
      "created_at": "2026-09-20T16:16:32.000Z",
      "active_reservations": 0,
      "total_reservations": 0
    }
  ]
  ```

---

### 8.3 Update User Role (with Last-Admin Protection)
- **Method & Route**: `PATCH /api/admin/users/:id/role`
- **Purpose**: Upgrades or demotes a user's role.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.
- **Request Body**:
  ```json
  {
    "role": "ORGANIZER"
  }
  ```
- **Safeguard**: Prevents demoting the last remaining active `ADMIN` in the system.
- **Successful Response (`200 OK`)**:
  ```json
  {
    "message": "User role updated successfully",
    "user": { "id": "15", "role": "ORGANIZER" }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid role value or attempt to demote the sole admin.

---

### 8.4 Admin Event Registry
- **Method & Route**: `GET /api/admin/events`
- **Purpose**: Returns the exhaustive event registry across all statuses with organizer metadata.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.

---

### 8.5 Create Venue
- **Method & Route**: `POST /api/venues`
- **Purpose**: Registers a new physical campus auditorium or hall.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.
- **Request Body**:
  ```json
  {
    "name": "Innovation Hall C",
    "location": "North Research Complex",
    "capacity": 250
  }
  ```
- **Successful Response (`201 Created`)**:
  ```json
  {
    "message": "Venue created successfully",
    "venue": { "id": "21", "name": "Innovation Hall C", "capacity": 250 }
  }
  ```

---

### 8.6 Update Venue
- **Method & Route**: `PUT /api/venues/:id`
- **Purpose**: Updates venue name, campus location, or capacity.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.

---

### 8.7 Delete Venue (Referential Integrity Guard)
- **Method & Route**: `DELETE /api/venues/:id`
- **Purpose**: Deletes a venue from the campus directory.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ADMIN`.
- **Safeguard**: Rejects deletion with `409 Conflict` if any events are currently assigned to the venue.
- **Successful Response (`200 OK`)**:
  ```json
  {
    "message": "Venue deleted successfully",
    "venue_id": 21
  }
  ```
- **Error Responses**:
  - `409 Conflict`: `{ "error": "Cannot delete venue: it is associated with existing events. Remove or reschedule those events first." }`

---

## 9. Analytics Endpoints (SQL Aggregates)

### 9.1 Event Occupancy & Venue Analytics
- **Method & Route**: `GET /api/analytics/events`
- **Purpose**: Computes seat occupancy rates, active reservations, and seat distribution using multi-table SQL `JOIN`, `COUNT(DISTINCT ...)`, conditional `CASE`, and `GROUP BY`.
- **Authentication**: Required (`Authorization: Bearer <token>`).
- **Required Role**: `ORGANIZER` or `ADMIN`.
- **Authorization Scoping**: Organizers see analytics only for events they own; Admins see analytics across all campus events.
- **SQL Aggregation Engine**:
  ```sql
  SELECT
      e.id AS event_id,
      e.title AS event_title,
      e.status AS event_status,
      e.event_date,
      e.start_time,
      e.end_time,
      v.id AS venue_id,
      v.name AS venue_name,
      v.capacity AS venue_capacity,
      COUNT(DISTINCT es.id)::int AS total_seats,
      COUNT(DISTINCT CASE WHEN es.status = 'BOOKED' THEN es.id END)::int AS booked_seats,
      COUNT(DISTINCT CASE WHEN es.status = 'AVAILABLE' THEN es.id END)::int AS available_seats,
      COUNT(DISTINCT CASE WHEN r.status = 'ACTIVE' THEN r.id END)::int AS active_reservations,
      COUNT(DISTINCT CASE WHEN r.status = 'CANCELLED' THEN r.id END)::int AS cancelled_reservations,
      ROUND(
          CASE 
              WHEN COUNT(DISTINCT es.id) > 0 
              THEN (COUNT(DISTINCT CASE WHEN es.status = 'BOOKED' THEN es.id END)::numeric / COUNT(DISTINCT es.id) * 100) 
              ELSE 0 
          END, 
          1
      )::float AS occupancy_rate_percent
  FROM events e
  JOIN venues v ON e.venue_id = v.id
  LEFT JOIN event_seats es ON e.id = es.event_id
  LEFT JOIN reservations r ON e.id = r.event_id
  GROUP BY e.id, e.title, e.status, e.event_date, e.start_time, e.end_time, v.id, v.name, v.capacity
  ORDER BY e.event_date, e.id;
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "count": 100,
    "events": [
      {
        "event_id": "35",
        "event_title": "Tech Fest 2026 #35",
        "event_status": "PUBLISHED",
        "event_date": "2026-10-15T18:30:00.000Z",
        "start_time": "10:00:00",
        "end_time": "14:00:00",
        "venue_id": "8",
        "venue_name": "Main Auditorium",
        "venue_capacity": 500,
        "total_seats": 50,
        "booked_seats": 14,
        "available_seats": 36,
        "active_reservations": 14,
        "cancelled_reservations": 4,
        "occupancy_rate_percent": 28.0
      }
    ]
  }
  ```
- **Mathematical Invariant**:
  $$\text{total\_seats} = \text{booked\_seats} + \text{available\_seats}$$
- **Error Responses**:
  - `401 Unauthorized`: Token missing.
  - `403 Forbidden`: User with role `'STUDENT'` rejected.
