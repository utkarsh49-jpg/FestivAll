# FestivAll – Security, Concurrency & Code Audit Report

**Project**: FestivAll – Campus Event & Auditorium Booking System  
**Auditor**: Senior Full-Stack Engineer, Security Auditor & Software Architect  
**Date**: November 2026  
**Status**: All Confirmed Vulnerabilities and Deficiencies Successfully Corrected & Verified  

---

## 1. Project Architecture Inspected

The FestivAll system is a high-concurrency, three-tier enterprise web application designed for campus festival event discovery and auditorium seat reservations:

1. **Frontend Tier (`frontend/`)**:
   - Single-Page Application (SPA) built with React 18.3, TypeScript 5.7, Tailwind CSS 3.4, and Vite 6.1.
   - Provides role-aware user interfaces for **Students** (event browsing, interactive auditorium visualizer, personal ticket management), **Organizers** (event creation, capacity adjustment, attendee rosters, analytics), and **Admins** (system KPI telemetry, venue management, user role promotion/demotion).
   - Centralized HTTP client (`frontend/src/services/api.ts`) managing automatic Bearer JWT header injection and response status handling.

2. **Backend API Tier (`backend/`)**:
   - REST API built with Node.js and Express 5 (`backend/server.js`).
   - Stateful database interaction through `pg` (Node-Postgres Connection Pool) utilizing row-level database transactions (`BEGIN`, `COMMIT`, `ROLLBACK`).
   - Authentication via JSON Web Tokens (`jsonwebtoken`) signed with a dedicated secret key, with 24-hour expiration.
   - Password hashing and verification via `bcryptjs` using 10 salt rounds.
   - Role-Based Access Control (RBAC) enforcing three user tiers: `STUDENT`, `ORGANIZER`, and `ADMIN`.

3. **Database Tier (`database/`)**:
   - PostgreSQL relational database in Third Normal Form (3NF).
   - 6 relational tables: `users`, `venues`, `events`, `event_seats`, `reservations`, and `booking_history`.
   - Concurrency safeguards: Row-level lock (`SELECT ... FOR UPDATE`), atomic transactions, foreign keys with referential constraints, and a partial unique index (`reservations_one_active_seat`) on `(event_id, seat_id) WHERE status = 'ACTIVE'`.

---

## 2. Total Flaws Identified & Severity Breakdown

During the rigorous line-by-line inspection, static analysis, and automated test probes, **10 genuine flaws and vulnerabilities** were identified across security, concurrency, input validation, and database integrity.

| Severity | Count | Summary |
| :--- | :---: | :--- |
| **Critical** | 1 | Concurrency Layer 2 Unique Index Violation returned HTTP 500 instead of HTTP 409 Conflict |
| **High** | 3 | Parameter & ID type validation missing across route handlers causing unhandled PostgreSQL 500s; Body validation missing in `POST /api/reservations` with premature connection acquisition; Automated concurrency test `concurrency_test.mjs` was broken (unauthenticated & only 2 requests) |
| **Medium** | 4 | Unhandled `ROLLBACK` rejections during transaction errors; Missing global Express error handler & malformed JSON vulnerability; Fragile seat number string cast in capacity reduction; Missing foreign key performance indexes & composite FK constraint |
| **Low** | 2 | Type safety gaps in `POST /api/auth/login`; Missing seat number join in student pass queries |
| **Total** | **10** | **All 10 confirmed flaws diagnosed, safely patched, and regression verified.** |

---

## 3. Detailed Severity Findings & Remediation

