CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_check
        CHECK (role IN ('STUDENT', 'ORGANIZER', 'ADMIN'))
);
CREATE TABLE venues (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT venues_capacity_check
        CHECK (capacity > 0)
);
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue_id BIGINT NOT NULL,
    organizer_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT events_time_check
        CHECK (start_time < end_time),

    CONSTRAINT events_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED')),

    CONSTRAINT events_venue_fk
        FOREIGN KEY (venue_id)
        REFERENCES venues(id),

    CONSTRAINT events_organizer_fk
        FOREIGN KEY (organizer_id)
        REFERENCES users(id)
);
CREATE TABLE event_seats (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT event_seats_event_fk
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT event_seats_unique_number
        UNIQUE (event_id, seat_number),

    CONSTRAINT event_seats_id_event_unique
        UNIQUE (id, event_id),

    CONSTRAINT event_seats_status_check
        CHECK (status IN ('AVAILABLE', 'BOOKED'))
);
CREATE TABLE reservations (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    booked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,

    CONSTRAINT reservations_event_fk
        FOREIGN KEY (event_id)
        REFERENCES events(id),

    CONSTRAINT reservations_seat_fk
        FOREIGN KEY (seat_id)
        REFERENCES event_seats(id),

    CONSTRAINT reservations_seat_event_fk
        FOREIGN KEY (seat_id, event_id)
        REFERENCES event_seats(id, event_id),

    CONSTRAINT reservations_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT reservations_status_check
        CHECK (status IN ('ACTIVE', 'CANCELLED')),

    CONSTRAINT reservations_cancel_time_check
        CHECK (
            (status = 'ACTIVE' AND cancelled_at IS NULL)
            OR
            (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
        )
);
CREATE TABLE booking_history (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    performed_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT booking_history_reservation_fk
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT booking_history_user_fk
        FOREIGN KEY (performed_by)
        REFERENCES users(id),

    CONSTRAINT booking_history_action_check
        CHECK (action IN ('BOOKED', 'CANCELLED'))
);
CREATE UNIQUE INDEX reservations_one_active_seat
ON reservations (event_id, seat_id)
WHERE status = 'ACTIVE';

CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_seat_id ON reservations(seat_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_booking_history_reservation_id ON booking_history(reservation_id);
