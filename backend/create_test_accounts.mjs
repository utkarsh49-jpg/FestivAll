// backend/create_test_accounts.mjs
// Non-destructive script to safely set up or verify dedicated demo accounts
// for ORGANIZER and ADMIN without modifying any existing database records.
//
// Requires passwords via environment variables (ORGANIZER_PASSWORD, ADMIN_PASSWORD).
// Inspects existing accounts before making any changes.
// Never overwrites passwords or roles if accounts already exist.

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'campus_event_booking',
  password: process.env.DB_PASSWORD || '1234',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL || 'demo_organizer@campus.edu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'demo_admin@campus.edu';

const organizerPassword = process.env.ORGANIZER_PASSWORD;
const adminPassword = process.env.ADMIN_PASSWORD;

async function setupTestAccounts() {
  console.log('======================================================================');
  console.log('  TEST ACCOUNT INSPECTION & SAFE INITIALIZATION');
  console.log('======================================================================\n');

  try {
    // 1. Inspect existing accounts
    const organizerCheck = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [ORGANIZER_EMAIL]
    );

    const adminCheck = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [ADMIN_EMAIL]
    );

    // Report organizer status
    if (organizerCheck.rows.length > 0) {
      const u = organizerCheck.rows[0];
      console.log(`[EXISTING] Dedicated Organizer account found:`);
      console.log(`  - ID: #${u.id}`);
      console.log(`  - Name: ${u.name}`);
      console.log(`  - Email: ${u.email}`);
      console.log(`  - Role: ${u.role}`);
      console.log(`  -> Intact. No password or role modified.`);
    } else {
      if (!organizerPassword || organizerPassword.length < 6) {
        console.warn(`[SKIPPED] Dedicated Organizer (${ORGANIZER_EMAIL}) does not exist.`);
        console.warn(`  To create it safely, set ORGANIZER_PASSWORD environment variable (min 6 chars).`);
      } else {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(organizerPassword, salt);
        const res = await pool.query(
          `INSERT INTO users (name, email, password_hash, role)
           VALUES ($1, $2, $3, 'ORGANIZER')
           RETURNING id, name, email, role, created_at`,
          ['Fest Organizer Demo', ORGANIZER_EMAIL.toLowerCase(), hash]
        );
        console.log(`[CREATED] Dedicated Organizer account created successfully:`);
        console.log(`  - ID: #${res.rows[0].id}`);
        console.log(`  - Email: ${res.rows[0].email}`);
        console.log(`  - Role: ${res.rows[0].role}`);
      }
    }

    console.log('');

    // Report admin status
    if (adminCheck.rows.length > 0) {
      const a = adminCheck.rows[0];
      console.log(`[EXISTING] Dedicated Admin account found:`);
      console.log(`  - ID: #${a.id}`);
      console.log(`  - Name: ${a.name}`);
      console.log(`  - Email: ${a.email}`);
      console.log(`  - Role: ${a.role}`);
      console.log(`  -> Intact. No password or role modified.`);
    } else {
      if (!adminPassword || adminPassword.length < 6) {
        console.warn(`[SKIPPED] Dedicated Admin (${ADMIN_EMAIL}) does not exist.`);
        console.warn(`  To create it safely, set ADMIN_PASSWORD environment variable (min 6 chars).`);
      } else {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPassword, salt);
        const res = await pool.query(
          `INSERT INTO users (name, email, password_hash, role)
           VALUES ($1, $2, $3, 'ADMIN')
           RETURNING id, name, email, role, created_at`,
          ['Campus Admin Demo', ADMIN_EMAIL.toLowerCase(), hash]
        );
        console.log(`[CREATED] Dedicated Admin account created successfully:`);
        console.log(`  - ID: #${res.rows[0].id}`);
        console.log(`  - Email: ${res.rows[0].email}`);
        console.log(`  - Role: ${res.rows[0].role}`);
      }
    }

    console.log('\n======================================================================');
    console.log('  ACCOUNT CHECK COMPLETED SAFELY');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('[ERROR during account setup]:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupTestAccounts();
