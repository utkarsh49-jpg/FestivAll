// backend_auth_test.mjs
// Comprehensive verification of authentication and authorization

const BASE_URL = 'http://localhost:5000';

async function testAuth() {
  const results = {};
  const testEmail = `student_${Date.now()}@campus.edu`;
  const testPassword = 'Password123!';
  const testName = 'Test Student Authentic';

  console.log('--- 1. Testing Registration (POST /api/auth/register) ---');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      role: 'ADMIN', // Deliberate attempt to escalate to ADMIN; should be ignored/enforced as STUDENT
    }),
  });
  const regData = await regRes.json();
  results.registration = {
    status: regRes.status,
    hasToken: !!regData.token,
    role: regData.user?.role,
    passwordHashExposed: 'password_hash' in (regData.user || {}),
  };
  console.log('Registration Status:', regRes.status, 'Role assigned:', regData.user?.role, 'Has Token:', !!regData.token);
  if (regRes.status !== 201 || regData.user?.role !== 'STUDENT' || results.registration.passwordHashExposed) {
    throw new Error('Registration test failed!');
  }
  const tokenA = regData.token;
  const userA = regData.user;

  console.log('--- 2. Testing Duplicate Email Registration (POST /api/auth/register) ---');
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Student',
      email: testEmail,
      password: testPassword,
    }),
  });
  const dupData = await dupRes.json();
  results.duplicateEmail = {
    status: dupRes.status,
    error: dupData.error,
  };
  console.log('Duplicate Email Status:', dupRes.status, 'Error:', dupData.error);
  if (dupRes.status !== 409) {
    throw new Error('Duplicate email test failed!');
  }

  console.log('--- 3. Testing Invalid Password Login (POST /api/auth/login) ---');
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword!',
    }),
  });
  const badLoginData = await badLoginRes.json();
  results.invalidLogin = {
    status: badLoginRes.status,
    error: badLoginData.error,
  };
  console.log('Invalid Login Status:', badLoginRes.status, 'Error:', badLoginData.error);
  if (badLoginRes.status !== 401) {
    throw new Error('Invalid login test failed!');
  }

  console.log('--- 4. Testing Seeded Placeholder User Login Rejection (Safeguard 6) ---');
  const seedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user1@campus.edu',
      password: 'seeded_password_hash',
    }),
  });
  const seedLoginData = await seedLoginRes.json();
  results.seededPlaceholderRejection = {
    status: seedLoginRes.status,
    error: seedLoginData.error,
  };
  console.log('Seeded User Login Status:', seedLoginRes.status, 'Message:', seedLoginData.error);
  if (seedLoginRes.status !== 401) {
    throw new Error('Seeded placeholder rejection failed!');
  }

  console.log('--- 5. Testing Valid Login (POST /api/auth/login) ---');
  const goodLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const goodLoginData = await goodLoginRes.json();
  results.validLogin = {
    status: goodLoginRes.status,
    hasToken: !!goodLoginData.token,
    user: goodLoginData.user,
  };
  console.log('Valid Login Status:', goodLoginRes.status, 'User:', goodLoginData.user?.email);
  if (goodLoginRes.status !== 200 || !goodLoginData.token) {
    throw new Error('Valid login test failed!');
  }

  console.log('--- 6. Testing Authenticated Profile (GET /api/auth/me) ---');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const meData = await meRes.json();
  results.authenticatedMe = {
    status: meRes.status,
    id: meData.id,
    email: meData.email,
    role: meData.role,
  };
  console.log('GET /api/auth/me Status:', meRes.status, 'Email:', meData.email, 'Role:', meData.role);
  if (meRes.status !== 200 || meData.email !== testEmail.toLowerCase()) {
    throw new Error('GET /api/auth/me test failed!');
  }

  console.log('--- 7. Testing Unauthenticated Profile (GET /api/auth/me without token) ---');
  const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`);
  results.unauthenticatedMe = { status: unauthMeRes.status };
  console.log('Unauthenticated /me Status:', unauthMeRes.status);
  if (unauthMeRes.status !== 401) {
    throw new Error('Unauthenticated /me test failed!');
  }

  console.log('--- 8. Testing Unauthenticated Booking Rejection (POST /api/reservations) ---');
  const unauthBookRes = await fetch(`${BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: 35, seat_id: 1702 }),
  });
  results.unauthenticatedBooking = { status: unauthBookRes.status };
  console.log('Unauthenticated Booking Status:', unauthBookRes.status);
  if (unauthBookRes.status !== 401) {
    throw new Error('Unauthenticated booking rejection test failed!');
  }

  console.log('--- 9. Register User B for Authorization Testing ---');
  const userBEmail = `student_b_${Date.now()}@campus.edu`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User B Student',
      email: userBEmail,
      password: testPassword,
    }),
  });
  const regBData = await regBRes.json();
  const tokenB = regBData.token;
  const userB = regBData.user;
  console.log('Registered User B:', userB.id, userB.email);

  console.log('--- 10. Booking a Seat as User A (POST /api/reservations) ---');
  // Seat 1702 on Event 35 is currently AVAILABLE
  const bookRes = await fetch(`${BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      event_id: 35,
      seat_id: 1702,
      user_id: 9999, // Deliberate attempt to spoof user_id in body; backend must derive user_id from token!
    }),
  });
  const bookData = await bookRes.json();
  console.log('Book status:', bookRes.status, 'Reservation:', JSON.stringify(bookData.reservation));
  if (bookRes.status !== 201 || String(bookData.reservation.user_id) !== String(userA.id)) {
    throw new Error('Booking did not use authenticated user_id from token!');
  }
  const testReservationId = bookData.reservation.id;
  results.authenticatedBooking = {
    status: bookRes.status,
    reservationId: testReservationId,
    bookedUserId: bookData.reservation.user_id,
    tokenUserId: userA.id,
  };

  console.log('--- 11. Testing Unauthorized Cancellation as User B (DELETE /api/reservations/:id) ---');
  const unauthCancelRes = await fetch(`${BASE_URL}/api/reservations/${testReservationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const unauthCancelData = await unauthCancelRes.json();
  results.unauthorizedCancellation = {
    status: unauthCancelRes.status,
    error: unauthCancelData.error,
  };
  console.log('Unauthorized Cancel Status:', unauthCancelRes.status, 'Error:', unauthCancelData.error);
  if (unauthCancelRes.status !== 403) {
    throw new Error('Unauthorized cancellation test failed! Expected 403 Forbidden.');
  }

  console.log('--- 12. Testing Owner Cancellation as User A (DELETE /api/reservations/:id) ---');
  const ownerCancelRes = await fetch(`${BASE_URL}/api/reservations/${testReservationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const ownerCancelData = await ownerCancelRes.json();
  results.ownerCancellation = {
    status: ownerCancelRes.status,
    body: ownerCancelData,
  };
  console.log('Owner Cancel Status:', ownerCancelRes.status, 'Message:', ownerCancelData.message);
  if (ownerCancelRes.status !== 200) {
    throw new Error('Owner cancellation test failed!');
  }

  console.log('--- 13. Verify Seat Returned to AVAILABLE ---');
  const finalSeatRes = await fetch(`${BASE_URL}/api/events/35/seats`);
  const finalSeats = await finalSeatRes.json();
  const seat1702 = finalSeats.find((s) => String(s.id) === '1702');
  results.finalSeatStatus = seat1702;
  console.log('Seat 1702 Status:', seat1702.status);
  if (seat1702.status !== 'AVAILABLE') {
    throw new Error('Seat 1702 did not return to AVAILABLE!');
  }

  console.log('--- 14. Testing Concurrent Bookings with Authenticated Tokens ---');
  const [concA, concB] = await Promise.all([
    fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ event_id: 35, seat_id: 1702 }),
    }),
    fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ event_id: 35, seat_id: 1702 }),
    }),
  ]);
  const concDataA = await concA.json();
  const concDataB = await concB.json();
  results.concurrencyTest = {
    tokenA_status: concA.status,
    tokenB_status: concB.status,
  };
  console.log('Concurrent Token A Status:', concA.status, JSON.stringify(concDataA));
  console.log('Concurrent Token B Status:', concB.status, JSON.stringify(concDataB));

  let winningResId = null;
  if (concA.status === 201 && concB.status === 409) {
    winningResId = concDataA.reservation?.id;
  } else if (concB.status === 201 && concA.status === 409) {
    winningResId = concDataB.reservation?.id;
  } else {
    throw new Error('Concurrent booking failed expected 1x 201 and 1x 409!');
  }

  // Cleanup winning test reservation
  if (winningResId) {
    const cleanupToken = concA.status === 201 ? tokenA : tokenB;
    await fetch(`${BASE_URL}/api/reservations/${winningResId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${cleanupToken}` },
    });
    console.log('Cleaned up concurrency reservation ID:', winningResId);
  }

  // Verify final seat status is AVAILABLE
  const seatCheckFinal = await (await fetch(`${BASE_URL}/api/events/35/seats`)).json();
  const seat1702Final = seatCheckFinal.find((s) => String(s.id) === '1702');
  console.log('Seat 1702 final status after concurrency test:', seat1702Final.status);

  console.log('=== ALL AUTHENTICATION AND AUTHORIZATION TESTS PASSED ===');
  console.log(JSON.stringify(results, null, 2));
}

testAuth().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
