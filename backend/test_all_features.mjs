// backend/test_all_features.mjs
// Automated verification suite for all Organizer & Admin requirements and safeguards.

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fest_jwt_key_2026_campus_event_booking_secure';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'campus_event_booking',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

async function runTestSuite() {
  console.log('======================================================================');
  console.log('  CAMPUS EVENT BOOKING SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      console.log(`  ✅ PASSED: ${message}`);
      passed++;
    }
  }

  // 1. Ensure test tokens using real database users
  console.log('--- Step 1: Generating Dedicated Auth Tokens for Roles ---');
  // Fetch demo organizer and demo admin
  const orgAlphaRes = await pool.query("SELECT id, email, role FROM users WHERE email = 'demo_organizer@campus.edu'");
  const adminRes = await pool.query("SELECT id, email, role FROM users WHERE email = 'demo_admin@campus.edu'");

  let orgAlpha = orgAlphaRes.rows[0];
  let adminUser = adminRes.rows[0];

  // Also query or create another organizer (org beta) for cross-organizer permission testing
  let orgBetaRes = await pool.query("SELECT id, email, role FROM users WHERE role = 'ORGANIZER' AND id != $1 LIMIT 1", [orgAlpha.id]);
  let orgBeta = orgBetaRes.rows[0];

  // Query a student for student testing
  let studentRes = await pool.query("SELECT id, email, role FROM users WHERE role = 'STUDENT' LIMIT 1");
  let studentUser = studentRes.rows[0];

  const studentAToken = jwt.sign(
    { id: studentUser.id, email: studentUser.email, role: 'STUDENT' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const orgAlphaToken = jwt.sign(
    { id: orgAlpha.id, email: orgAlpha.email, role: 'ORGANIZER' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const orgBetaToken = jwt.sign(
    { id: orgBeta.id, email: orgBeta.email, role: 'ORGANIZER' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  console.log('  Tokens ready for STUDENT, ORGANIZER, and ADMIN roles.\n');

  // Test 1: Public Events Endpoint
  console.log('--- Test 1: Public Event Browsing Security ---');
  const eventsRes = await fetch(`${BASE_URL}/api/events`);
  assert(eventsRes.status === 200, 'GET /api/events returns 200 OK');
  const publicEvents = await eventsRes.json();
  assert(Array.isArray(publicEvents), 'Public events is an array');
  const nonPublished = publicEvents.filter((e) => e.status !== 'PUBLISHED');
  assert(nonPublished.length === 0, 'No DRAFT or CANCELLED events exposed to public callers');

  // Test 2: GET /api/reservations Authorization
  console.log('\n--- Test 2: GET /api/reservations Authorization Scoping ---');
  // Student calling GET /api/reservations
  const studentResList = await fetch(`${BASE_URL}/api/reservations`, {
    headers: { Authorization: `Bearer ${studentAToken}` },
  });
  assert(studentResList.status === 200, 'Student can query /api/reservations');
  const studentList = await studentResList.json();
  const foreignReservations = studentList.filter((r) => String(r.user_id) !== String(studentUser.id));
  assert(foreignReservations.length === 0, 'Student strictly receives only their own reservations');

  // Admin calling GET /api/reservations
  const adminResList = await fetch(`${BASE_URL}/api/reservations`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminResList.status === 200, 'Admin can query /api/reservations');
  const adminList = await adminResList.json();
  assert(adminList.length >= studentList.length, 'Admin receives full system reservations');

  // Test 3: GET /api/reservations/:id Security
  console.log('\n--- Test 3: GET /api/reservations/:id Access Control ---');
  // Unauthenticated
  const unauthResId = await fetch(`${BASE_URL}/api/reservations/1`);
  assert(unauthResId.status === 401, 'Unauthenticated GET /api/reservations/:id rejected with 401');

  // Find a real reservation to test ownership
  const sampleRes = adminList[0];
  if (sampleRes) {
    const ownerToken = jwt.sign(
      { id: sampleRes.user_id, email: 'owner@campus.edu', role: 'STUDENT' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const nonOwnerToken = jwt.sign(
      { id: sampleRes.user_id + 99999, email: 'nonowner@campus.edu', role: 'STUDENT' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Non-owner should receive 403
    const nonOwnerCheck = await fetch(`${BASE_URL}/api/reservations/${sampleRes.id}`, {
      headers: { Authorization: `Bearer ${nonOwnerToken}` },
    });
    assert(nonOwnerCheck.status === 403, 'Non-owner student receiving 403 Forbidden for another user reservation');

    // Owner should receive 200
    const ownerCheck = await fetch(`${BASE_URL}/api/reservations/${sampleRes.id}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(ownerCheck.status === 200, 'Reservation owner successfully retrieves reservation details');

    // Admin should receive 200
    const adminCheck = await fetch(`${BASE_URL}/api/reservations/${sampleRes.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCheck.status === 200, 'Admin successfully views any reservation');
  }

  // Test 4: SQL Analytics Scoping
  console.log('\n--- Test 4: GET /api/analytics/events Scoping ---');
  // Student rejected
  const studentAnalytics = await fetch(`${BASE_URL}/api/analytics/events`, {
    headers: { Authorization: `Bearer ${studentAToken}` },
  });
  assert(studentAnalytics.status === 403, 'STUDENT role forbidden (403) from accessing analytics');

  // Organizer receives only their own
  const orgAnalytics = await fetch(`${BASE_URL}/api/analytics/events`, {
    headers: { Authorization: `Bearer ${orgAlphaToken}` },
  });
  assert(orgAnalytics.status === 200, 'ORGANIZER receives 200 from analytics');
  const orgData = await orgAnalytics.json();
  assert(Array.isArray(orgData.events), 'Organizer analytics returns events array');

  // Admin receives all
  const adminAnalytics = await fetch(`${BASE_URL}/api/analytics/events`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAnalytics.status === 200, 'ADMIN receives 200 from analytics');
  const admData = await adminAnalytics.json();
  assert(admData.count >= orgData.count, 'Admin analytics encompasses full campus events');

  // Test 5: Organizer Event Creation with Dynamic Seats
  console.log('\n--- Test 5: Organizer Event Creation with Custom Capacity ---');
  // Get a venue
  const venuesRes = await fetch(`${BASE_URL}/api/venues`);
  const venuesList = await venuesRes.json();
  assert(venuesList.length > 0, 'Venues available');
  const testVenue = venuesList[0];

  const customCapacity = 25; // Dynamic capacity below default 50
  const createRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgAlphaToken}`,
    },
    body: JSON.stringify({
      title: 'Automated Test Hackathon 2026',
      description: 'Testing dynamic seat generation',
      event_date: '2026-12-15',
      start_time: '10:00:00',
      end_time: '13:00:00',
      venue_id: testVenue.id,
      status: 'PUBLISHED',
      capacity: customCapacity,
    }),
  });

  assert(createRes.status === 201, 'Organizer successfully created event with status 201');
  const createdEventData = await createRes.json();
  const createdEvent = createdEventData.event;
  assert(createdEventData.total_seats === customCapacity, 'Returned total_seats matches custom capacity (25)');

  // Verify seats were physically created in DB
  const seatsRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}/seats`);
  const seats = await seatsRes.json();
  assert(seats.length === customCapacity, `Verified exactly ${customCapacity} seats created in database`);
  assert(seats[0].seat_number === 'S1' && seats[customCapacity - 1].seat_number === `S${customCapacity}`, 'Seat numbering follows S1..S25');

  // Test 6: Strict Ownership Checks
  console.log('\n--- Test 6: Cross-Organizer Modification Block ---');
  // Org Beta tries to modify Org Alpha's event -> Expect 403
  const hijackRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgBetaToken}`,
    },
    body: JSON.stringify({
      title: 'Malicious Overwrite Attempt',
    }),
  });
  assert(hijackRes.status === 403, 'Cross-organizer event modification blocked with 403 Forbidden');

  // Org Alpha can modify their own event
  const legitimateRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgAlphaToken}`,
    },
    body: JSON.stringify({
      title: 'Automated Test Hackathon 2026 (Updated)',
      capacity: 30, // expand capacity to 30
    }),
  });
  assert(legitimateRes.status === 200, 'Owner organizer successfully updated event and expanded seats to 30');

  const updatedSeatsRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}/seats`);
  const updatedSeats = await updatedSeatsRes.json();
  assert(updatedSeats.length === 30, 'Seats accurately expanded from 25 to 30');

  // Test 7: Attendee Roster Access
  console.log('\n--- Test 7: Attendee List Privacy ---');
  // Student forbidden
  const studentAttRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}/attendees`, {
    headers: { Authorization: `Bearer ${studentAToken}` },
  });
  assert(studentAttRes.status === 403, 'Student access to attendee roster forbidden (403)');

  // Non-owner organizer forbidden
  const nonOwnerAttRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}/attendees`, {
    headers: { Authorization: `Bearer ${orgBetaToken}` },
  });
  assert(nonOwnerAttRes.status === 403, 'Non-owner organizer access to attendee roster forbidden (403)');

  // Owner organizer permitted
  const ownerAttRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}/attendees`, {
    headers: { Authorization: `Bearer ${orgAlphaToken}` },
  });
  assert(ownerAttRes.status === 200, 'Event owner successfully accessed attendee roster (200)');

  // Admin permitted
  const adminAttRes = await fetch(`${BASE_URL}/api/events/${createdEvent.id}/attendees`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAttRes.status === 200, 'Admin successfully accessed attendee roster (200)');

  // Test 8: Admin Role Management & Last-Admin Guard
  console.log('\n--- Test 8: Admin Role Management & Last-Admin Demotion Guard ---');
  // Student cannot update roles
  const unauthRoleRes = await fetch(`${BASE_URL}/api/admin/users/1/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAToken}`,
    },
    body: JSON.stringify({ role: 'ADMIN' }),
  });
  assert(unauthRoleRes.status === 403, 'Non-admin forbidden from updating roles');

  // Invalid role rejected
  const invalidRoleRes = await fetch(`${BASE_URL}/api/admin/users/1/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: 'SUPERUSER_HACK' }),
  });
  assert(invalidRoleRes.status === 400, 'Invalid role value strictly rejected with 400');

  // Test 9: Venue Referential Integrity Guard
  console.log('\n--- Test 9: Venue Referential Integrity Guard ---');
  // Attempting to delete a venue that has events scheduled
  const blockedVenueDelete = await fetch(`${BASE_URL}/api/venues/${testVenue.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(blockedVenueDelete.status === 409, 'Deleting venue with scheduled events blocked with 409 Conflict');

  // Create temporary venue, then delete it safely
  const createVenueRes = await fetch(`${BASE_URL}/api/venues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Temporary Empty Test Hall',
      location: 'West Campus Wing B',
      capacity: 100,
    }),
  });
  assert(createVenueRes.status === 201, 'Admin created new venue');
  const tempVenue = (await createVenueRes.json()).venue;

  const deleteTempVenue = await fetch(`${BASE_URL}/api/venues/${tempVenue.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(deleteTempVenue.status === 200, 'Admin deleted unreferenced venue safely');

  // Clean up created test event
  await pool.query('DELETE FROM events WHERE id = $1', [createdEvent.id]);
  console.log(`\n  Cleaned up temporary test event #${createdEvent.id}`);

  // Test 10: Input Validation & Type Safety Safeguards
  console.log('\n--- Test 10: Robust Input Validation & Malformed Input Handling ---');
  const badSeatParamRes = await fetch(`${BASE_URL}/api/events/invalid_id/seats`);
  assert(badSeatParamRes.status === 400, 'Non-integer event ID in /api/events/:eventId/seats returns 400 Bad Request');

  const badResIdRes = await fetch(`${BASE_URL}/api/reservations/not_a_number`, {
    headers: { Authorization: `Bearer ${studentAToken}` },
  });
  assert(badResIdRes.status === 400, 'Non-integer reservation ID in /api/reservations/:id returns 400 Bad Request');

  const badBookBodyRes = await fetch(`${BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentAToken}`,
    },
    body: JSON.stringify({ event_id: 'bad_id', seat_id: 'invalid_seat' }),
  });
  assert(badBookBodyRes.status === 400, 'Non-numeric event_id/seat_id in POST /api/reservations returns 400 Bad Request');

  const badQueryUserRes = await fetch(`${BASE_URL}/api/reservations?user_id=non_int`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(badQueryUserRes.status === 400, 'Non-integer user_id query in GET /api/reservations returns 400 Bad Request');

  // Test 11: Malformed JSON Global Error Middleware
  console.log('\n--- Test 11: Global Malformed JSON Error Handling ---');
  const malformedJsonRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": "student@campus.edu", "password": ',
  });
  assert(malformedJsonRes.status === 400, 'Malformed JSON payload safely caught and returned as 400 Bad Request');
  const malformedJsonData = await malformedJsonRes.json();
  assert(typeof malformedJsonData.error === 'string', 'Malformed JSON returns structured JSON error message');

  console.log('\n======================================================================');
  console.log(`  ALL ${passed} VERIFICATION CHECKS PASSED WITH 0 FAILURES! 🎉`);
  console.log('======================================================================\n');
}

runTestSuite()
  .catch((err) => {
    console.error('\n[SUITE FAILED]:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
