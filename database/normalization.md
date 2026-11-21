# Database Normalization

## First Normal Form (1NF)

All tables contain atomic values. Repeating groups and multi-valued
attributes are avoided.

For example, each event seat is stored as a separate row in
event_seats, and each user has a single value for name, email, and role.

Therefore, the schema satisfies 1NF.

## Second Normal Form (2NF)

The tables use single-column primary keys. Therefore, there are no
partial dependencies on a portion of a composite primary key.

The event_seats table also uses UNIQUE(event_id, seat_number) to ensure
that a seat number is unique within a particular event.

Therefore, the schema satisfies 2NF.

## Third Normal Form (3NF)

Non-key attributes depend on their respective table's primary key and
not on other non-key attributes.

Venue information is stored separately in the venues table and events
refer to it using venue_id.

User information is stored in users and referenced through user_id.

Reservation information is stored separately from event and user
information.

This reduces data duplication and update anomalies.

Therefore, the schema satisfies 3NF.