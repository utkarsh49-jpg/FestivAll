require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_fest_jwt_key_2026_campus_event_booking_secure";

const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "campus_event_booking",
    password: process.env.DB_PASSWORD || "1234",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432
});

// Test database connection
pool.connect()
    .then(client => {
        console.log("✅ Database connected successfully!");
        client.release();
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err.message);
    });

// Authentication Middleware: Verifies Bearer JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({
            error: "Access token required"
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: "Invalid or expired token"
            });
        }
        req.user = user;
        next();
    });
}

// Role-Based Authorization Middleware
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: "Access denied: insufficient permissions"
            });
        }
        next();
    };
}

// Helper: strictly parses positive integer IDs to prevent SQL cast errors and 500s
function parsePositiveInt(val) {
    if (typeof val === "number" && Number.isInteger(val) && val > 0) {
        return val;
    }
    if (typeof val === "string" && /^[1-9]\d*$/.test(val.trim())) {
        return parseInt(val.trim(), 10);
    }
    return null;
}

// Test API
app.get("/", (req, res) => {
    res.json({
        message: "Campus Event Booking API is running 🚀"
    });
});

// =========================================================
// AUTHENTICATION ENDPOINTS
// =========================================================

// Register a new user (Public registration always creates STUDENT accounts)
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({
                error: "Valid full name is required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                error: "Valid email address is required"
            });
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters long"
            });
        }

        // Safeguard 5: Public registration strictly creates STUDENT accounts
        const role = "STUDENT";

        // Check if email already registered
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
            [email.trim()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "Email already registered"
            });
        }

        // Hash password with bcryptjs
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `
            INSERT INTO users (name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role, created_at
            `,
            [name.trim(), email.trim().toLowerCase(), password_hash, role]
        );

        const newUser = result.rows[0];

        // Generate JWT
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: newUser
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            error: "Failed to register user"
        });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT id, name, email, password_hash, role, created_at FROM users WHERE LOWER(email) = LOWER($1)",
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Safeguard 6: Do not treat placeholder as valid password or silently convert it
        if (user.password_hash === "seeded_password_hash") {
            return res.status(401).json({
                error: "This demo account uses placeholder credentials. Please register a new account or set a password."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            error: "Failed to log in"
        });
    }
});

// Authenticated current user endpoint
app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Auth me error:", error);
        res.status(500).json({
            error: "Failed to fetch user profile"
        });
    }
});

// =========================================================
// PUBLIC DISCOVERY ENDPOINTS
// =========================================================

// Get all venues (Public)
app.get("/api/venues", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM venues ORDER BY id"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch venues"
        });
    }
});

// Get all published events (Public - strictly filters to PUBLISHED only)
app.get("/api/events", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.id,
                e.title,
                e.description,
                e.event_date,
                e.start_time,
                e.end_time,
                e.venue_id,
                v.name AS venue_name,
                v.location AS venue_location,
                e.organizer_id,
                e.status,
                e.created_at
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            WHERE e.status = 'PUBLISHED'
            ORDER BY e.event_date, e.start_time
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch events"
        });
    }
});

