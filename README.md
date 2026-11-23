# ClassSync

ClassSync is a local-first class portal with a CR workspace and a shareable, read-only classroom. Visitors can read announcements, view calendar events, and download study materials without an account.

The Spring Boot API lives in `backend/` and the React frontend lives in `frontend/`. The original project specification is in `plan.txt`. This README describes the implemented application.

## Requirements

- Java 21 or newer
- Maven 3.9+
- Node.js 20.19+ on the 20.x line, or 22.12+
- MySQL 8+

MySQL stores CR accounts, classroom share links, subjects, folders, announcements, events, and uploaded-file metadata. Uploaded documents stay in `backend/uploads/`.

## Local configuration

From the project root in Git Bash, create your local configuration if needed.

```bash
cp -n .env.example .env
```

Set `CR_PASSWORD` for the first classroom representative and `DB_PASSWORD` for the MySQL account in `.env`. Set `CR_EMAIL` and `CR_NAME` to the representative’s details. For a new MySQL setup, run the following as a database administrator, replacing the password placeholder with the value you chose for `DB_PASSWORD`.

```sql
CREATE DATABASE classsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'classsync'@'localhost' IDENTIFIED BY '<your-database-password>';
GRANT ALL PRIVILEGES ON classsync.* TO 'classsync'@'localhost';
FLUSH PRIVILEGES;
```

For an existing database, configure its connection using `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`. Flyway creates and updates the tables when the backend starts.

## Run locally

Open two Git Bash terminals from the project root. On macOS or Linux, use `mvn` and `npm` in place of the Windows `.cmd` commands.

Backend:

```bash
cd backend
mvn.cmd spring-boot:run
```

Frontend:

```bash
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:5173. Vite proxies API requests to the backend on port 8080.

Sign in with the CR email and password configured at first startup. Existing accounts keep their stored passwords.

## Typical workflow

1. Sign in as the CR and add subjects on the **Subjects** page. Each subject appears in **Resources** as soon as it exists.
2. In **Resources**, select a subject to open its folders in a pop-up. Choose **New folder** to organise uploads. Existing files without a folder appear under **Unfiled documents**.
3. Publish announcements immediately or schedule them for later. Add events from **Calendar** or from a specific day.
4. Use **Rename classroom** or **Share classroom** on **Overview**. The share link opens the read-only classroom.

The link uses the address you opened ClassSync from. To share on your local network, start the frontend with `npm.cmd run dev -- --host 0.0.0.0`, open it from your computer’s LAN address, and then copy the classroom link. For access outside your network, the app needs a reachable hosted address.

## Verification

```bash
cd backend
mvn.cmd test

cd ../frontend
npm.cmd run build
```

Backend tests run against an isolated in-memory H2 database and write test uploads under `backend/target/`. Flyway maintains separate migrations for H2 and MySQL. The frontend build runs TypeScript checks and creates the production bundle.
