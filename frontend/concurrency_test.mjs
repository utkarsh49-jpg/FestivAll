// frontend/concurrency_test.mjs
// Automated 10-Way High-Concurrency Verification Suite for Campus Event Booking.
// Tests race conditions, row-level locking (SELECT ... FOR UPDATE), partial unique index constraints,
// and transactional consistency during simultaneous booking and cancellation.

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const jwt = require('C:/campus-event-booking/backend/node_modules/jsonwebtoken');
const { Pool } = require('C:/campus-event-booking/backend/node_modules/pg');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fest_jwt_key_2026_campus_event_booking_secure';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'campus_event_booking',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

async function runConcurrencyTest() {
  console.log('======================================================================');
  console.log('  CAMPUS EVENT BOOKING: 10-WAY CONCURRENCY & INTEGRITY AUDIT');
  console.log('======================================================================\n');

  const TARGET_EVENT_ID = 35;
  const TARGET_SEAT_ID = 1702;

  // 1. Fetch 10 distinct student accounts from database
  console.log('--- Step 1: Loading 10 Distinct Registered Students ---');
  const studentsRes = await pool.query(
    "SELECT id, name, email, role FROM users WHERE role = 'STUDENT' ORDER BY id ASC LIMIT 10"
  );
  const students = studentsRes.rows;

  if (students.length < 10) {
    throw new Error(`Insufficient student accounts in database. Expected >= 10, found ${students.length}`);
  }

  console.log(`Loaded ${students.length} student users:`);
  students.forEach((s, idx) => {
    console.log(`  [Student ${idx + 1}] ID: #${s.id} | Email: ${s.email}`);
  });

  // Generate valid Bearer JWTs for all 10 students
  const tokens = students.map((s) =>
    jwt.sign({ id: s.id, email: s.email, role: s.role }, JWT_SECRET, { expiresIn: '2h' })
  );

  // 2. Pre-check seat availability and clean up any pre-existing reservation for this test seat
  console.log('\n--- Step 2: Pre-check & Clean Seat State ---');
  await pool.query(
    "UPDATE reservations SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE event_id = $1 AND seat_id = $2 AND status = 'ACTIVE'",
    [TARGET_EVENT_ID, TARGET_SEAT_ID]
  );
  await pool.query(
    "UPDATE event_seats SET status = 'AVAILABLE' WHERE id = $1",
    [TARGET_SEAT_ID]
  );

  const preCheckRes = await fetch(`${BASE_URL}/api/events/${TARGET_EVENT_ID}/seats`);
  const seats = await preCheckRes.json();
  const targetSeat = seats.find((s) => String(s.id) === String(TARGET_SEAT_ID));

  if (!targetSeat || targetSeat.status !== 'AVAILABLE') {
    throw new Error(`Seat #${TARGET_SEAT_ID} is not AVAILABLE. Actual status: ${targetSeat?.status}`);
  }
  console.log(`✅ Target Seat Verified: Number: "${targetSeat.seat_number}", Status: "${targetSeat.status}"`);

  // 3. Firing 10 Simultaneous Booking Requests
  console.log('\n--- Step 3: Firing 10 Simultaneous Booking Requests (Promise.all) ---');
  console.log(`Target: Event #${TARGET_EVENT_ID}, Seat #${TARGET_SEAT_ID}`);

  const startMs = Date.now();
  const dispatchPromises = tokens.map((token, index) =>
    fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_id: TARGET_EVENT_ID,
        seat_id: TARGET_SEAT_ID,
      }),
    }).then(async (res) => {
      const body = await res.json();
      return {
        studentIndex: index,
        studentId: students[index].id,
        status: res.status,
        body,
      };
    })
  );

  const results = await Promise.all(dispatchPromises);
  const elapsedMs = Date.now() - startMs;

  console.log(`All 10 requests completed in ${elapsedMs}ms.`);

  const successfulRequests = results.filter((r) => r.status === 201);
  const conflictRequests = results.filter((r) => r.status === 409);
  const otherRequests = results.filter((r) => r.status !== 201 && r.status !== 409);

  console.log('\nResponse Breakdown:');
  console.log(`  - HTTP 201 Created (Won the seat):    ${successfulRequests.length}`);
  console.log(`  - HTTP 409 Conflict (Safely rejected): ${conflictRequests.length}`);
  console.log(`  - Unexpected Responses:              ${otherRequests.length}`);

  // Assertions on Concurrency
  if (successfulRequests.length !== 1) {
    console.error('❌ CONCURRENCY VIOLATION: Exactly one request must succeed!');
    console.error('Successful requests:', JSON.stringify(successfulRequests, null, 2));
    process.exit(1);
  }

  if (conflictRequests.length !== 9) {
    console.error(`❌ CONCURRENCY VIOLATION: Expected exactly 9 conflict rejections, got ${conflictRequests.length}`);
    process.exit(1);
  }

  if (otherRequests.length > 0) {
    console.error('❌ UNEXPECTED RESPONSES:', JSON.stringify(otherRequests, null, 2));
    process.exit(1);
  }

  const winner = successfulRequests[0];
  const winningReservationId = winner.body.reservation?.id;
  console.log(`\n✅ Concurrency Winner: Student ID #${winner.studentId} | Reservation ID #${winningReservationId}`);

  // 4. Verify Database Consistency
  console.log('\n--- Step 4: Database Consistency & Invariant Verification ---');

  // Check 1: Exactly 1 ACTIVE reservation in reservations table
  const dbActiveRes = await pool.query(
    "SELECT id, event_id, seat_id, user_id, status FROM reservations WHERE event_id = $1 AND seat_id = $2 AND status = 'ACTIVE'",
    [TARGET_EVENT_ID, TARGET_SEAT_ID]
  );
  if (dbActiveRes.rows.length !== 1) {
    throw new Error(`DB Invariant Broken: Expected 1 active reservation, found ${dbActiveRes.rows.length}`);
  }
  console.log(`✅ Invariant 1: Exactly 1 active reservation in reservations table (ID #${dbActiveRes.rows[0].id})`);

  // Check 2: Seat status in event_seats must be 'BOOKED'
  const dbSeatRes = await pool.query(
    "SELECT id, seat_number, status FROM event_seats WHERE id = $1",
    [TARGET_SEAT_ID]
  );
  if (dbSeatRes.rows[0].status !== 'BOOKED') {
    throw new Error(`DB Invariant Broken: Seat status is "${dbSeatRes.rows[0].status}", expected "BOOKED"`);
  }
  console.log(`✅ Invariant 2: Seat #${TARGET_SEAT_ID} status in event_seats is strictly "BOOKED"`);

  // Check 3: Exactly 1 audit history entry with action='BOOKED'
  const dbHistoryRes = await pool.query(
    "SELECT id, action, performed_by FROM booking_history WHERE reservation_id = $1 AND action = 'BOOKED'",
    [winningReservationId]
  );
  if (dbHistoryRes.rows.length !== 1) {
    throw new Error(`DB Invariant Broken: Missing booking_history record for reservation #${winningReservationId}`);
  }
  console.log(`✅ Invariant 3: Audit trail recorded in booking_history (Performed by Student #${dbHistoryRes.rows[0].performed_by})`);

  // 5. Test Unauthorized Cancellation Rejection (RBAC)
  console.log('\n--- Step 5: Unauthorized Cancellation Protection ---');
  // Competing student (loser) attempts to cancel winner's ticket
  const loserIndex = winner.studentIndex === 0 ? 1 : 0;
  const loserToken = tokens[loserIndex];

  const hijackCancelRes = await fetch(`${BASE_URL}/api/reservations/${winningReservationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${loserToken}` },
  });

  if (hijackCancelRes.status !== 403) {
    throw new Error(`RBAC Failure: Unauthorized cancellation returned HTTP ${hijackCancelRes.status}, expected 403`);
  }
  console.log(`✅ Unauthorized cancellation blocked with HTTP 403 Forbidden.`);

  // 6. Test Authorized Cancellation Lifecycle
  console.log('\n--- Step 6: Authorized Cancellation & Seat Restoration ---');
  const winnerToken = tokens[winner.studentIndex];
  const cancelRes = await fetch(`${BASE_URL}/api/reservations/${winningReservationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${winnerToken}` },
  });

  if (cancelRes.status !== 200) {
    throw new Error(`Cancellation failed with HTTP ${cancelRes.status}`);
  }
  const cancelData = await cancelRes.json();
  console.log(`✅ Winning reservation #${winningReservationId} cancelled successfully:`, cancelData.message);

  // Verify reservation is now CANCELLED in DB
  const dbCancelledCheck = await pool.query(
    "SELECT status, cancelled_at FROM reservations WHERE id = $1",
    [winningReservationId]
  );
  if (dbCancelledCheck.rows[0].status !== 'CANCELLED' || !dbCancelledCheck.rows[0].cancelled_at) {
    throw new Error('DB Invariant Broken: Reservation status not updated to CANCELLED or cancelled_at timestamp is null');
  }
  console.log(`✅ Invariant 4: Reservation status updated to "CANCELLED" with timestamp: ${dbCancelledCheck.rows[0].cancelled_at}`);

  // Verify seat is returned to AVAILABLE in DB
  const dbRestoredSeat = await pool.query(
    "SELECT status FROM event_seats WHERE id = $1",
    [TARGET_SEAT_ID]
  );
  if (dbRestoredSeat.rows[0].status !== 'AVAILABLE') {
    throw new Error(`DB Invariant Broken: Seat status not restored to "AVAILABLE" (current: ${dbRestoredSeat.rows[0].status})`);
  }
  console.log(`✅ Invariant 5: Seat #${TARGET_SEAT_ID} status restored to "AVAILABLE" in event_seats`);

  // Verify audit history includes 'CANCELLED'
  const dbCancelHistory = await pool.query(
    "SELECT action FROM booking_history WHERE reservation_id = $1 AND action = 'CANCELLED'",
    [winningReservationId]
  );
  if (dbCancelHistory.rows.length !== 1) {
    throw new Error('DB Invariant Broken: Missing CANCELLED action in booking_history');
  }
  console.log(`✅ Invariant 6: Cancellation recorded in booking_history`);

  // 7. Verify Re-booking after Cancellation
  console.log('\n--- Step 7: Verify Re-booking Restored Seat ---');
  const rebookRes = await fetch(`${BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens[loserIndex]}`,
    },
    body: JSON.stringify({
      event_id: TARGET_EVENT_ID,
      seat_id: TARGET_SEAT_ID,
    }),
  });

  if (rebookRes.status !== 201) {
    throw new Error(`Failed to re-book restored seat: HTTP ${rebookRes.status}`);
  }
  const rebookData = await rebookRes.json();
  const rebookResId = rebookData.reservation.id;
  console.log(`✅ Seat successfully re-booked after cancellation by Student #${students[loserIndex].id} (Reservation #${rebookResId})`);

  // Clean up re-booking
  await fetch(`${BASE_URL}/api/reservations/${rebookResId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokens[loserIndex]}` },
  });
  console.log(`✅ Cleaned up re-booking #${rebookResId}. Seat is now free.`);

  console.log('\n======================================================================');
  console.log('  CONCURRENCY & INTEGRITY AUDIT: ALL 7 TEST PHASES PASSED! 🚀');
  console.log('======================================================================\n');
}

runConcurrencyTest()
  .catch((err) => {
    console.error('\n❌ Concurrency Test Suite Failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