// Get seats for a specific event (Public)
app.get("/api/events/:eventId/seats", async (req, res) => {
    try {
        const eventId = parsePositiveInt(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({
                error: "Valid positive integer eventId is required"
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                event_id,
                seat_number,
                status
            FROM event_seats
            WHERE event_id = $1
            ORDER BY id
            `,
            [eventId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch seats"
        });
    }
});

// =========================================================
// RESERVATION ENDPOINTS (AUTHENTICATED & AUTHORIZED)
// =========================================================

// Book a seat (Authenticated: user_id derived from verified JWT)
app.post("/api/reservations", authenticateToken, async (req, res) => {
    const event_id = parsePositiveInt(req.body.event_id);
    const seat_id = parsePositiveInt(req.body.seat_id);

    if (!event_id || !seat_id) {
        return res.status(400).json({
            error: "Valid positive integer event_id and seat_id are required"
        });
    }

    // Safeguard 7: user_id derived from authenticated token, not request body
    const user_id = req.user.id;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Verify that event exists and is PUBLISHED
        const eventRes = await client.query(
            "SELECT id, status FROM events WHERE id = $1",
            [event_id]
        );
        if (eventRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Event not found" });
        }
        if (eventRes.rows[0].status !== 'PUBLISHED') {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Booking is only allowed for PUBLISHED events" });
        }

        // Lock the selected seat
        const seatResult = await client.query(
            `
            SELECT id, event_id, seat_number, status
            FROM event_seats
            WHERE id = $1 AND event_id = $2
            FOR UPDATE
            `,
            [seat_id, event_id]
        );

        if (seatResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                error: "Seat not found for this event"
            });
        }

        const seat = seatResult.rows[0];

        // Check whether the seat is already booked
        if (seat.status === "BOOKED") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                error: "Seat is already booked"
            });
        }

        // Create reservation
        const reservationResult = await client.query(
            `
            INSERT INTO reservations
                (event_id, seat_id, user_id, status)
            VALUES
                ($1, $2, $3, 'ACTIVE')
            RETURNING *
            `,
            [event_id, seat_id, user_id]
        );

        const reservation = reservationResult.rows[0];

        // Mark seat as booked
        await client.query(
            `
            UPDATE event_seats
            SET status = 'BOOKED'
            WHERE id = $1
            `,
            [seat_id]
        );

        // Add booking history
        await client.query(
            `
            INSERT INTO booking_history
                (reservation_id, action, performed_by)
            VALUES
                ($1, 'BOOKED', $2)
            `,
            [reservation.id, user_id]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Seat booked successfully",
            reservation: reservation
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }

        // Defense-in-Depth Layer 2: catch unique index violation (reservations_one_active_seat) as 409 Conflict
        if (error.code === "23505") {
            return res.status(409).json({
                error: "Seat is already booked (reservation conflict)"
            });
        }

        console.error("Booking error:", error);

        res.status(500).json({
            error: "Failed to book seat"
        });
    } finally {
        client.release();
    }
});

// Get a single reservation by ID (Protected: owner or ADMIN only)
app.get("/api/reservations/:id", authenticateToken, async (req, res) => {
    try {
        const reservationId = parsePositiveInt(req.params.id);
        if (!reservationId) {
            return res.status(400).json({
                error: "Valid positive integer reservation ID is required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM reservations WHERE id = $1",
            [reservationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Reservation not found"
            });
        }

        const reservation = result.rows[0];

        // Authorization check: only owner or ADMIN can view this reservation
        if (req.user.role !== "ADMIN" && String(reservation.user_id) !== String(req.user.id)) {
            return res.status(403).json({
                error: "Access denied: you can only view your own reservations"
            });
        }

        res.status(200).json(reservation);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch reservation"
        });
    }
});

// Get reservations (Protected: Students/Organizers get only their own, ADMIN gets all)
app.get("/api/reservations", authenticateToken, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === "ADMIN") {
            // Admin can view all, or optionally filter by user_id
            if (req.query.user_id !== undefined) {
                const filterUserId = parsePositiveInt(req.query.user_id);
                if (!filterUserId) {
                    return res.status(400).json({
                        error: "Valid positive integer user_id query parameter is required"
                    });
                }
                query = `
                    SELECT r.id, r.event_id, r.seat_id, r.user_id, r.status, r.booked_at, r.cancelled_at, es.seat_number
                    FROM reservations r
                    LEFT JOIN event_seats es ON r.seat_id = es.id
                    WHERE r.user_id = $1
                    ORDER BY r.id;
                `;
                params = [filterUserId];
            } else {
                query = `
                    SELECT r.id, r.event_id, r.seat_id, r.user_id, r.status, r.booked_at, r.cancelled_at, es.seat_number
                    FROM reservations r
                    LEFT JOIN event_seats es ON r.seat_id = es.id
                    ORDER BY r.id;
                `;
            }
        } else {
            // Students and Organizers strictly receive only their own reservations
            query = `
                SELECT r.id, r.event_id, r.seat_id, r.user_id, r.status, r.booked_at, r.cancelled_at, es.seat_number
                FROM reservations r
                LEFT JOIN event_seats es ON r.seat_id = es.id
                WHERE r.user_id = $1
                ORDER BY r.id;
            `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch reservations"
        });
    }
});

// Cancel a reservation (Authenticated: only owner or ADMIN can cancel)
app.delete("/api/reservations/:id", authenticateToken, async (req, res) => {
    const reservationId = parsePositiveInt(req.params.id);
    if (!reservationId) {
        return res.status(400).json({
            error: "Valid positive integer reservation ID is required"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Get the reservation with row lock
        const result = await client.query(
            `SELECT event_id, seat_id, user_id, status
             FROM reservations
             WHERE id = $1
             FOR UPDATE`,
            [reservationId]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                error: "Reservation not found"
            });
        }

        const reservation = result.rows[0];

        // Safeguard 8: Ensure authorization checks occur before modifying any records
        const isOwner = String(reservation.user_id) === String(req.user.id);
        const isAdmin = req.user.role === "ADMIN";

        if (!isOwner && !isAdmin) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                error: "Access denied: you can only cancel your own reservations"
            });
        }

        if (reservation.status === "CANCELLED") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                error: "Reservation is already cancelled"
            });
        }

        // Cancel reservation
        await client.query(
            `UPDATE reservations
             SET status = 'CANCELLED',
                 cancelled_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [reservationId]
        );

        // Make seat available again
        await client.query(
            `UPDATE event_seats
             SET status = 'AVAILABLE'
             WHERE id = $1`,
            [reservation.seat_id]
        );

        // Add booking history
        await client.query(
            `INSERT INTO booking_history
             (reservation_id, action, performed_by)
             VALUES ($1, 'CANCELLED', $2)`,
            [reservationId, req.user.id]
        );

        await client.query("COMMIT");

        res.json({
            message: "Reservation cancelled successfully",
            reservation_id: Number(reservationId)
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }

        console.error(error);

        res.status(500).json({
            error: "Failed to cancel reservation"
        });
    } finally {
        client.release();
    }
});

// =========================================================
// ANALYTICS & REPORTING ENDPOINTS (SQL AGGREGATIONS)
// =========================================================

// Event booking and occupancy statistics (Protected: ORGANIZER & ADMIN)
// Scope: ORGANIZERS receive only their own events; ADMINS receive all
app.get("/api/analytics/events", authenticateToken, requireRole("ORGANIZER", "ADMIN"), async (req, res) => {
    try {
        let whereClause = "";
        let params = [];

        if (req.user.role === "ORGANIZER") {
            whereClause = "WHERE e.organizer_id = $1";
            params = [req.user.id];
        }

        const query = `
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
            ${whereClause}
            GROUP BY e.id, e.title, e.status, e.event_date, e.start_time, e.end_time, v.id, v.name, v.capacity
            ORDER BY e.event_date, e.id;
        `;

        const result = await pool.query(query, params);

        res.status(200).json({
            count: result.rows.length,
            events: result.rows
        });

    } catch (error) {
        console.error("Analytics query error:", error);
        res.status(500).json({
            error: "Failed to fetch event analytics"
        });
    }
});

// =========================================================
// ORGANIZER MANAGEMENT ENDPOINTS
// =========================================================

// Get organizer's own events with seating summaries
app.get("/api/organizer/events", authenticateToken, requireRole("ORGANIZER", "ADMIN"), async (req, res) => {
    try {
        const organizerId = req.user.id;

        const query = `
            SELECT
                e.id,
                e.title,
                e.description,
                e.event_date,
                e.start_time,
                e.end_time,
                e.venue_id,
                v.name AS venue_name,
                v.location AS venue_location,
                v.capacity AS venue_capacity,
                e.organizer_id,
                e.status,
                e.created_at,
                COUNT(DISTINCT es.id)::int AS total_seats,
                COUNT(DISTINCT CASE WHEN es.status = 'BOOKED' THEN es.id END)::int AS booked_seats,
                COUNT(DISTINCT CASE WHEN es.status = 'AVAILABLE' THEN es.id END)::int AS available_seats
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            LEFT JOIN event_seats es ON e.id = es.event_id
            WHERE e.organizer_id = $1
            GROUP BY e.id, e.title, e.description, e.event_date, e.start_time, e.end_time, e.venue_id, v.name, v.location, v.capacity, e.organizer_id, e.status, e.created_at
            ORDER BY e.event_date DESC, e.start_time DESC;
        `;

        const result = await pool.query(query, [organizerId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Organizer events error:", error);
        res.status(500).json({ error: "Failed to fetch organizer events" });
    }
});

// Create new event (Atomic: creates event + dynamic seats up to venue capacity)
app.post("/api/events", authenticateToken, requireRole("ORGANIZER", "ADMIN"), async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            title,
            description,
            event_date,
            start_time,
            end_time,
            venue_id,
            status = "PUBLISHED",
            capacity: requestedCapacity
        } = req.body;

        // Validation: title
        if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 200) {
            return res.status(400).json({ error: "Event title must be between 3 and 200 characters" });
        }

        // Validation: date format and not in past
        if (!event_date || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
            return res.status(400).json({ error: "Valid event date (YYYY-MM-DD) is required" });
        }
        const eventDateObj = new Date(event_date + "T00:00:00");
        if (isNaN(eventDateObj.getTime())) {
            return res.status(400).json({ error: "Invalid calendar date provided" });
        }

        // Validation: time
        if (!start_time || !end_time) {
            return res.status(400).json({ error: "Start time and end time are required" });
        }
        if (start_time >= end_time) {
            return res.status(400).json({ error: "Start time must be strictly before end time" });
        }

        // Validation: status
        const validStatuses = ["DRAFT", "PUBLISHED", "CANCELLED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Status must be DRAFT, PUBLISHED, or CANCELLED" });
        }

        // Validation: venue existence and capacity check
        const parsedVenueId = parsePositiveInt(venue_id);
        if (!parsedVenueId) {
            return res.status(400).json({ error: "Valid positive integer venue_id is required" });
        }

        const venueRes = await client.query("SELECT id, name, capacity FROM venues WHERE id = $1", [parsedVenueId]);
        if (venueRes.rows.length === 0) {
            return res.status(404).json({ error: "Selected venue does not exist" });
        }
        const venue = venueRes.rows[0];

        // Determine seating capacity (flexible: defaults to venue capacity or requested, min 1, max venue.capacity)
        let seatCapacity = venue.capacity;
        if (requestedCapacity !== undefined && requestedCapacity !== null) {
            const parsedCap = Number(requestedCapacity);
            if (!Number.isInteger(parsedCap) || parsedCap <= 0) {
                return res.status(400).json({ error: "Capacity must be a positive integer" });
            }
            if (parsedCap > venue.capacity) {
                return res.status(400).json({
                    error: `Requested capacity (${parsedCap}) exceeds venue maximum capacity (${venue.capacity})`
                });
            }
            seatCapacity = parsedCap;
        }

        await client.query("BEGIN");

        // Insert event
        const organizer_id = req.user.id;
        const insertEventRes = await client.query(
            `
            INSERT INTO events
                (title, description, event_date, start_time, end_time, venue_id, organizer_id, status)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [
                title.trim(),
                description ? description.trim() : null,
                event_date,
                start_time,
                end_time,
                venue_id,
                organizer_id,
                status
            ]
        );
        const newEvent = insertEventRes.rows[0];

        // Bulk insert dynamic seats: S1 through S{seatCapacity}
        // Using unnest / values chunking for transactional seat insertion
        const seatNumbers = [];
        for (let i = 1; i <= seatCapacity; i++) {
            seatNumbers.push(`S${i}`);
        }

        await client.query(
            `
            INSERT INTO event_seats (event_id, seat_number, status)
            SELECT $1, unnest($2::text[]), 'AVAILABLE'
            `,
            [newEvent.id, seatNumbers]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Event and auditorium seats created successfully",
            event: newEvent,
            total_seats: seatCapacity
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.error("Create event error:", error);
        res.status(500).json({ error: "Failed to create event" });
    } finally {
        client.release();
    }
});

// Edit event details & manage capacity safely
app.put("/api/events/:id", authenticateToken, requireRole("ORGANIZER", "ADMIN"), async (req, res) => {
    const eventId = parsePositiveInt(req.params.id);
    if (!eventId) {
        return res.status(400).json({ error: "Valid positive integer event ID is required" });
    }

    const client = await pool.connect();

    try {
        const {
            title,
            description,
            event_date,
            start_time,
            end_time,
            venue_id,
            status,
            capacity: newCapacity
        } = req.body;

        // Validation: event_date format if provided
        if (event_date !== undefined && event_date !== null) {
            if (typeof event_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
                return res.status(400).json({ error: "Valid event date (YYYY-MM-DD) is required" });
            }
            const eventDateObj = new Date(event_date + "T00:00:00");
            if (isNaN(eventDateObj.getTime())) {
                return res.status(400).json({ error: "Invalid calendar date provided" });
            }
        }

        // Validation: time formats if provided
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
        if (start_time !== undefined && start_time !== null && !timeRegex.test(start_time)) {
            return res.status(400).json({ error: "Valid start_time (HH:MM or HH:MM:SS) is required" });
        }
        if (end_time !== undefined && end_time !== null && !timeRegex.test(end_time)) {
            return res.status(400).json({ error: "Valid end_time (HH:MM or HH:MM:SS) is required" });
        }

        // Validation: venue_id if provided
        if (venue_id !== undefined && venue_id !== null) {
            const parsedVenueId = parsePositiveInt(venue_id);
            if (!parsedVenueId) {
                return res.status(400).json({ error: "Valid positive integer venue_id is required" });
            }
        }

        await client.query("BEGIN");

        // 1. Fetch event with row lock to prevent race conditions
        const eventRes = await client.query(
            "SELECT * FROM events WHERE id = $1 FOR UPDATE",
            [eventId]
        );

        if (eventRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Event not found" });
        }

        const existingEvent = eventRes.rows[0];

        // 2. Strict ownership check: only owner or ADMIN
        if (req.user.role !== "ADMIN" && String(existingEvent.organizer_id) !== String(req.user.id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Access denied: you can only modify your own events" });
        }

        // 3. Validation: status transitions
        if (status) {
            const validStatuses = ["DRAFT", "PUBLISHED", "CANCELLED"];
            if (!validStatuses.includes(status)) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Invalid event status" });
            }
            if (existingEvent.status === "CANCELLED" && status !== "CANCELLED") {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Cancelled events cannot be reactivated" });
            }
        }

        // 4. Validation: title, times, date if provided
        const updatedTitle = title !== undefined ? title.trim() : existingEvent.title;
        if (updatedTitle.length < 3 || updatedTitle.length > 200) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Event title must be between 3 and 200 characters" });
        }

        const updatedDate = event_date || existingEvent.event_date;
        const updatedStartTime = start_time || existingEvent.start_time;
        const updatedEndTime = end_time || existingEvent.end_time;

        if (updatedStartTime >= updatedEndTime) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Start time must be strictly before end time" });
        }

        const updatedVenueId = venue_id || existingEvent.venue_id;
        const venueRes = await client.query("SELECT id, name, capacity FROM venues WHERE id = $1", [updatedVenueId]);
        if (venueRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Target venue not found" });
        }
        const venue = venueRes.rows[0];

        // 5. Handle capacity updates safely and transactionally
        if (newCapacity !== undefined && newCapacity !== null) {
            const targetCap = Number(newCapacity);
            if (!Number.isInteger(targetCap) || targetCap <= 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Capacity must be a positive integer" });
            }
            if (targetCap > venue.capacity) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: `Requested capacity (${targetCap}) exceeds venue limit (${venue.capacity})`
                });
            }

            // Fetch current seats
            const seatsRes = await client.query(
                "SELECT id, seat_number, status FROM event_seats WHERE event_id = $1 FOR UPDATE",
                [eventId]
            );
            const currentSeats = seatsRes.rows;
            const currentCount = currentSeats.length;
            const bookedSeats = currentSeats.filter(s => s.status === "BOOKED");

            if (targetCap < bookedSeats.length) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: `Cannot reduce capacity to ${targetCap}: ${bookedSeats.length} seats are already booked`
                });
            }

            if (targetCap < currentCount) {
                // Must reduce capacity: check if any seat beyond targetCap is BOOKED
                const bookedBeyondLimit = currentSeats.filter(s => {
                    const num = parseInt(s.seat_number.replace("S", ""), 10);
                    return num > targetCap && s.status === "BOOKED";
                });

                if (bookedBeyondLimit.length > 0) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error: `Cannot reduce capacity to ${targetCap}: Seat ${bookedBeyondLimit[0].seat_number} is already booked`
                    });
                }

                // Safely delete unbooked seats above targetCap
                await client.query(
                    `
                    DELETE FROM event_seats
                    WHERE event_id = $1 
                      AND seat_number ~ '^S[0-9]+$'
                      AND substring(seat_number from 2)::int > $2
                      AND status = 'AVAILABLE'
                    `,
                    [eventId, targetCap]
                );
            } else if (targetCap > currentCount) {
                // Add new seats from currentCount + 1 to targetCap
                const newSeats = [];
                for (let i = currentCount + 1; i <= targetCap; i++) {
                    newSeats.push(`S${i}`);
                }
                await client.query(
                    `
                    INSERT INTO event_seats (event_id, seat_number, status)
                    SELECT $1, unnest($2::text[]), 'AVAILABLE'
                    `,
                    [eventId, newSeats]
                );
            }
        }

        // 6. Update event record
        const finalStatus = status || existingEvent.status;
        const updateEventRes = await client.query(
            `
            UPDATE events
            SET title = $1,
                description = $2,
                event_date = $3,
                start_time = $4,
                end_time = $5,
                venue_id = $6,
                status = $7
            WHERE id = $8
            RETURNING *
            `,
            [
                updatedTitle,
                description !== undefined ? (description ? description.trim() : null) : existingEvent.description,
                updatedDate,
                updatedStartTime,
                updatedEndTime,
                updatedVenueId,
                finalStatus,
                eventId
            ]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Event updated successfully",
            event: updateEventRes.rows[0]
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.error("Update event error:", error);
        res.status(500).json({ error: "Failed to update event" });
    } finally {
        client.release();
    }
});

// Update event status quickly (PUBLISHED, DRAFT, CANCELLED)
app.patch("/api/events/:id/status", authenticateToken, requireRole("ORGANIZER", "ADMIN"), async (req, res) => {
    const eventId = parsePositiveInt(req.params.id);
    if (!eventId) {
        return res.status(400).json({ error: "Valid positive integer event ID is required" });
    }

    const client = await pool.connect();

    try {
        const { status } = req.body;
        const validStatuses = ["DRAFT", "PUBLISHED", "CANCELLED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status. Must be DRAFT, PUBLISHED, or CANCELLED" });
        }

        await client.query("BEGIN");

        const eventRes = await client.query(
            "SELECT * FROM events WHERE id = $1 FOR UPDATE",
            [eventId]
        );

        if (eventRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Event not found" });
        }

        const existingEvent = eventRes.rows[0];

        // Ownership check
        if (req.user.role !== "ADMIN" && String(existingEvent.organizer_id) !== String(req.user.id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Access denied: you can only change status of your own events" });
        }

        if (existingEvent.status === "CANCELLED" && status !== "CANCELLED") {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Cancelled events cannot be reactivated" });
        }

        const updateRes = await client.query(
            "UPDATE events SET status = $1 WHERE id = $2 RETURNING *",
            [status, eventId]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: `Event status updated to ${status}`,
            event: updateRes.rows[0]
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.error("Update status error:", error);
        res.status(500).json({ error: "Failed to update event status" });
    } finally {
        client.release();
    }
});

// View attendee roster for an event (Protected: event owner or ADMIN only)
app.get("/api/events/:id/attendees", authenticateToken, requireRole("ORGANIZER", "ADMIN"), async (req, res) => {
    try {
        const eventId = parsePositiveInt(req.params.id);
        if (!eventId) {
            return res.status(400).json({ error: "Valid positive integer event ID is required" });
        }

        // Verify event and ownership
        const eventRes = await pool.query(
            "SELECT id, title, organizer_id FROM events WHERE id = $1",
            [eventId]
        );

        if (eventRes.rows.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        const event = eventRes.rows[0];

        if (req.user.role !== "ADMIN" && String(event.organizer_id) !== String(req.user.id)) {
            return res.status(403).json({ error: "Access denied: you can only view attendees for your own events" });
        }

        const attendeesRes = await pool.query(
            `
            SELECT
                r.id AS reservation_id,
                r.status AS reservation_status,
                r.booked_at,
                r.cancelled_at,
                es.seat_number,
                u.id AS student_id,
                u.name AS student_name,
                u.email AS student_email
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            JOIN event_seats es ON r.seat_id = es.id
            WHERE r.event_id = $1
            ORDER BY es.id ASC, r.booked_at DESC
            `,
            [eventId]
        );

        res.status(200).json({
            event_id: event.id,
            event_title: event.title,
            count: attendeesRes.rows.length,
            attendees: attendeesRes.rows
        });

    } catch (error) {
        console.error("Attendee roster error:", error);
        res.status(500).json({ error: "Failed to fetch event attendees" });
    }
});

// =========================================================
// ADMIN MANAGEMENT ENDPOINTS
// =========================================================

// System Overview KPIs
app.get("/api/admin/stats", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    try {
        const userStats = await pool.query(`
            SELECT
                COUNT(*)::int AS total_users,
                COUNT(CASE WHEN role = 'STUDENT' THEN 1 END)::int AS total_students,
                COUNT(CASE WHEN role = 'ORGANIZER' THEN 1 END)::int AS total_organizers,
                COUNT(CASE WHEN role = 'ADMIN' THEN 1 END)::int AS total_admins
            FROM users;
        `);

        const eventStats = await pool.query(`
            SELECT
                COUNT(*)::int AS total_events,
                COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END)::int AS published_events,
                COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int AS draft_events,
                COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int AS cancelled_events
            FROM events;
        `);

        const venueStats = await pool.query(`
            SELECT COUNT(*)::int AS total_venues, COALESCE(SUM(capacity), 0)::int AS total_venue_capacity FROM venues;
        `);

        const reservationStats = await pool.query(`
            SELECT
                COUNT(*)::int AS total_reservations,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int AS active_reservations,
                COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int AS cancelled_reservations
            FROM reservations;
        `);

        const seatStats = await pool.query(`
            SELECT
                COUNT(*)::int AS total_seats,
                COUNT(CASE WHEN status = 'BOOKED' THEN 1 END)::int AS booked_seats,
                COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END)::int AS available_seats
            FROM event_seats;
        `);

        const totalSeats = seatStats.rows[0].total_seats;
        const bookedSeats = seatStats.rows[0].booked_seats;
        const overallOccupancy = totalSeats > 0 ? Number(((bookedSeats / totalSeats) * 100).toFixed(1)) : 0;

        res.status(200).json({
            users: userStats.rows[0],
            events: eventStats.rows[0],
            venues: venueStats.rows[0],
            reservations: reservationStats.rows[0],
            seats: {
                ...seatStats.rows[0],
                overall_occupancy_percent: overallOccupancy
            }
        });

    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ error: "Failed to fetch admin system statistics" });
    }
});

// Manage users: list all users with booking and event metrics
app.get("/api/admin/users", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    try {
        const query = `
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.created_at,
                COUNT(DISTINCT r.id)::int AS reservations_count,
                COUNT(DISTINCT e.id)::int AS events_count
            FROM users u
            LEFT JOIN reservations r ON u.id = r.user_id
            LEFT JOIN events e ON u.id = e.organizer_id
            GROUP BY u.id, u.name, u.email, u.role, u.created_at
            ORDER BY u.id ASC;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Admin users list error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Update user role (Strictly validated + Last Admin Race Condition Protected)
app.patch("/api/admin/users/:id/role", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    const targetUserId = parsePositiveInt(req.params.id);
    if (!targetUserId) {
        return res.status(400).json({ error: "Valid positive integer user ID is required" });
    }

    const client = await pool.connect();

    try {
        const { role: newRole } = req.body;
        const VALID_ROLES = ["STUDENT", "ORGANIZER", "ADMIN"];

        if (!newRole || !VALID_ROLES.includes(newRole)) {
            return res.status(400).json({
                error: "Invalid role. Role must be STUDENT, ORGANIZER, or ADMIN."
            });
        }

        await client.query("BEGIN");

        // 1. Lock target user row FOR UPDATE
        const targetRes = await client.query(
            "SELECT id, name, email, role FROM users WHERE id = $1 FOR UPDATE",
            [targetUserId]
        );

        if (targetRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Target user not found" });
        }

        const targetUser = targetRes.rows[0];

        // 2. If attempting to demote an ADMIN to non-ADMIN, serialize and guard last admin
        if (targetUser.role === "ADMIN" && newRole !== "ADMIN") {
            // Lock all admin rows FOR UPDATE to eliminate concurrent demotion race conditions
            const adminRows = await client.query(
                "SELECT id FROM users WHERE role = 'ADMIN' FOR UPDATE"
            );

            if (adminRows.rows.length <= 1) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "Cannot demote the last remaining administrator in the system."
                });
            }
        }

        // 3. Update the user role
        const updateRes = await client.query(
            `
            UPDATE users
            SET role = $1
            WHERE id = $2
            RETURNING id, name, email, role, created_at
            `,
            [newRole, targetUserId]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: `User role updated to ${newRole}`,
            user: updateRes.rows[0]
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.error("Update role error:", error);
        res.status(500).json({ error: "Failed to update user role" });
    } finally {
        client.release();
    }
});