### Finding 1: Concurrency Layer 2 Unique Constraint Violation Returned HTTP 500
- **Severity**: **CRITICAL**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) (in `POST /api/reservations` error handler)
- **Problem**: The system implements two-layer concurrency defense: Layer 1 is `SELECT FOR UPDATE` on `event_seats`, and Layer 2 is the partial unique index `reservations_one_active_seat` on `reservations(event_id, seat_id) WHERE status = 'ACTIVE'`. If extreme contention or a database race condition tripped Layer 2, PostgreSQL threw error code `23505` (`unique_violation`). The catch block caught this error and sent `res.status(500).json({ error: "Failed to book seat" })`.
- **Impact**: Competing clients in a high-concurrency ticket rush received HTTP 500 Internal Server Error (interpreted by clients as a server crash) instead of HTTP 409 Conflict.
- **Correction Applied**: Updated catch block in `POST /api/reservations` to check `if (error.code === '23505')` and return `res.status(409).json({ error: "Seat is already booked (reservation conflict)" })`.

### Finding 2: Missing Positive Integer Validation on Route Parameters Causing PostgreSQL 500s
- **Severity**: **HIGH**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) across all parameterized endpoints:
  - `GET /api/events/:eventId/seats`
  - `GET /api/reservations/:id`
  - `DELETE /api/reservations/:id`
  - `PUT /api/events/:id`
  - `PATCH /api/events/:id/status`
  - `GET /api/events/:id/attendees`
  - `PATCH /api/admin/users/:id/role`
  - `PUT /api/venues/:id`
  - `DELETE /api/venues/:id`
  - `GET /api/reservations?user_id=...`
- **Problem**: Route parameters were directly passed to PostgreSQL SQL queries without numeric validation. When invalid strings (e.g. `abc`, `-1`, `null`, SQL injection tokens) were provided, PostgreSQL aborted with: `invalid input syntax for type bigint: "abc"`, causing an unhandled error returning HTTP 500.
- **Impact**: External clients could provoke internal 500 error logs with malformed inputs, violating RESTful standards where client input errors must return HTTP 400 Bad Request.
- **Correction Applied**: Implemented a centralized validation helper `parsePositiveInt(val)` that strictly validates positive integers (`^[1-9]\d*$`). Each route parameter is validated upfront, immediately returning HTTP 400 Bad Request if invalid.

### Finding 3: Missing Request Body Type Validation and Premature Connection Acquisition in `POST /api/reservations`
- **Severity**: **HIGH**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) (lines 324–337)
- **Problem**: `const client = await pool.connect()` was called *before* validating `event_id` and `seat_id`. Furthermore, the code only checked `if (!event_id || !seat_id)`. If non-numeric strings were passed (e.g., `{ event_id: "abc", seat_id: "xyz" }`), `client.query` failed with a PostgreSQL syntax cast error, holding a pool connection open until error processing completed.
- **Impact**: Attackers sending malformed booking requests could exhaust the database connection pool (connection starvation) while triggering 500 errors.
- **Correction Applied**: Validated both `event_id` and `seat_id` using `parsePositiveInt` *prior* to requesting a client connection from `pool.connect()`. Returns HTTP 400 immediately on invalid types.

### Finding 4: Existing Concurrency Test Script Was Broken and Inadequate
- **Severity**: **HIGH**
- **File & Location**: [`frontend/concurrency_test.mjs`](file:///c:/campus-event-booking/frontend/concurrency_test.mjs)
- **Problem**: The original script sent booking requests without the `Authorization: Bearer <token>` header (sending `user_id` in the body), causing immediate HTTP 401 Unauthorized failures. Furthermore, it only dispatched 2 concurrent requests, failing the university audit specification requiring at least 10 concurrent requests.
- **Impact**: The test suite could not run or prove concurrency safety.
- **Correction Applied**: Completely rewritten as a comprehensive 10-way concurrency audit suite. Fetches 10 real registered student credentials, signs dedicated Bearer JWTs, fires 10 simultaneous booking requests using `Promise.all`, verifies 1x 201 Created and 9x 409 Conflict, validates 6 database invariants, tests RBAC unauthorized cancellation rejection (403), verifies authorized cancellation (200), and validates seat re-booking.

### Finding 5: Unhandled `ROLLBACK` Rejections During Transaction Failures
- **Severity**: **MEDIUM**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) (`POST /api/reservations`, `POST /api/events`, `PUT /api/events/:id`, `PATCH /api/events/:id/status`, `PATCH /api/admin/users/:id/role`, `PUT /api/venues/:id`)
- **Problem**: `await client.query("ROLLBACK")` was called in `catch` blocks without an inner `try/catch`. If the failure occurred prior to `BEGIN` or if the client connection was interrupted, calling `ROLLBACK` threw a secondary unhandled promise rejection, which crashed Express or prevented proper error delivery.
- **Impact**: Potential connection leaks and unhandled Node.js process warnings.
- **Correction Applied**: Wrapped all `await client.query("ROLLBACK")` calls in `try { ... } catch (rollbackError) { ... }`, ensuring reliable connection release in the `finally` block under all failure modes.

