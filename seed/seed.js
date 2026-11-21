const { Client } = require("pg");

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "campus_event_booking",
  password: "1234",
  port: 5432,
});

// Change only the password above.
// Do NOT share your PostgreSQL password with me.

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Kabir",
  "Rohan", "Rahul", "Karan", "Aryan", "Ishaan",
  "Ananya", "Diya", "Isha", "Aditi", "Meera",
  "Priya", "Riya", "Sneha", "Kavya", "Nisha"
];

const lastNames = [
  "Sharma", "Jha", "Verma", "Gupta", "Singh",
  "Kumar", "Patel", "Mehta", "Malhotra", "Joshi",
  "Das", "Roy", "Sinha", "Chopra", "Kapoor"
];

const venueNames = [
  "Main Auditorium",
  "Seminar Hall A",
  "Seminar Hall B",
  "Innovation Center",
  "Computer Lab",
  "Central Lawn",
  "Sports Complex",
  "Conference Hall",
  "Cultural Hall",
  "Student Activity Center",
  "Library Hall",
  "Engineering Block Hall",
  "Open Air Theatre",
  "Central Courtyard",
  "Research Center"
];

const eventTitles = [
  "Tech Fest 2026",
  "AI & Machine Learning Workshop",
  "Web Development Bootcamp",
  "Cyber Security Seminar",
  "Hackathon 2026",
  "Data Science Workshop",
  "Cloud Computing Conference",
  "Robotics Exhibition",
  "Entrepreneurship Summit",
  "Coding Competition",
  "Photography Workshop",
  "Cultural Night",
  "Sports Meet",
  "Career Development Seminar",
  "Open Source Meetup"
];

const locations = [
  "Main Campus",
  "North Campus",
  "South Campus",
  "Academic Block",
  "Innovation Block",
  "Student Center"
];

const descriptions = [
  "An exciting campus event for students and faculty.",
  "A hands-on learning and networking session.",
  "An interactive workshop conducted by experienced speakers.",
  "A technical event featuring talks, demonstrations and activities.",
  "A campus-wide event focused on learning and collaboration."
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysFromNow));

  return date.toISOString().split("T")[0];
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function randomStartTime() {
  const hour = randomInt(9, 16);
  return `${pad(hour)}:00:00`;
}

function getEndTime(startTime) {
  const hour = parseInt(startTime.substring(0, 2));
  return `${pad(hour + 2)}:00:00`;
}

async function bulkInsert(table, columns, rows, chunkSize = 500) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);

    const values = [];
    const placeholders = [];

    let parameterNumber = 1;

    for (const row of chunk) {
      const rowPlaceholders = [];

      for (const value of row) {
        values.push(value);
        rowPlaceholders.push(`$${parameterNumber++}`);
      }

      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    }

    const query = `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES ${placeholders.join(", ")}
    `;

    await client.query(query, values);
  }
}

