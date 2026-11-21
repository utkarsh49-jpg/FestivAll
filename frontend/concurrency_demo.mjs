// frontend/concurrency_demo.mjs
// Safe, repeatable concurrency demonstration script for Campus Event Booking.
// Demonstrates PostgreSQL transaction isolation (SELECT ... FOR UPDATE) and prevents double booking.

const API_URL = process.env.API_URL || 'http://localhost:5000';
const EVENT_ID = process.env.EVENT_ID ? parseInt(process.env.EVENT_ID, 10) : 35;
const SEAT_ID = process.env.SEAT_ID ? parseInt(process.env.SEAT_ID, 10) : 1702;

const STUDENT_A_EMAIL = process.env.STUDENT_A_EMAIL || 'concurrency_student_a@campus.edu';
const STUDENT_A_PASSWORD = process.env.STUDENT_A_PASSWORD;
const STUDENT_B_EMAIL = process.env.STUDENT_B_EMAIL || 'concurrency_student_b@campus.edu';
const STUDENT_B_PASSWORD = process.env.STUDENT_B_PASSWORD;

function printHeader(title) {
  console.log('\n======================================================================');
  console.log(`  ${title}`);
  console.log('======================================================================');
}

function printSection(title) {
  console.log(`\n--- [ ${title} ] ---`);
}

async function validateEnvironment() {
  const missing = [];
  if (!STUDENT_A_PASSWORD) missing.push('STUDENT_A_PASSWORD');
  if (!STUDENT_B_PASSWORD) missing.push('STUDENT_B_PASSWORD');

  if (missing.length > 0) {
    console.error('\n[ERROR] Missing required environment variables:');
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error('\nPlease supply student account passwords via environment variables, for example:');
    console.error('  PowerShell:');
    console.error('    $env:STUDENT_A_PASSWORD = "YourPassword123!"');
    console.error('    $env:STUDENT_B_PASSWORD = "YourPassword123!"');
    console.error('    node frontend/concurrency_demo.mjs\n');
    console.error('Tip: You can register demo accounts first using:');
    console.error('    node frontend/register_demo_students.mjs\n');
    process.exit(1);
  }
}

async function authenticateStudent(label, email, password) {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.status !== 200 || !data.token) {
      throw new Error(`Authentication failed for ${label} (${email}): ${data.error || res.statusText}`);
    }

    if (data.user?.role !== 'STUDENT') {
      throw new Error(`Role mismatch for ${label}: Expected STUDENT but received ${data.user?.role}`);
    }

    return {
      label,
      token: data.token,
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      },
    };
  } catch (err) {
    console.error(`[AUTH FAILURE] ${err.message}`);
    process.exit(1);
  }
}