### Finding 6: Missing Global Express Error Handler and Malformed JSON Vulnerability
- **Severity**: **MEDIUM**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) (bottom of server pipeline)
- **Problem**: No global error middleware `(err, req, res, next)` was installed. If a client sent a malformed JSON payload (e.g. `{ "email": `), Express's body parser threw a `SyntaxError` that fell through to default HTML error pages containing server stack information.
- **Impact**: Leaked stack traces and HTML error bodies to API consumers.
- **Correction Applied**: Added a global error middleware that catches `SyntaxError` with status 400 and responds with clean, structured JSON `{ error: "Malformed JSON payload in request body" }`, and catches any unhandled exceptions with a safe 500 response.

### Finding 7: Fragile Seat Number Substring Cast in `PUT /api/events/:id`
- **Severity**: **MEDIUM**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) (line 968)
- **Problem**: The query `DELETE FROM event_seats WHERE ... AND substring(seat_number from 2)::int > $2` assumed all seats follow the exact regex `^S[0-9]+$`. If any seat was labeled with non-digits (e.g., `VIP1`, `BALCONY`), the `::int` cast aborted the query with a PostgreSQL exception.
- **Impact**: Event updates on auditoriums with custom seat labels would crash with HTTP 500.
- **Correction Applied**: Added `AND seat_number ~ '^S[0-9]+$'` to the SQL query condition, ensuring only standard seat labels are cast to integer.

### Finding 8: Missing Foreign Key Indexes and Database Composite Constraints
- **Severity**: **MEDIUM**
- **File & Location**: [`database/schema.sql`](file:///c:/campus-event-booking/database/schema.sql)
- **Problem**:
  1. PostgreSQL does not automatically create indexes on foreign key columns. Tables had no indexes on `reservations(user_id)`, `reservations(seat_id)`, `events(venue_id)`, `events(organizer_id)`, or `booking_history(reservation_id)`, causing sequential table scans during frequent lookups.
  2. The `reservations` table had separate FKs for `event_id` and `seat_id`, allowing a theoretical direct SQL insert where a reservation's `seat_id` belonged to a different `event_id`.
- **Impact**: Performance degradation under high query volume and potential relational mismatch at the database tier.
- **Correction Applied**:
  - Added 5 B-tree indexes: `idx_reservations_user_id`, `idx_reservations_seat_id`, `idx_events_venue_id`, `idx_events_organizer_id`, `idx_booking_history_reservation_id`.
  - Added composite unique constraint `event_seats(id, event_id)` and composite foreign key `reservations(seat_id, event_id) REFERENCES event_seats(id, event_id)` to database and schema.

### Finding 9: Type Safety in `POST /api/auth/login`
- **Severity**: **LOW**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js) (line 164)
- **Problem**: `POST /api/auth/login` checked `if (!email || !password)` without checking `typeof email === "string"`. Submitting a numeric or boolean email caused `email.trim()` to throw a TypeError.
- **Impact**: Malformed login payload provoked an unhandled 500 error instead of a 400 Bad Request.
- **Correction Applied**: Added `typeof email !== "string" || typeof password !== "string"` validation returning HTTP 400.