async function seed() {
  try {
    await client.connect();
    
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM venues) AS venues,
        (SELECT COUNT(*) FROM events) AS events,
        (SELECT COUNT(*) FROM event_seats) AS event_seats,
        (SELECT COUNT(*) FROM reservations) AS reservations,
        (SELECT COUNT(*) FROM booking_history) AS booking_history
    `);

    if (Object.values(counts.rows[0]).some(n => Number(n) > 0)) {
      console.log("Existing data found. Seeding stopped safely.");
      return;
    }

    console.log("✅ Connected to PostgreSQL");
    console.log("🌱 Starting database seeding...");

    await client.query("BEGIN");

    // ---------------------------------------------------------
    // 1. CLEAR OLD SEED DATA
    // ---------------------------------------------------------

    console.log("🧹 Clearing existing data...");

    await client.query(`
      TRUNCATE TABLE
        booking_history,
        reservations,
        event_seats,
        events,
        venues,
        users
      RESTART IDENTITY CASCADE
    `);

    // ---------------------------------------------------------
    // 2. USERS
    // ---------------------------------------------------------

    console.log("👤 Creating users...");

    const users = [];

    for (let i = 1; i <= 50; i++) {
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const name = `${firstName} ${lastName} ${i}`;

      let role = "STUDENT";

      if (i <= 10) {
        role = "ORGANIZER";
      }

      if (i <= 2) {
        role = "ADMIN";
      }

      const email = `user${i}@campus.edu`;

      users.push([
        name,
        email,
        "seeded_password_hash",
        role
      ]);
    }

    await bulkInsert(
      "users",
      ["name", "email", "password_hash", "role"],
      users
    );

    console.log(`   ✅ ${users.length} users created`);

    // ---------------------------------------------------------
    // 3. VENUES
    // ---------------------------------------------------------

    console.log("🏢 Creating venues...");

    const venues = [];

    for (let i = 1; i <= 20; i++) {
      venues.push([
        `${randomItem(venueNames)} ${i}`,
        randomItem(locations),
        randomInt(100, 500)
      ]);
    }

    await bulkInsert(
      "venues",
      ["name", "location", "capacity"],
      venues
    );

    console.log(`   ✅ ${venues.length} venues created`);

    // ---------------------------------------------------------
    // 4. EVENTS
    // ---------------------------------------------------------

    console.log("🎫 Creating events...");

    const organizers = await client.query(`
      SELECT id
      FROM users
      WHERE role = 'ORGANIZER'
      ORDER BY id
    `);

    const venueResult = await client.query(`
      SELECT id
      FROM venues
      ORDER BY id
    `);

    const events = [];

    for (let i = 1; i <= 100; i++) {
      const title = `${randomItem(eventTitles)} #${i}`;
      const description = randomItem(descriptions);
      const eventDate = randomDate(180);
      const startTime = randomStartTime();
      const endTime = getEndTime(startTime);

      const venueId = randomItem(venueResult.rows).id;
      const organizerId = randomItem(organizers.rows).id;

      const statuses = ["DRAFT", "PUBLISHED", "PUBLISHED", "PUBLISHED"];

      const status = randomItem(statuses);

      events.push([
        title,
        description,
        eventDate,
        startTime,
        endTime,
        venueId,
        organizerId,
        status
      ]);
    }

    await bulkInsert(
      "events",
      [
        "title",
        "description",
        "event_date",
        "start_time",
        "end_time",
        "venue_id",
        "organizer_id",
        "status"
      ],
      events
    );

    console.log(`   ✅ ${events.length} events created`);

    // ---------------------------------------------------------
    // 5. EVENT SEATS
    // ---------------------------------------------------------

    console.log("💺 Creating event seats...");

    const eventResult = await client.query(`
      SELECT id
      FROM events
      ORDER BY id
    `);

    const eventSeats = [];

    for (const event of eventResult.rows) {
      // 50 seats per event
      for (let seatNumber = 1; seatNumber <= 50; seatNumber++) {
        eventSeats.push([
          event.id,
          `S${seatNumber}`,
          "AVAILABLE"
        ]);
      }
    }

    await bulkInsert(
      "event_seats",
      ["event_id", "seat_number", "status"],
      eventSeats
    );

    console.log(`   ✅ ${eventSeats.length} event seats created`);

    // ---------------------------------------------------------
    // 6. RESERVATIONS
    // ---------------------------------------------------------

    console.log("📋 Creating reservations...");

    const usersResult = await client.query(`
      SELECT id
      FROM users
      WHERE role = 'STUDENT'
      ORDER BY id
    `);

    const seatsResult = await client.query(`
      SELECT id, event_id
      FROM event_seats
      ORDER BY id
    `);

    const reservations = [];

    // Keep track of seats already used for each event.
    const usedSeats = new Set();

    for (let i = 0; i < 2000; i++) {
      let seat;

      // Find an unused seat for this event.
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = randomItem(seatsResult.rows);
        const key = `${candidate.event_id}-${candidate.id}`;

        if (!usedSeats.has(key)) {
          usedSeats.add(key);
          seat = candidate;
          break;
        }
      }

      if (!seat) {
        break;
      }

      const userId = randomItem(usersResult.rows).id;

      // Around 80% ACTIVE and 20% CANCELLED
      const isCancelled = Math.random() < 0.2;

      const status = isCancelled ? "CANCELLED" : "ACTIVE";

      const bookedAt = new Date(
        Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000
      );

      const cancelledAt = isCancelled
        ? new Date(bookedAt.getTime() + randomInt(1, 10) * 24 * 60 * 60 * 1000)
        : null;

      reservations.push([
        seat.event_id,
        seat.id,
        userId,
        status,
        bookedAt,
        cancelledAt
      ]);
    }

    await bulkInsert(
      "reservations",
      [
        "event_id",
        "seat_id",
        "user_id",
        "status",
        "booked_at",
        "cancelled_at"
      ],
      reservations
    );

    console.log(`   ✅ ${reservations.length} reservations created`);

    // ---------------------------------------------------------
    // 7. UPDATE SEAT STATUS
    // ---------------------------------------------------------

    console.log("🔄 Updating booked seat status...");

    await client.query(`
      UPDATE event_seats
      SET status = 'BOOKED'
      WHERE id IN (
        SELECT seat_id
        FROM reservations
        WHERE status = 'ACTIVE'
      )
    `);

    // ---------------------------------------------------------
    // 8. BOOKING HISTORY
    // ---------------------------------------------------------

    console.log("📚 Creating booking history...");

    const reservationResult = await client.query(`
      SELECT id, user_id, status
      FROM reservations
      ORDER BY id
    `);

    const bookingHistory = [];

    for (const reservation of reservationResult.rows) {
      bookingHistory.push([
        reservation.id,
        reservation.status === "ACTIVE" ? "BOOKED" : "CANCELLED",
        reservation.user_id
      ]);
    }

    await bulkInsert(
      "booking_history",
      ["reservation_id", "action", "performed_by"],
      bookingHistory
    );

    console.log(`   ✅ ${bookingHistory.length} history records created`);

    // ---------------------------------------------------------
    // COMMIT
    // ---------------------------------------------------------

    await client.query("COMMIT");

    console.log("");
    console.log("======================================");
    console.log("🎉 DATABASE SEEDING COMPLETED!");
    console.log("======================================");
    console.log(`Users:            ${users.length}`);
    console.log(`Venues:           ${venues.length}`);
    console.log(`Events:           ${events.length}`);
    console.log(`Event Seats:      ${eventSeats.length}`);
    console.log(`Reservations:     ${reservations.length}`);
    console.log(`Booking History:  ${bookingHistory.length}`);
    console.log("======================================");

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("");
    console.error("❌ SEEDING FAILED");
    console.error(error);
  } finally {
    await client.end();
  }
}

seed();