// Admin view all events across campus
app.get("/api/admin/events", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    try {
        const query = `
            SELECT
                e.id,
                e.title,
                e.description,
                e.event_date,
                e.start_time,
                e.end_time,
                e.venue_id,
                v.name AS venue_name,
                v.location AS venue_location,
                v.capacity AS venue_capacity,
                e.organizer_id,
                u.name AS organizer_name,
                u.email AS organizer_email,
                e.status,
                e.created_at,
                COUNT(DISTINCT es.id)::int AS total_seats,
                COUNT(DISTINCT CASE WHEN es.status = 'BOOKED' THEN es.id END)::int AS booked_seats
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            JOIN users u ON e.organizer_id = u.id
            LEFT JOIN event_seats es ON e.id = es.event_id
            GROUP BY e.id, e.title, e.description, e.event_date, e.start_time, e.end_time, e.venue_id, v.name, v.location, v.capacity, e.organizer_id, u.name, u.email, e.status, e.created_at
            ORDER BY e.id DESC;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Admin events error:", error);
        res.status(500).json({ error: "Failed to fetch all events" });
    }
});

// Admin Venue Management: Create Venue
app.post("/api/venues", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    try {
        const { name, location, capacity } = req.body;

        if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150) {
            return res.status(400).json({ error: "Venue name must be between 2 and 150 characters" });
        }
        if (!location || typeof location !== "string" || location.trim().length < 2 || location.trim().length > 255) {
            return res.status(400).json({ error: "Venue location must be between 2 and 255 characters" });
        }

        const capNum = Number(capacity);
        if (!Number.isInteger(capNum) || capNum <= 0) {
            return res.status(400).json({ error: "Capacity must be a positive integer" });
        }

        const result = await pool.query(
            `
            INSERT INTO venues (name, location, capacity)
            VALUES ($1, $2, $3)
            RETURNING id, name, location, capacity, created_at
            `,
            [name.trim(), location.trim(), capNum]
        );

        res.status(201).json({
            message: "Venue created successfully",
            venue: result.rows[0]
        });

    } catch (error) {
        console.error("Create venue error:", error);
        res.status(500).json({ error: "Failed to create venue" });
    }
});

// Admin Venue Management: Update Venue (with Capacity vs Existing Events Integrity Guard)
app.put("/api/venues/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    const venueId = parsePositiveInt(req.params.id);
    if (!venueId) {
        return res.status(400).json({ error: "Valid positive integer venue ID is required" });
    }

    const client = await pool.connect();

    try {
        const { name, location, capacity } = req.body;

        await client.query("BEGIN");

        const venueRes = await client.query(
            "SELECT * FROM venues WHERE id = $1 FOR UPDATE",
            [venueId]
        );

        if (venueRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Venue not found" });
        }

        const existingVenue = venueRes.rows[0];

        const updatedName = name !== undefined ? name.trim() : existingVenue.name;
        const updatedLoc = location !== undefined ? location.trim() : existingVenue.location;
        const updatedCap = capacity !== undefined ? Number(capacity) : existingVenue.capacity;

        if (!Number.isInteger(updatedCap) || updatedCap <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Capacity must be a positive integer" });
        }

        // Verify capacity is not reduced below configured seats of existing events at this venue
        const eventSeatsMaxRes = await client.query(
            `
            SELECT COALESCE(MAX(seat_count), 0)::int AS max_seats
            FROM (
                SELECT COUNT(es.id) AS seat_count
                FROM events e
                JOIN event_seats es ON e.id = es.event_id
                WHERE e.venue_id = $1
                GROUP BY e.id
            ) sub
            `,
            [venueId]
        );

        const maxConfiguredSeats = eventSeatsMaxRes.rows[0].max_seats;
        if (updatedCap < maxConfiguredSeats) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                error: `Cannot reduce venue capacity to ${updatedCap}: Existing event at this venue has ${maxConfiguredSeats} seats configured`
            });
        }

        const updateRes = await client.query(
            `
            UPDATE venues
            SET name = $1, location = $2, capacity = $3
            WHERE id = $4
            RETURNING id, name, location, capacity, created_at
            `,
            [updatedName, updatedLoc, updatedCap, venueId]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Venue updated successfully",
            venue: updateRes.rows[0]
        });

    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
        console.error("Update venue error:", error);
        res.status(500).json({ error: "Failed to update venue" });
    } finally {
        client.release();
    }
});

// Admin Venue Management: Safe Delete Venue (Enforces Referential Integrity)
app.delete("/api/venues/:id", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    const venueId = parsePositiveInt(req.params.id);
    if (!venueId) {
        return res.status(400).json({ error: "Valid positive integer venue ID is required" });
    }

    try {
        // Check if any events reference this venue
        const refRes = await pool.query(
            "SELECT COUNT(*)::int AS count FROM events WHERE venue_id = $1",
            [venueId]
        );

        const eventCount = refRes.rows[0].count;
        if (eventCount > 0) {
            return res.status(409).json({
                error: `Cannot delete venue: it is currently referenced by ${eventCount} event(s). Please reassign or cancel those events first.`
            });
        }

        const deleteRes = await pool.query(
            "DELETE FROM venues WHERE id = $1 RETURNING id, name",
            [venueId]
        );

        if (deleteRes.rows.length === 0) {
            return res.status(404).json({ error: "Venue not found" });
        }

        res.status(200).json({
            message: `Venue '${deleteRes.rows[0].name}' deleted successfully`,
            id: Number(venueId)
        });

    } catch (error) {
        console.error("Delete venue error:", error);
        res.status(500).json({ error: "Failed to delete venue" });
    }
});

// Global Error Handling Middleware: handles JSON syntax errors and unhandled server exceptions
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            error: "Malformed JSON payload in request body"
        });
    }
    console.error("Unhandled server error:", err);
    res.status(500).json({
        error: "Internal server error"
    });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