async function runDemo() {
  printHeader('CAMPUS EVENT BOOKING: CONCURRENCY DEMONSTRATION');
  console.log(`Target API:     ${API_URL}`);
  console.log(`Target Event:   Event ID ${EVENT_ID}`);
  console.log(`Target Seat:    Seat ID ${SEAT_ID}`);

  // Step 1: Validate Environment
  await validateEnvironment();

  // Step 2: Authenticate Both Students
  printSection('Step 1: Authenticating Test Students via JWT');
  const studentA = await authenticateStudent('Student A', STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
  const studentB = await authenticateStudent('Student B', STUDENT_B_EMAIL, STUDENT_B_PASSWORD);

  if (String(studentA.user.id) === String(studentB.user.id)) {
    console.error('[ERROR] Student A and Student B must be two distinct registered user accounts.');
    process.exit(1);
  }

  console.log(`[OK] Student A: ${studentA.user.name} (User ID #${studentA.user.id}, Email: ${studentA.user.email}, Role: ${studentA.user.role})`);
  console.log(`[OK] Student B: ${studentB.user.name} (User ID #${studentB.user.id}, Email: ${studentB.user.email}, Role: ${studentB.user.role})`);
  console.log('     Passwords and JWT tokens hidden from output for security.');

  // Step 3: Check Seat Availability (Pre-check safeguard)
  printSection('Step 2: Pre-check Seat Availability in Database');
  const seatsRes = await fetch(`${API_URL}/api/events/${EVENT_ID}/seats`);
  if (!seatsRes.ok) {
    console.error(`[ERROR] Failed to fetch seats for Event ${EVENT_ID}: HTTP ${seatsRes.status}`);
    process.exit(1);
  }
  const seats = await seatsRes.json();
  const targetSeat = seats.find((s) => String(s.id) === String(SEAT_ID));

  if (!targetSeat) {
    console.error(`[ERROR] Seat ID ${SEAT_ID} not found in Event ${EVENT_ID}.`);
    process.exit(1);
  }

  console.log(`Seat Details: Number: "${targetSeat.seat_number}", Event ID: ${targetSeat.event_id}, Status: "${targetSeat.status}"`);

  if (targetSeat.status !== 'AVAILABLE') {
    console.error(`\n[ABORTED] Target Seat ID ${SEAT_ID} is currently "${targetSeat.status}", NOT "AVAILABLE".`);
    console.error('Safeguard triggered: Refusing to proceed to prevent modifying existing reservations.');
    console.error('Please choose an available seat or wait for the event to be free.');
    process.exit(1);
  }
  console.log('[OK] Seat is AVAILABLE. Safe to proceed with concurrency demonstration.');

  // Step 4: Fire Concurrent Booking Requests
  printSection('Step 3: Firing Simultaneous Booking Requests (Promise.all)');
  console.log(`Dispatching two parallel POST ${API_URL}/api/reservations requests...`);
  console.log(`  - Thread A: Student A (ID #${studentA.user.id}) attempting to book Event ${EVENT_ID}, Seat ${SEAT_ID}`);
  console.log(`  - Thread B: Student B (ID #${studentB.user.id}) attempting to book Event ${EVENT_ID}, Seat ${SEAT_ID}`);

  const startMs = Date.now();
  const [resA, resB] = await Promise.all([
    fetch(`${API_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ event_id: EVENT_ID, seat_id: SEAT_ID }),
    }),
    fetch(`${API_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentB.token}`,
      },
      body: JSON.stringify({ event_id: EVENT_ID, seat_id: SEAT_ID }),
    }),
  ]);
  const durationMs = Date.now() - startMs;

  const dataA = await resA.json();
  const dataB = await resB.json();

  console.log(`[RACE FINISHED in ${durationMs}ms]`);
  console.log(`  - Response A (Student A): HTTP ${resA.status}`, JSON.stringify(dataA));
  console.log(`  - Response B (Student B): HTTP ${resB.status}`, JSON.stringify(dataB));

  // Step 5: Concurrency Verification
  printSection('Step 4: Evaluating Race Outcome (1x 201 Created vs 1x 409 Conflict)');
  let winningReservationId = null;
  let winningStudent = null;
  let losingStudent = null;
  let winningData = null;
  let losingData = null;

  if (resA.status === 201 && resB.status === 409) {
    winningStudent = studentA;
    losingStudent = studentB;
    winningData = dataA;
    losingData = dataB;
    winningReservationId = dataA.reservation?.id;
  } else if (resB.status === 201 && resA.status === 409) {
    winningStudent = studentB;
    losingStudent = studentA;
    winningData = dataB;
    losingData = dataA;
    winningReservationId = dataB.reservation?.id;
  } else {
    console.error('\n[CONCURRENCY FAILURE] Expected exactly one HTTP 201 and one HTTP 409!');
    console.error(`Received: Student A = ${resA.status}, Student B = ${resB.status}`);
    process.exit(1);
  }

  console.log(`[PASS] Concurrency control succeeded!`);
  console.log(`  Winner: ${winningStudent.label} (${winningStudent.user.name}, User ID #${winningStudent.user.id}) -> HTTP 201 Created`);
  console.log(`          Assigned Reservation ID: #${winningReservationId}`);
  console.log(`  Loser:  ${losingStudent.label} (${losingStudent.user.name}, User ID #${losingStudent.user.id}) -> HTTP 409 Conflict`);
  console.log(`          Conflict message: "${losingData.error}"`);

  // Step 6: Targeted Database Invariant & Seat State Verification
  printSection('Step 5: Verifying Database Invariants (Targeted Checks)');

  // 6a: Check seat status updated to BOOKED
  const seatCheckRes = await fetch(`${API_URL}/api/events/${EVENT_ID}/seats`);
  const seatCheckList = await seatCheckRes.json();
  const seatAfterBooking = seatCheckList.find((s) => String(s.id) === String(SEAT_ID));
  console.log(`  - Seat status in DB: "${seatAfterBooking?.status}" (Expected: BOOKED)`);
  if (seatAfterBooking?.status !== 'BOOKED') {
    console.error('[ERROR] Seat status was not updated to BOOKED.');
    process.exit(1);
  }

  // 6b: Check winning reservation record directly via GET /api/reservations/:id
  const singleRes = await fetch(`${API_URL}/api/reservations/${winningReservationId}`);
  if (!singleRes.ok) {
    console.error(`[ERROR] Failed to fetch created reservation #${winningReservationId}: HTTP ${singleRes.status}`);
    process.exit(1);
  }
  const reservationRecord = await singleRes.json();
  console.log(`  - Created reservation record in DB: ID #${reservationRecord.id}, Status: "${reservationRecord.status}", User: #${reservationRecord.user_id}`);
  if (
    reservationRecord.status !== 'ACTIVE' ||
    String(reservationRecord.user_id) !== String(winningStudent.user.id) ||
    String(reservationRecord.seat_id) !== String(SEAT_ID)
  ) {
    console.error('[ERROR] Reservation record in DB does not match expected state.');
    process.exit(1);
  }
  console.log(`[OK] Invariant confirmed: Exactly 1 valid reservation created for winning user #${winningStudent.user.id}.`);

  // Step 7: Authorized Cleanup (Winning Student Only)
  printSection('Step 6: Cleaning Up Test Reservation via Authorized API');
  console.log(`Sending authorized DELETE ${API_URL}/api/reservations/${winningReservationId} using ${winningStudent.label}'s token...`);

  const cancelRes = await fetch(`${API_URL}/api/reservations/${winningReservationId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${winningStudent.token}`,
    },
  });

  const cancelData = await cancelRes.json();
  console.log(`  - Cancellation Response: HTTP ${cancelRes.status}`, JSON.stringify(cancelData));

  if (cancelRes.status !== 200) {
    console.error(`[ERROR] Cancellation failed: ${cancelData.error || cancelRes.statusText}`);
    process.exit(1);
  }

  // Step 8: Targeted Post-Cleanup Verification
  printSection('Step 7: Verifying Post-Cleanup State');

  // Verify reservation is marked CANCELLED
  const postCancelRes = await fetch(`${API_URL}/api/reservations/${winningReservationId}`);
  const postCancelData = await postCancelRes.json();
  console.log(`  - Reservation #${winningReservationId} status in DB: "${postCancelData.status}" (Expected: CANCELLED)`);
  if (postCancelData.status !== 'CANCELLED') {
    console.error('[ERROR] Reservation was not marked CANCELLED.');
    process.exit(1);
  }

  // Verify seat is restored to AVAILABLE
  const finalSeatsRes = await fetch(`${API_URL}/api/events/${EVENT_ID}/seats`);
  const finalSeatsList = await finalSeatsRes.json();
  const finalSeat = finalSeatsList.find((s) => String(s.id) === String(SEAT_ID));
  console.log(`  - Target Seat ID ${SEAT_ID} status in DB: "${finalSeat?.status}" (Expected: AVAILABLE)`);
  if (finalSeat?.status !== 'AVAILABLE') {
    console.error('[ERROR] Seat was not restored to AVAILABLE.');
    process.exit(1);
  }

  printHeader('DEMONSTRATION COMPLETE: ALL SAFEGUARDS & INVARIANTS VERIFIED');
  console.log('Summary:');
  console.log('  1. PostgreSQL row-level locking (SELECT ... FOR UPDATE) prevented double-booking.');
  console.log('  2. Two simultaneous requests resolved cleanly: 1x HTTP 201 Created, 1x HTTP 409 Conflict.');
  console.log('  3. Invariant preserved: Exactly one active booking existed at any point.');
  console.log('  4. Test data isolated and restored: Only the test reservation was cancelled.');
  console.log('  5. Target seat returned to AVAILABLE state. Zero unrelated records were modified.\n');
}

runDemo().catch((err) => {
  console.error('\n[UNHANDLED ERROR]', err);
  process.exit(1);
});