### Finding 10: Missing Seat Number in Student Reservation View
- **Severity**: **LOW**
- **File & Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js), [`frontend/src/types/index.ts`](file:///c:/campus-event-booking/frontend/src/types/index.ts), [`frontend/src/components/reservations/ReservationCard.tsx`](file:///c:/campus-event-booking/frontend/src/components/reservations/ReservationCard.tsx)
- **Problem**: `GET /api/reservations` did not join `event_seats` to include `seat_number`. Consequently, the frontend displayed the fallback label `Seat ID 1702` rather than the human-readable physical seat identifier (`S2`).
- **Correction Applied**: Updated backend query with `LEFT JOIN event_seats es ON r.seat_id = es.id` including `es.seat_number`, updated TypeScript interface `Reservation`, and updated UI component to render `reservation.seat_number`.

---

## 4. Exact Files Modified

1. [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js):
   - Added `parsePositiveInt` helper function.
   - Enforced input validation across all parameterized route handlers (`GET /api/events/:eventId/seats`, `GET /api/reservations/:id`, `DELETE /api/reservations/:id`, `PUT /api/events/:id`, `PATCH /api/events/:id/status`, `GET /api/events/:id/attendees`, `PATCH /api/admin/users/:id/role`, `PUT /api/venues/:id`, `DELETE /api/venues/:id`, `GET /api/reservations?user_id=...`).
   - Validated `event_id` and `seat_id` in `POST /api/reservations` before connection acquisition.
   - Handled error code `23505` in `POST /api/reservations` returning HTTP 409 Conflict.
   - Enclosed all transaction `ROLLBACK` calls in try/catch blocks.
   - Enriched `GET /api/reservations` with `es.seat_number` via `LEFT JOIN`.
   - Added regex safeguard `seat_number ~ '^S[0-9]+$'` in `PUT /api/events/:id`.
   - Added global error handling middleware for malformed JSON and unexpected server exceptions.

2. [`database/schema.sql`](file:///c:/campus-event-booking/database/schema.sql):
   - Added `CONSTRAINT event_seats_id_event_unique UNIQUE (id, event_id)`.
   - Added `CONSTRAINT reservations_seat_event_fk FOREIGN KEY (seat_id, event_id) REFERENCES event_seats(id, event_id)`.
   - Added indexes: `idx_reservations_user_id`, `idx_reservations_seat_id`, `idx_events_venue_id`, `idx_events_organizer_id`, `idx_booking_history_reservation_id`.

3. [`frontend/concurrency_test.mjs`](file:///c:/campus-event-booking/frontend/concurrency_test.mjs):
   - Rewrote into a 10-way automated concurrency verification suite executing real JWT-authenticated parallel requests, validating row locking, checking database invariants, testing cancellation RBAC, and confirming seat recovery.

4. [`backend/test_all_features.mjs`](file:///c:/campus-event-booking/backend/test_all_features.mjs):
   - Expanded test coverage from 33 to 39 automated checks, incorporating tests for ID parameter validation, body type safety, and global JSON error middleware.

5. [`frontend/src/types/index.ts`](file:///c:/campus-event-booking/frontend/src/types/index.ts):
   - Extended `Reservation` interface to include optional `seat_number?: string`.

6. [`frontend/src/components/reservations/ReservationCard.tsx`](file:///c:/campus-event-booking/frontend/src/components/reservations/ReservationCard.tsx):
   - Updated assigned seat rendering to prioritize `reservation.seat_number`.

---

## 5. Concurrency Test Methodology & Actual Results

### Test Architecture
- **Target**: Event ID 35 ("Coding Competition #35"), Seat ID 1702 ("S2").
- **Concurrency Mechanism**: Node.js `Promise.all` initiating 10 simultaneous asynchronous HTTP POST requests over keep-alive HTTP/1.1 connections.
- **Authentication**: 10 distinct student accounts (`user11@campus.edu` through `user20@campus.edu`), each authenticated with a unique cryptographic JWT Bearer token signed using `JWT_SECRET`.
- **Database Engine Execution**: Each request is processed in PostgreSQL within a transaction (`BEGIN`). The query `SELECT id, event_id, seat_number, status FROM event_seats WHERE id = $1 AND event_id = $2 FOR UPDATE` places an exclusive row-level lock on seat 1702. The first thread to acquire the lock observes `status = 'AVAILABLE'`, inserts a row in `reservations`, updates `event_seats.status = 'BOOKED'`, inserts into `booking_history`, and calls `COMMIT`. The 9 competing threads wait on the row lock; when unblocked, they re-read the committed row state, observe `status = 'BOOKED'`, issue `ROLLBACK`, and receive HTTP 409 Conflict.

### Execution Log & Verified Results
```
======================================================================
  CAMPUS EVENT BOOKING: 10-WAY CONCURRENCY & INTEGRITY AUDIT
======================================================================

--- Step 1: Loading 10 Distinct Registered Students ---
Loaded 10 student users:
  [Student 1] ID: #11 | Email: user11@campus.edu
  [Student 2] ID: #12 | Email: user12@campus.edu
  ...
  [Student 10] ID: #20 | Email: user20@campus.edu

--- Step 2: Pre-check & Clean Seat State ---
✅ Target Seat Verified: Number: "S2", Status: "AVAILABLE"

--- Step 3: Firing 10 Simultaneous Booking Requests (Promise.all) ---
Target: Event #35, Seat #1702
All 10 requests completed in 357ms.

Response Breakdown:
  - HTTP 201 Created (Won the seat):     1
  - HTTP 409 Conflict (Safely rejected): 9
  - Unexpected Responses:               0

✅ Concurrency Winner: Student ID #11 | Reservation ID #2035

--- Step 4: Database Consistency & Invariant Verification ---
✅ Invariant 1: Exactly 1 active reservation in reservations table (ID #2035)
✅ Invariant 2: Seat #1702 status in event_seats is strictly "BOOKED"
✅ Invariant 3: Audit trail recorded in booking_history (Performed by Student #11)

--- Step 5: Unauthorized Cancellation Protection ---
✅ Unauthorized cancellation blocked with HTTP 403 Forbidden.

--- Step 6: Authorized Cancellation & Seat Restoration ---
✅ Winning reservation #2035 cancelled successfully
✅ Invariant 4: Reservation status updated to "CANCELLED" with timestamp
✅ Invariant 5: Seat #1702 status restored to "AVAILABLE" in event_seats
✅ Invariant 6: Cancellation recorded in booking_history

--- Step 7: Verify Re-booking Restored Seat ---
✅ Seat successfully re-booked after cancellation by Student #12 (Reservation #2036)
✅ Cleaned up re-booking #2036. Seat is now free.

======================================================================
  CONCURRENCY & INTEGRITY AUDIT: ALL 7 TEST PHASES PASSED! 🚀
======================================================================
```

---

## 6. Full Regression Test Results

All regression and feature verification suites were executed against the patched system:

| Test Suite | Purpose | Execution Result |
| :--- | :--- | :---: |
| `backend/test_all_features.mjs` | Feature suite: RBAC, ownership, capacity, venues, analytics, input validation, error handling | **39 PASSED / 0 FAILED** |
| `frontend/backend_auth_test.mjs` | Auth suite: registration, duplicate email, bcrypt login, token injection, spoofing, ownership | **14 PASSED / 0 FAILED** |
| `frontend/test_analytics_and_postman.mjs` | Schema & SQL Aggregations: Postman v2.1.0 collection check, mathematical invariants | **8 PASSED / 0 FAILED** |
| `frontend/concurrency_test.mjs` | 10-way parallel booking contention, database invariants, cancellation & re-booking lifecycle | **7 PHASES PASSED / 0 FAILED** |
| Frontend TypeScript & Vite Build | Full production compilation: TypeScript type checking (`tsc -b`) and asset bundling (`vite build`) | **1967 modules transformed, 0 errors** |

---

## 7. Remaining Known Issues & Limitations

1. **Seeded User Account Passwords**: Seeded demo accounts in `seed.js` use the placeholder string `"seeded_password_hash"`. By design (Safeguard 6), `server.js` prohibits logging in with placeholder passwords. Users must register dedicated accounts or use the dedicated demo accounts (`demo_organizer@campus.edu`, `demo_admin@campus.edu`).
2. **WebSocket Real-Time Updates**: Seat status in the auditorium visualizer updates on initial load and refreshes upon user selection or periodic polling. For massive traffic spikes, a future version could integrate WebSockets (Socket.io) or Server-Sent Events (SSE).
3. **Flat Grid Auditorium Mapping**: The visualizer organizes seats into rows of 10 (`Row A`, `Row B`, ...). Complex architectural venue configurations (such as multi-tiered balcony elevations) are currently represented as single flat grids.

---

## 8. Recommendations for Future Improvements

1. **Rate Limiting Middleware**: Introduce `express-rate-limit` on public authentication endpoints (`/api/auth/login`, `/api/auth/register`) to protect against brute-force password guessing.
2. **Security HTTP Headers (Helmet)**: Incorporate `helmet` to set Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security` (HSTS).
3. **Database Migration Manager**: Implement a database migration tool (such as `db-migrate` or Prisma migrations) to version-control schema upgrades rather than manual DDL scripts.
4. **Refresh Token Flow**: Introduce short-lived access tokens (15 minutes) paired with HTTP-only refresh tokens in secure cookies to reduce the exposure window of lost Bearer tokens.

---

## 9. Viva Voce & Technical Defense Guide

This section is prepared specifically to help you defend your architecture and explain every technical component with confidence during your university viva voce examination.

### Question 1: Where and how is authentication middleware implemented?
**Code Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js), lines 32–51:
```javascript
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token" });
        }
        req.user = user;
        next();
    });
}
```
**Explanation for Professor**:  
"The authentication middleware `authenticateToken` intercepts incoming HTTP requests on protected endpoints. It inspects the `Authorization` request header for a Bearer token (`Bearer <JWT>`). If no token is provided, it halts execution immediately with HTTP 401 Unauthorized. If present, it verifies the cryptographic signature against `JWT_SECRET` using `jwt.verify()`. If the signature is invalid or expired, it returns HTTP 403 Forbidden. Once successfully verified, the decoded user payload (`{ id, email, role }`) is attached to `req.user`, allowing downstream route handlers to access authenticated user context without trusting request bodies."

---

### Question 2: Where and how is authorization (RBAC) implemented?
**Code Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js), lines 54–63:
```javascript
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
```
**Explanation for Professor**:  
"`requireRole` is a higher-order middleware factory that enforces Role-Based Access Control (RBAC). It accepts an array of permitted roles (e.g. `requireRole("ORGANIZER", "ADMIN")`). Because it executes *after* `authenticateToken`, `req.user` is guaranteed to be authentic. The middleware checks if `roles.includes(req.user.role)`. If a student attempts to invoke an admin endpoint (`/api/admin/stats`) or an organizer endpoint (`/api/events`), the middleware rejects the request with HTTP 403 Forbidden. Authorization is strictly enforced in backend middleware, never relying solely on frontend UI visibility."

---

### Question 3: How does JWT authentication work?
**Explanation for Professor**:  
"A JSON Web Token consists of three base64url-encoded parts separated by periods: **Header** (algorithm `HS256` and token type), **Payload** (claims: user ID, email, role, and expiration timestamp `exp`), and **Signature** (`HMACSHA256(header + payload, secret)`).  
Upon successful login (`POST /api/auth/login`), the server generates the token using `jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '24h' })` and returns it to the client. The client stores it in `localStorage` and transmits it in the `Authorization: Bearer <token>` header on subsequent requests. Because the signature depends on `JWT_SECRET`, any client-side tampering of the payload (such as altering the role to `ADMIN`) invalidates the cryptographic signature, causing `jwt.verify` to immediately reject the token."

---

### Question 4: How does bcrypt protect passwords?
**Explanation for Professor**:  
"Passwords are never stored in plaintext. In `POST /api/auth/register`, we use `bcrypt.genSalt(10)` followed by `bcrypt.hash(password, salt)`. Bcrypt is an adaptive key derivation function based on the Blowfish cipher. It incorporates two critical defenses:
1. **Cryptographic Salt**: A unique 16-byte random salt is generated for each password and embedded into the final hash string. This renders precomputed rainbow table attacks impossible.
2. **Work Factor (Cost Parameter)**: We use a cost factor of 10 ($2^{10} = 1024$ key expansion rounds), making brute-force dictionary attacks computationally expensive.
During login (`POST /api/auth/login`), `bcrypt.compare(password, user.password_hash)` extracts the salt from the stored hash, applies the exact same hashing algorithm to the candidate password, and performs a constant-time comparison to prevent timing attacks."

---

### Question 5: How do PostgreSQL transactions work?
**Explanation for Professor**:  
"A PostgreSQL transaction groups multiple SQL operations into a single atomic unit satisfying the ACID properties (Atomicity, Consistency, Isolation, Durability):
- `BEGIN`: Initiates a new transaction on a dedicated pooled client connection.
- `COMMIT`: Atomically writes all modifications (`INSERT INTO reservations`, `UPDATE event_seats`, `INSERT INTO booking_history`) to the Write-Ahead Log (WAL) and disk.
- `ROLLBACK`: If any error, constraint failure, or validation check occurs, `ROLLBACK` reverts all interim changes, leaving the database exactly as it was before `BEGIN`.
In our booking flow, the transaction guarantees that an active reservation is never created without simultaneously marking the seat as `BOOKED` and recording the audit history."

---

### Question 6: How does SELECT FOR UPDATE prevent conflicting seat bookings?
**Code Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js), lines 365–375:
```javascript
const seatResult = await client.query(
    `
    SELECT id, event_id, seat_number, status
    FROM event_seats
    WHERE id = $1 AND event_id = $2
    FOR UPDATE
    `,
    [seat_id, event_id]
);
```
**Explanation for Professor**:  
"`SELECT ... FOR UPDATE` acquires an exclusive row-level lock on the target seat record in the `event_seats` table.  
When two or more requests arrive at the exact same millisecond:
1. The first transaction to reach `SELECT ... FOR UPDATE` acquires the row lock. It inspects `seat.status`, sees `'AVAILABLE'`, proceeds to create the reservation, updates `event_seats.status = 'BOOKED'`, and commits.
2. The competing transactions are blocked by PostgreSQL at the database engine level and wait for the row lock to be released.
3. Once Transaction 1 commits, the lock is released. Transaction 2 unblocks and reads the updated, committed state of that exact row.
4. Transaction 2 sees `seat.status === 'BOOKED'`. The condition `if (seat.status === 'BOOKED')` evaluates to true, triggering `ROLLBACK` and returning HTTP 409 Conflict.
This eliminates the classical 'Check-Then-Act' (TOCTOU: Time-of-Check to Time-of-Use) race condition."

---

### Question 7: How does the partial unique index prevent duplicate active bookings?
**Database Definition**: [`database/schema.sql`](file:///c:/campus-event-booking/database/schema.sql), lines 122–124:
```sql
CREATE UNIQUE INDEX reservations_one_active_seat
ON reservations (event_id, seat_id)
WHERE status = 'ACTIVE';
```
**Explanation for Professor**:  
"The partial unique index acts as Defense-in-Depth Layer 2 directly within the PostgreSQL storage engine. A standard unique index on `(event_id, seat_id)` would prevent a user from booking a seat that was previously cancelled. By appending the predicate `WHERE status = 'ACTIVE'`, PostgreSQL only enforces uniqueness among rows where `status = 'ACTIVE'`.  
If an active reservation already exists for Event 35 and Seat 1702, any attempt to insert a second row with `status = 'ACTIVE'` violates the partial unique index, triggering PostgreSQL error code `23505` (`unique_violation`). However, when a reservation is cancelled (`status = 'CANCELLED'`), it drops out of the index predicate, immediately allowing a new active reservation to be created for that seat."

---

### Question 8: How does cancellation work?
**Code Location**: [`backend/server.js`](file:///c:/campus-event-booking/backend/server.js), lines 560–615:
```javascript
app.delete("/api/reservations/:id", authenticateToken, async (req, res) => {
    // 1. Validate ID
    const reservationId = parsePositiveInt(req.params.id);
    // 2. Begin transaction & lock reservation row FOR UPDATE
    // 3. Authorization check: req.user.role === 'ADMIN' || reservation.user_id === req.user.id
    // 4. Update reservation: status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP
    // 5. Update event_seats: status = 'AVAILABLE' WHERE id = reservation.seat_id
    // 6. Insert audit trail: booking_history (action = 'CANCELLED', performed_by = req.user.id)
    // 7. COMMIT
});
```
**Explanation for Professor**:  
"Cancellation is a fully transactional operation (`DELETE /api/reservations/:id`).
1. **Authentication & Authorization**: The user must present a valid Bearer token. Ownership is verified by matching `req.user.id` against `reservation.user_id` (or having the `ADMIN` role). Non-owners receive HTTP 403 Forbidden.
2. **Row Locking**: The reservation row is locked using `SELECT ... FOR UPDATE` to serialize concurrent cancellation requests.
3. **Status Check**: If already cancelled, it returns HTTP 400.
4. **State Transition**: The reservation status transitions to `'CANCELLED'`, and `cancelled_at` is set to `CURRENT_TIMESTAMP` (satisfying the check constraint `reservations_cancel_time_check`).
5. **Seat Recovery**: The corresponding seat row in `event_seats` is restored to `status = 'AVAILABLE'`.
6. **Audit Trail**: An entry is appended to `booking_history` with `action = 'CANCELLED'`.
7. **Atomic Commit**: All updates commit atomically. The seat is instantly open for re-booking by any student."

---

### Question 9: How to demonstrate concurrency live to a professor?
**Step-by-Step Live Demonstration**:
1. Open PowerShell and start the backend server:
   ```powershell
   cd c:\campus-event-booking\backend
   node server.js
   ```
2. In a second PowerShell window, run the automated 10-way concurrency test suite:
   ```powershell
   cd c:\campus-event-booking
   node frontend/concurrency_test.mjs
   ```
3. **Walk your professor through the live terminal output**:
   - Point to **Step 1**: 10 distinct student accounts are loaded from PostgreSQL (`user11` to `user20`), and dedicated JWT Bearer tokens are generated.
   - Point to **Step 2**: The target seat (`Event 35`, `Seat 1702`, `S2`) is confirmed `AVAILABLE`.
   - Point to **Step 3**: Show that 10 parallel HTTP POST requests were dispatched via `Promise.all` and completed simultaneously (in ~350ms).
   - Point to the **Response Breakdown**: Show **Exactly 1 request received HTTP 201 Created** (the winner who got the ticket) and **Exactly 9 requests received HTTP 409 Conflict** (safely rejected with zero double booking).
   - Point to **Step 4**: Show the database invariants verified live in SQL: exactly 1 active reservation, seat status is `BOOKED`, and audit trail is recorded.
   - Point to **Step 5**: Show that competing students cannot cancel the winner's ticket (HTTP 403 Forbidden).
   - Point to **Step 6 & 7**: Show that the winner cancels their ticket (HTTP 200), the seat status returns to `AVAILABLE`, and a subsequent student successfully re-books the freed seat.
4. Conclude by explaining:  
   *"This proves that under true parallel concurrency, our system guarantees ACID transactional integrity, zero race conditions, zero double bookings, and complete relational consistency between memory, database locks, and storage constraints."*
