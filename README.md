# FestivAll – Campus Event & Auditorium Booking System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

A full-stack campus event discovery and auditorium seat reservation system engineered for high concurrency, transactional integrity, and large-scale data handling.

Built specifically to solve the **"Hard Concurrency Requirement"**: preventing race conditions and double-bookings when multiple users attempt to reserve the same physical seat at the exact same millisecond.

---

## 📑 Table of Contents
1. [Key Features](#1-key-features)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Prerequisites](#5-prerequisites)
6. [PostgreSQL Database Setup](#6-postgresql-database-setup)
7. [Environment Variables](#7-environment-variables)
8. [Installation & Execution](#8-installation--execution)
9. [Authentication & User Roles](#9-authentication--user-roles)
10. [API Overview](#10-api-overview)
11. [Testing & Verification](#11-testing--verification)
12. [User Interface Screenshots](#12-user-interface-screenshots)
13. [Known Limitations](#13-known-limitations)
14. [Documentation Links](#14-documentation-links)

---

## 1. Key Features

- **Vibrant Fest Discovery Portal**: Dark-mode fest UI (`#080518`) styled with electric purple, cyan, and fest pink accents, real-time event filtering, search, and date selection.
- **Interactive Auditorium Visualizer**: Color-coded seat map (`AVAILABLE` in purple/cyan, `BOOKED` locked in slate, `SELECTED` in pulsing pink).
- **Hard Concurrency Safeguards**: Guaranteed prevention of double-booking under extreme concurrency using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) wrapped inside atomic database transactions (`BEGIN ... COMMIT`), reinforced with a unique partial index on active reservations.
- **Real JWT Authentication & RBAC**: Real authentication with `bcryptjs` password hashing, token expiration, profile retrieval via `/api/auth/me`, and role-based access control (`STUDENT`, `ORGANIZER`, `ADMIN`).
- **Owner-Protected Reservations & Cancellations**: Tickets are strictly tied to authenticated user IDs. Transactional cancellation immediately restores seats to `AVAILABLE` and logs to an audit history.
- **Organizer Event Management**: Create events with custom seating capacities, update event schedules, manage publishing status (`DRAFT`, `PUBLISHED`, `CANCELLED`), and view confirmed attendee rosters.
- **Admin Control Center**: Institutional management including system-wide metrics, user role promotion/demotion (with last-admin demotion safeguards), and venue management with referential integrity protection.
- **SQL Analytics Engine**: Multi-table SQL aggregations calculating seat occupancy rates, active bookings, and venue metrics using SQL `JOIN`, `COUNT(DISTINCT ...)`, conditional `CASE`, and `GROUP BY`.
- **Large-Scale Data Handling**: Populated and verified with **~9,200 records** (70 users, 20 venues, 100 events, 5,000 seats, and 2,000+ reservations).

---

## 2. Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Web Framework**: Express.js (v5)
- **Database Driver**: `pg` (Node Postgres Connection Pool)
- **Security & Tokens**: `jsonwebtoken` (JWT), `bcryptjs`
- **Configuration**: `dotenv`

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 3, PostCSS, Autoprefixer
- **Icons & Effects**: Lucide React, Canvas Confetti

### Database
- **Engine**: PostgreSQL (v14+, verified on v18.6 64-bit)
- **Design**: Third Normal Form (3NF), 6 relational tables, row-level locks, foreign keys, check constraints, partial indexes.

---

## 3. System Architecture

The application implements a decoupled, three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│               Frontend: React + Vite + TypeScript               │
│        Port 3000 (Development Server & API Reverse Proxy)       │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / JSON (REST + Bearer JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend: Express.js (Node.js)                │
│       Port 5000 (Routing, Middleware: Auth & Roles, Controllers)│
└────────────────────────────────┬────────────────────────────────┘
                                 │ pg Connection Pool (Row-Locks & Transactions)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database: PostgreSQL Relational DB            │
│        Port 5432 (6 Tables, 3NF, Row Locks, Partial Indexes)    │
└─────────────────────────────────────────────────────────────────┘
```

### The Two-Layer Concurrency Architecture

```
User A ──── POST /api/reservations ─────┐
                                        ├──► PostgreSQL Transaction (BEGIN)
User B ──── POST /api/reservations ─────┘
                                                 │
                                                 ▼
                                        SELECT ... FOR UPDATE (Row Lock)
                                                 │
                                 ┌───────────────┴───────────────┐
                                 ▼                               ▼
                      [Thread A wins lock]             [Thread B waits]
                      Seat is AVAILABLE                Lock released by A
                      Inserts Reservation              Reads seat: BOOKED
                      Updates Seat: BOOKED             ROLLBACK
                      COMMIT (HTTP 201)                HTTP 409 Conflict
                                 ▲                               ▲
                                 └───────────────┬───────────────┘
                                                 │
                                      Defense-in-Depth Layer 2:
                                      Unique Partial Index:
                                      ON reservations(event_id, seat_id)
                                      WHERE status = 'ACTIVE'
```

---

## 4. Project Folder Structure

```
c:\campus-event-booking\
├── .env.example               # Environment variables configuration template
├── README.md                  # Project overview and instructions
├── package.json               # Root workspace configuration
├── campus_event_booking.postman_collection.json # Official Postman test collection
├── backend/
│   ├── .env                   # Local backend environment file (ignored by Git)
│   ├── package.json           # Backend dependencies and scripts
│   ├── server.js              # Express REST API (Auth, Events, Seats, Reservations, Admin)
│   ├── test_all_features.mjs  # Comprehensive backend verification test suite
│   └── create_test_accounts.mjs # Utility to create demo role credentials
├── frontend/
│   ├── index.html             # Single-page application entry HTML
│   ├── package.json           # Frontend dependencies and build scripts
│   ├── vite.config.ts         # Vite build and proxy configuration (/api -> port 5000)
│   ├── tailwind.config.js     # Tailwind CSS theme and palette config
│   ├── src/
│   │   ├── App.tsx            # Main application layout, hash router & navigation
│   │   ├── main.tsx           # React DOM root render
│   │   ├── index.css          # Tailwind imports & ambient fest glow styles
│   │   ├── components/        # Reusable UI component modules
│   │   │   ├── admin/         # Admin stats, user role management, venues, event approval
│   │   │   ├── auditorium/    # Auditorium seating grid, seat items, booking summary modal
│   │   │   ├── auth/          # Login and registration modal dialogs
│   │   │   ├── common/        # Navbar, Footer, Badge, Loader
│   │   │   ├── events/        # Event cards, search, and category filters
│   │   │   ├── home/          # Hero banner and featured events section
│   │   │   ├── organizer/     # Event creation modal, edit event modal, attendee list
│   │   │   └── reservations/  # Ticket pass cards and cancel confirmation dialog
│   │   ├── context/           # React Context providers (UserContext, EventContext)
│   │   ├── pages/             # Route pages (Home, Events, Details, MyReservations, Dashboards)
│   │   ├── services/api.ts    # Centralized HTTP client with automatic Bearer token injection
│   │   └── types/index.ts     # TypeScript interface definitions
│   ├── concurrency_demo.mjs   # Live concurrency demonstration script
│   └── test_analytics_and_postman.mjs # Postman & analytics verification script
├── database/
│   ├── schema.sql             # PostgreSQL schema DDL (tables, constraints, indexes)
│   ├── ERD.md                 # Entity Relationship text diagram
│   └── normalization.md       # Normalization analysis (1NF, 2NF, 3NF compliance)
├── docs/
│   ├── ER_DIAGRAM.md          # Visual Mermaid ER diagram & data dictionary
│   ├── API_DOCUMENTATION.md   # Exhaustive REST API reference documentation
│   └── FINAL_TEST_REPORT.md   # Full regression, integration, and build report
└── seed/
    └── seed.js                # Database seeder generating 9,000+ realistic records
```

---

## 5. Prerequisites

Before installing and running the project, ensure you have:
1. **Node.js**: Version 18.0.0 or higher (verified on Node v24.x).
2. **npm**: Version 9.0.0 or higher.
3. **PostgreSQL**: Version 14.0 or higher (running locally on port `5432`).
4. **Git**: Installed for repository navigation.

---

## 6. PostgreSQL Database Setup

### Step 1: Create the Database
Open PostgreSQL interactive terminal (`psql`) or pgAdmin:
```sql
CREATE DATABASE campus_event_booking;
```

### Step 2: Apply the Schema DDL
Execute the schema definitions from PowerShell or Command Prompt:
```powershell
psql -U postgres -d campus_event_booking -f "c:\campus-event-booking\database\schema.sql"
```

### Step 3: Populate Initial Seed Data (Initial Setup Only)
> ⚠️ **Important**: Run the database seeder **only once** on a clean installation. Never reseed an existing, operational database.
```powershell
node "c:\campus-event-booking\seed\seed.js"
```
This populates ~9,200 records:
- 50+ users
- 20 venues
- 100 events
- 5,000 event seats
- 2,000+ reservations and booking history entries

---

## 7. Environment Variables

An environment variable template is provided in the repository root: [`.env.example`](file:///c:/campus-event-booking/.env.example).

Create a `.env` file inside `backend/` (`c:\campus-event-booking\backend\.env`) based on this template:

```ini
# PostgreSQL Database Connection
DB_USER=postgres
DB_PASSWORD=<YOUR_POSTGRESQL_PASSWORD>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_event_booking

# Application Server Port
PORT=5000
NODE_ENV=development

# JWT Authentication Secret (Use a strong random string)
JWT_SECRET=<YOUR_LONG_RANDOM_JWT_SECRET_KEY>
JWT_EXPIRES_IN=24h

# Frontend API URL
VITE_API_URL=http://localhost:5000
```

> **Security Note**: Never commit your actual `.env` file to version control. The `.env` file is excluded via `.gitignore`.

---

## 8. Installation & Execution

The project requires running the backend server and frontend development server in **two separate terminals**.

### Terminal 1: Backend Server

```powershell
# 1. Navigate to backend directory
cd c:\campus-event-booking\backend

# 2. Install dependencies
npm install

# 3. Start the Express server
node server.js
```
**Expected Output**:
```
🚀 Server running on http://localhost:5000
✅ Database connected successfully!
```

---

### Terminal 2: Frontend Development Server

```powershell
# 1. Navigate to frontend directory
cd c:\campus-event-booking\frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
**Expected Output**:
```
  VITE v6.1.0  ready in 240 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Open your browser and navigate to:  
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 9. Authentication & User Roles

The platform provides three distinct user tiers enforced through JWT tokens:

| Role | Access Scope | Key Capabilities |
| :--- | :--- | :--- |
| **`STUDENT`** | Public & Personal Passes | Browse published events, view interactive seat layouts, book seats, view and cancel personal tickets. |
| **`ORGANIZER`** | Department & Event Scope | Create events with custom seating capacities, update event details, manage publication status (`DRAFT`, `PUBLISHED`, `CANCELLED`), inspect attendee lists, view event occupancy analytics. |
| **`ADMIN`** | Platform-Wide Supervision | Full access across all events, global reservations, auditorium analytics, venue management, and user role promotion/demotion. |

### Demo Accounts for Testing
- **Organizer Demo**: `demo_organizer@campus.edu` (Role: `ORGANIZER`)
- **Admin Demo**: `demo_admin@campus.edu` (Role: `ADMIN`)
- **Student Registration**: Use the **"Sign In / Register"** modal in the UI or call `POST /api/auth/register` to create a new student account instantly.

---

## 10. API Overview

The backend exposes 24 verified endpoints categorized into functional groups:

| Group | Method | Route | Access / Role | Description |
| :--- | :---: | :--- | :---: | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Registers a new student account. |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticates credentials and returns JWT. |
| **Auth** | `GET` | `/api/auth/me` | Bearer Token | Retrieves current user profile. |
| **Venues** | `GET` | `/api/venues` | Public | Lists all campus venues and capacities. |
| **Events** | `GET` | `/api/events` | Public | Lists published events (with venue join). |
| **Events** | `GET` | `/api/events/:eventId/seats` | Public | Lists real-time seat status for an event. |
| **Reservations** | `POST` | `/api/reservations` | Bearer Token | Atomically books a seat with row locking. |
| **Reservations** | `GET` | `/api/reservations` | Bearer Token | Lists user's reservations (or all for Admin). |
| **Reservations** | `GET` | `/api/reservations/:id` | Bearer Token | Retrieves single ticket details. |
| **Reservations** | `DELETE` | `/api/reservations/:id` | Bearer Token | Cancels pass and frees seat to `AVAILABLE`. |
| **Organizer** | `GET` | `/api/organizer/events` | `ORGANIZER`, `ADMIN` | Lists events managed by the organizer. |
| **Organizer** | `POST` | `/api/events` | `ORGANIZER`, `ADMIN` | Creates event and dynamically generates seats. |
| **Organizer** | `PUT` | `/api/events/:id` | `ORGANIZER`, `ADMIN` | Updates event details and adjusts seat capacity. |
| **Organizer** | `PATCH` | `/api/events/:id/status` | `ORGANIZER`, `ADMIN` | Updates status (`DRAFT`, `PUBLISHED`, `CANCELLED`). |
| **Organizer** | `GET` | `/api/events/:id/attendees` | `ORGANIZER`, `ADMIN` | Retrieves confirmed student attendee list. |
| **Admin** | `GET` | `/api/admin/stats` | `ADMIN` | Platform metrics & global occupancy rate. |
| **Admin** | `GET` | `/api/admin/users` | `ADMIN` | Lists users with reservation counts. |
| **Admin** | `PATCH` | `/api/admin/users/:id/role` | `ADMIN` | Updates user role (last-admin protected). |
| **Admin** | `GET` | `/api/admin/events` | `ADMIN` | Comprehensive system-wide event registry. |
| **Admin** | `POST` | `/api/venues` | `ADMIN` | Creates new campus venue. |
| **Admin** | `PUT` | `/api/venues/:id` | `ADMIN` | Updates venue details. |
| **Admin** | `DELETE` | `/api/venues/:id` | `ADMIN` | Deletes venue (blocked if events exist). |
| **Analytics** | `GET` | `/api/analytics/events` | `ORGANIZER`, `ADMIN` | SQL aggregations and occupancy percentages. |

> Complete schema definitions, request bodies, and error codes are detailed in [docs/API_DOCUMENTATION.md](file:///c:/campus-event-booking/docs/API_DOCUMENTATION.md).

---

## 11. Testing & Verification

The project includes automated integration, authentication, and concurrency test suites that run directly with Node.js.

### 1. Backend Comprehensive Feature & Safeguard Suite
Verifies all 33 business logic rules, ownership restrictions, role guards, and data isolation:
```powershell
cd c:\campus-event-booking\backend
node test_all_features.mjs
```
*Result*: **33 PASSED / 0 FAILED**.

### 2. Authentication & Concurrency Regression Suite
Verifies registration, login, role escalation prevention, token injection, unauthorized cancellation, and concurrent seat booking:
```powershell
cd c:\campus-event-booking
node frontend/backend_auth_test.mjs
```
*Result*: **14 PASSED / 0 FAILED**.

### 3. SQL Analytics & Postman Schema Verification
Verifies the official Postman collection (v2.1.0) and validates mathematical invariants across all 100 events:
```powershell
cd c:\campus-event-booking
node frontend/test_analytics_and_postman.mjs
```
*Result*: **8 PASSED / 0 FAILED**.

### 4. Frontend Production Build Check
```powershell
cd c:\campus-event-booking\frontend
npm run build
```
*Result*: **1967 modules transformed, built with 0 errors**.

### 5. Running Postman Collection
Import [`campus_event_booking.postman_collection.json`](file:///c:/campus-event-booking/campus_event_booking.postman_collection.json) into Postman and execute via the Collection Runner.

---

## 12. User Interface Screenshots

| Screen | Description | Preview |
| :--- | :--- | :---: |
| **Home & Fest Discovery** | Ambient neon hero section, search bar, date filter, and event cards. | `[Screenshot Placeholder: Home Page]` |
| **Interactive Auditorium Map** | Neon stage view with dynamic seat colors (`AVAILABLE`, `BOOKED`, `SELECTED`). | `[Screenshot Placeholder: Auditorium Visualizer]` |
| **Student My Passes** | Active student pass cards with event date, venue, seat ID, and cancel action. | `[Screenshot Placeholder: Student Passes]` |
| **Organizer Dashboard** | Event creation modal, capacity adjuster, and confirmed attendee list. | `[Screenshot Placeholder: Organizer Dashboard]` |
| **Admin Control Center** | Institutional statistics, user management, and venue configuration. | `[Screenshot Placeholder: Admin Dashboard]` |

---

## 13. Known Limitations

1. **Seeded User Account Passwords**: Seeded demo accounts in `seed.js` use placeholder hashes (`"seeded_password_hash"`). For testing, use the registration form in the UI or pre-configured accounts (`demo_organizer@campus.edu`, `demo_admin@campus.edu`).
2. **Real-Time Seat Updates**: Seat availability is refreshed upon selection and periodically polled via the client API. A future enhancement could introduce WebSockets for instant push updates during high-traffic ticket drops.
3. **Seating Row Granularity**: The current visualizer dynamically maps up to 500 seats into labeled rows (`S1`, `S2`, ...). Multi-balcony complex venue layouts are modeled as flat seat grids per venue.

---

## 14. Documentation Links

- [Entity-Relationship Diagram & Data Dictionary](file:///c:/campus-event-booking/docs/ER_DIAGRAM.md)
- [REST API Reference Documentation](file:///c:/campus-event-booking/docs/API_DOCUMENTATION.md)
- [Final Integration & Regression Test Report](file:///c:/campus-event-booking/docs/FINAL_TEST_REPORT.md)
- [Database Normalization Analysis (1NF, 2NF, 3NF)](file:///c:/campus-event-booking/database/normalization.md)
