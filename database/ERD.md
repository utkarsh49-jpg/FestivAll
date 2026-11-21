CAMPUS EVENT BOOKING SYSTEM — ER DIAGRAM

┌─────────────────────────┐
│          USERS          │
├─────────────────────────┤
│ PK id                   │
│ name                    │
│ UK email                │
│ password_hash           │
│ role                    │
│ created_at              │
└───────────┬─────────────┘
            │
       ┌────┴───────────────┐
       │                    │
       │ 1:N                │ 1:N
       ▼                    ▼
┌──────────────────┐   ┌────────────────────┐
│      EVENTS      │   │    RESERVATIONS    │
├──────────────────┤   ├────────────────────┤
│ PK id            │   │ PK id              │
│ title            │   │ FK event_id        │
│ description      │   │ FK seat_id         │
│ event_date       │   │ FK user_id         │
│ start_time       │   │ status             │
│ end_time         │   │ booked_at          │
│ FK venue_id      │   │ cancelled_at       │
│ FK organizer_id  │   └─────────┬──────────┘
│ status           │             │
│ created_at       │             │ 1:N
└───────┬──────────┘             ▼
        │ 1:N          ┌────────────────────┐
        ▼              │  BOOKING_HISTORY   │
┌──────────────────┐   ├────────────────────┤
│   EVENT_SEATS    │   │ PK id              │
├──────────────────┤   │ FK reservation_id  │
│ PK id            │   │ action             │
│ FK event_id      │   │ FK performed_by    │
│ seat_number      │   │ created_at         │
│ status           │   └────────────────────┘
└──────────────────┘


┌─────────────────────────┐
│         VENUES          │
├─────────────────────────┤
│ PK id                   │
│ name                    │
│ location                │
│ capacity                │
│ created_at              │
└────────────┬────────────┘
             │
             │ 1:N
             ▼
           EVENTS


RELATIONSHIPS

1. USERS 1:N EVENTS
   A user/organizer can organize multiple events.

2. USERS 1:N RESERVATIONS
   A user can make multiple reservations.

3. USERS 1:N BOOKING_HISTORY
   A user can perform multiple booking actions.

4. VENUES 1:N EVENTS
   A venue can host multiple events.

5. EVENTS 1:N EVENT_SEATS
   An event contains multiple seats.

6. EVENTS 1:N RESERVATIONS
   An event can have multiple reservations.

7. EVENT_SEATS 1:N RESERVATIONS
   A seat can have multiple historical reservations, although only
   one ACTIVE reservation is allowed at a time.

8. RESERVATIONS 1:N BOOKING_HISTORY
   A reservation can have multiple history records.

IMPORTANT CONSTRAINTS

- event_seats: UNIQUE(event_id, seat_number)
- reservations: UNIQUE(event_id, seat_id) WHERE status = 'ACTIVE'
- users.email: UNIQUE           