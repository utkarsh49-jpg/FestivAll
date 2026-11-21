// frontend/test_analytics_and_postman.mjs
// Automated verification for the new SQL Analytics endpoint and Postman Collection.

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('C:/campus-event-booking/backend/node_modules/jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fest_jwt_key_2026_campus_event_booking_secure';

async function runTests() {
  console.log('======================================================================');
  console.log('  TESTING SQL ANALYTICS ENDPOINT & POSTMAN COLLECTION');
  console.log('======================================================================\n');

  // ---------------------------------------------------------
  // Part 1: Validate Postman Collection Structure & Schema
  // ---------------------------------------------------------
  console.log('--- 1. Validating Postman Collection Schema & Variables ---');
  const collectionPath = path.resolve('campus_event_booking.postman_collection.json');
  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection file not found at ${collectionPath}`);
  }

  const rawJson = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(rawJson);

  console.log(`[OK] Postman JSON parsed successfully.`);
  console.log(`     Collection Name: "${collection.info.name}"`);
  console.log(`     Schema: ${collection.info.schema}`);

  if (collection.info.schema !== 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json') {
    throw new Error('Invalid Postman schema version. Expected v2.1.0');
  }

  const folderNames = collection.item.map((f) => f.name);
  console.log('     Folders found:');
  folderNames.forEach((n) => console.log(`       • ${n}`));

  const expectedFolders = [
    '01 - Authentication',
    '02 - Public Discovery',
    '03 - Reservations & Booking Lifecycle',
    '04 - SQL Analytics (Aggregates & Joins)',
  ];

  for (const exp of expectedFolders) {
    if (!folderNames.includes(exp)) {
      throw new Error(`Missing expected folder: ${exp}`);
    }
  }

  // Count total test cases in collection
  let totalRequests = 0;
  for (const folder of collection.item) {
    totalRequests += folder.item.length;
  }
  console.log(`     Total Request Items in Collection: ${totalRequests}`);
  if (totalRequests < 15) {
    throw new Error('Expected at least 15 comprehensive request items in collection.');
  }

  // Confirm no real tokens are baked into collection variables
  const tokenVars = collection.variable.filter((v) => v.key.toLowerCase().includes('token'));
  for (const tv of tokenVars) {
    if (tv.value !== '') {
      throw new Error(`Security Violation: Token variable "${tv.key}" contains hardcoded value!`);
    }
  }
  console.log('[OK] Collection variable security check passed (0 hardcoded tokens).\n');

  // ---------------------------------------------------------
  // Part 2: Test SQL Analytics Endpoint Authorization
  // ---------------------------------------------------------
  console.log('--- 2. Testing Analytics: Unauthenticated Request (Expect 401) ---');
  const unauthRes = await fetch(`${BASE_URL}/api/analytics/events`);
  const unauthData = await unauthRes.json();
  console.log(`Status: ${unauthRes.status}`, JSON.stringify(unauthData));
  if (unauthRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated analytics call, got ${unauthRes.status}`);
  }

  console.log('\n--- 3. Testing Analytics: Student Role Forbidden (Expect 403) ---');
  // Generate a valid student token
  const studentToken = jwt.sign(
    { id: 9999, email: 'student_test@campus.edu', role: 'STUDENT' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const studentRes = await fetch(`${BASE_URL}/api/analytics/events`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentData = await studentRes.json();
  console.log(`Status: ${studentRes.status}`, JSON.stringify(studentData));
  if (studentRes.status !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for STUDENT role, got ${studentRes.status}`);
  }

  console.log('\n--- 4. Testing Analytics: Admin / Organizer Authorized (Expect 200) ---');
  // Generate a valid admin token
  const adminToken = jwt.sign(
    { id: 1, email: 'admin@campus.edu', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminRes = await fetch(`${BASE_URL}/api/analytics/events`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminData = await adminRes.json();
  console.log(`Status: ${adminRes.status}, Total Events Reported: ${adminData.count}`);

  if (adminRes.status !== 200 || !Array.isArray(adminData.events)) {
    throw new Error(`Expected HTTP 200 with events array, got ${adminRes.status}`);
  }

  if (adminData.count === 0 || adminData.events.length === 0) {
    throw new Error('Analytics returned 0 events; expected populated event dataset.');
  }

  // ---------------------------------------------------------
  // Part 3: Verify SQL Aggregation Correctness
  // ---------------------------------------------------------
  console.log('\n--- 5. Validating SQL Aggregate Data & Mathematical Invariants ---');
  const sample = adminData.events[0];
  console.log('Sample Event Analytics Record:');
  console.log(JSON.stringify(sample, null, 2));

  // Check required aggregate fields
  const requiredFields = [
    'event_id',
    'event_title',
    'event_status',
    'venue_name',
    'venue_capacity',
    'total_seats',
    'booked_seats',
    'available_seats',
    'active_reservations',
    'cancelled_reservations',
    'occupancy_rate_percent',
  ];

  for (const f of requiredFields) {
    if (!(f in sample)) {
      throw new Error(`Missing expected aggregate field: ${f}`);
    }
  }

  // Check seat math invariant across all events: total_seats = booked_seats + available_seats
  let checkedCount = 0;
  for (const ev of adminData.events) {
    if (ev.total_seats !== ev.booked_seats + ev.available_seats) {
      throw new Error(
        `Seat math mismatch on Event #${ev.event_id}: Total (${ev.total_seats}) != Booked (${ev.booked_seats}) + Available (${ev.available_seats})`
      );
    }
    checkedCount++;
  }
  console.log(`[OK] Verified total_seats = booked_seats + available_seats across all ${checkedCount} events.`);

  console.log('\n======================================================================');
  console.log('  ALL ANALYTICS & POSTMAN TESTS PASSED SUCCESSFULLY! ✅');
  console.log('======================================================================');
}

runTests().catch((err) => {
  console.error('\n[TEST FAILED]', err.message);
  process.exit(1);
});
