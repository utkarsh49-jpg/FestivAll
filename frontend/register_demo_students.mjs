// frontend/register_demo_students.mjs
// Registers two demo STUDENT accounts via the existing public registration API (POST /api/auth/register).
// Requires passwords from environment variables (no hardcoded defaults).
// Uses unique default emails unlikely to collide with existing records.
// Halts safely on HTTP 409 without modifying existing users.
// Never prints passwords or JWT tokens to the console.

const API_URL = process.env.API_URL || 'http://localhost:5000';

const studentA_email = process.env.STUDENT_A_EMAIL || 'concurrency_student_a@campus.edu';
const studentB_email = process.env.STUDENT_B_EMAIL || 'concurrency_student_b@campus.edu';

const studentA_password = process.env.STUDENT_A_PASSWORD;
const studentB_password = process.env.STUDENT_B_PASSWORD;

function validatePasswordInputs() {
  const missing = [];
  if (!studentA_password) missing.push('STUDENT_A_PASSWORD');
  if (!studentB_password) missing.push('STUDENT_B_PASSWORD');

  if (missing.length > 0) {
    console.error('\n======================================================================');
    console.error('  [ERROR] PASSWORDS REQUIRED VIA ENVIRONMENT VARIABLES');
    console.error('======================================================================');
    console.error('Hardcoded default passwords have been disabled for security and safety.');
    console.error('Missing environment variables:');
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error('\nPlease supply passwords via environment variables before running:');
    console.error('  PowerShell:');
    console.error('    $env:STUDENT_A_PASSWORD = "YourPassword123!"');
    console.error('    $env:STUDENT_B_PASSWORD = "YourPassword123!"');
    console.error('    node frontend/register_demo_students.mjs\n');
    process.exit(1);
  }
}

async function testApiConnectivity() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) {
      throw new Error(`API responded with HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`\n[CONNECTION ERROR] Cannot reach backend API at ${API_URL}`);
    console.error('Ensure your Express backend is running on port 5000.');
    console.error(`Details: ${err.message}\n`);
    process.exit(1);
  }
}

async function registerOrVerifyStudent(label, name, email, password) {
  console.log(`Processing ${label}: "${name}" <${email}>`);

  // Attempt registration via POST /api/auth/register
  let regRes;
  try {
    regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });
  } catch (err) {
    throw new Error(`Failed to send registration request: ${err.message}`);
  }

  const regData = await regRes.json();

  if (regRes.status === 201) {
    console.log(`  -> [REGISTERED NEW ACCOUNT] HTTP 201 Created`);
    console.log(`     User ID: #${regData.user?.id}`);
    console.log(`     Assigned Role: ${regData.user?.role} (Enforced by backend)`);
    console.log(`     Token Generated: Yes (Hidden for security)`);
    return {
      id: regData.user.id,
      name: regData.user.name,
      email: regData.user.email,
      role: regData.user.role,
      token: regData.token,
    };
  }

  if (regRes.status === 409) {
    // Attempt verification login with the provided password
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token) {
      console.log(`  -> [EXISTING ACCOUNT CONFIRMED] HTTP 200 - Password verified`);
      console.log(`     User ID: #${loginData.user?.id}`);
      console.log(`     Role: ${loginData.user?.role}`);
      return {
        id: loginData.user.id,
        name: loginData.user.name,
        email: loginData.user.email,
        role: loginData.user.role,
        token: loginData.token,
      };
    }

    // HTTP 409 conflict and login failed
    console.error(`\n======================================================================`);
    console.error(`  [ABORTED: HTTP 409 CONFLICT] ${label}`);
    console.error(`======================================================================`);
    console.error(`The account "${email}" already exists in the database, and the password`);
    console.error(`provided in ${label === 'Student A' ? 'STUDENT_A_PASSWORD' : 'STUDENT_B_PASSWORD'} did not match.`);
    console.error('\nTo protect existing records and prevent unintended modifications:');
    console.error(`  1. Set a different unique email address:`);
    console.error(`     $env:${label === 'Student A' ? 'STUDENT_A_EMAIL' : 'STUDENT_B_EMAIL'} = "new_student@campus.edu"`);
    console.error(`  2. Or if you own this account, supply the correct existing password:`);
    console.error(`     $env:${label === 'Student A' ? 'STUDENT_A_PASSWORD' : 'STUDENT_B_PASSWORD'} = "<correct_password>"\n`);
    process.exit(1);
  }

  throw new Error(`Registration rejected with HTTP ${regRes.status}: ${regData.error || JSON.stringify(regData)}`);
}

async function verifyProfile(label, token) {
  const meRes = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    throw new Error(`Profile verification for ${label} failed with HTTP ${meRes.status}`);
  }
  const meData = await meRes.json();
  if (meData.role !== 'STUDENT') {
    throw new Error(`Role verification for ${label} failed: Expected STUDENT, got ${meData.role}`);
  }
  return meData;
}

async function main() {
  console.log('======================================================================');
  console.log('  CAMPUS EVENT BOOKING: DEMO STUDENT REGISTRATION & VERIFICATION');
  console.log('======================================================================');
  console.log(`Target Backend: ${API_URL}\n`);

  validatePasswordInputs();
  await testApiConnectivity();

  const userA = await registerOrVerifyStudent('Student A', 'Demo Student Alpha', studentA_email, studentA_password);
  const userB = await registerOrVerifyStudent('Student B', 'Demo Student Beta', studentB_email, studentB_password);

  if (String(userA.id) === String(userB.id)) {
    throw new Error('Student A and Student B resolved to the same User ID. They must be two distinct accounts.');
  }

  // Double-verify with GET /api/auth/me
  console.log('\nVerifying JWT authentication & role constraints via GET /api/auth/me...');
  const meA = await verifyProfile('Student A', userA.token);
  const meB = await verifyProfile('Student B', userB.token);
  console.log(`  [OK] Student A: ${meA.name} (User ID #${meA.id}) - Role: ${meA.role}`);
  console.log(`  [OK] Student B: ${meB.name} (User ID #${meB.id}) - Role: ${meB.role}`);

  console.log('\n======================================================================');
  console.log('  REGISTRATION COMPLETE: BOTH STUDENT ACCOUNTS ACTIVE');
  console.log('======================================================================');
  console.log('Verified Account Status:');
  console.log(`  - Student A: Email: "${userA.email}" | User ID #${userA.id} | Role: ${userA.role} | Password: [CONFIRMED / REDACTED]`);
  console.log(`  - Student B: Email: "${userB.email}" | User ID #${userB.id} | Role: ${userB.role} | Password: [CONFIRMED / REDACTED]`);
  console.log('\nBoth demo accounts are registered and verified in the PostgreSQL database.');
  console.log('You can now run the concurrency demo using the exact same environment variables:\n');
  console.log('  node frontend/concurrency_demo.mjs\n');
}

main().catch((err) => {
  console.error('\n[REGISTRATION HELPER FAILED]', err.message);
  process.exit(1);
});
