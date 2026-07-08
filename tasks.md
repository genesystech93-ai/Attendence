# Task Board: Attendy Office Attendance System

- `[x]` **Phase 1: Desktop Application Development (Complete)**
  - `[x]` Initialize Tauri + Vite + React TS project in `desktop/`
  - `[x]` Design glassmorphic Tailwind-inspired CSS layout (`App.css`)
  - `[x]` Create TypeScript Offline database services layer (`dataService.ts`)
  - `[x]` Implement real-time ticking clock headers & shift timers
  - `[x]` Code the sensory testing/spoofing panel (SSID/IP/GPS Coordinates inputs)
  - `[x]` Implement Haversine Distance checks for checking in
  - `[x]` Build leave request form and history logs table
  - `[x]` Code admin leave approval queues & office configuration updates
  - `[x]` Conduct complete test run and compile build validation checks

- `[x]` **Phase 2: Mobile Application Development (Complete)**
  - `[x]` Scaffold Expo React Native app structure under `mobile/`
  - `[x]` Port shared TypeScript data interfaces and mock data layer (`dataService.ts`)
  - `[x]` Integrate `expo-location` and map geodistance check calculations
  - `[x]` Integrate `expo-local-authentication` to trigger FaceID/Fingerprint scan simulation
  - `[x]` Build employee mobile check-in dashboard, leave requests, and settings tabs
  - `[x]` Verify compilation builds succeed without errors

- `[x]` **Phase 3: Supabase Cloud Integration (Complete)**
  - `[x]` Task 03-01-01: Write backend schema DDL script (`backend/schema.sql`)
  - `[x]` Task 03-01-02: Create client `.env.example` configurations
  - `[x]` Task 03-02-01: Install `@supabase/supabase-js` client SDK on Desktop and Mobile
  - `[x]` Task 03-02-02: Swap client mock dataService bindings with live Supabase client queries
  - `[x]` Task 03-02-03: Run verification builds checking compilation


- `[ ]` **Phase 4: Tamper Prevention & Time Security**
  - `[ ]` Task 04-01-01: Add DDL check constraints to check-ins preventing clock backdating
  - `[ ]` Task 04-01-02: Implement client timezone API queries to fetch secure network times
  - `[ ]` Task 04-01-03: Add drift-alert warnings if system clock departs from network time

- `[ ]` **Phase 5: Admin Analytics & Reports**
  - `[ ]` Task 05-01-01: Write SQL stored procedures (RPC) returning aggregated work hours
  - `[ ]` Task 05-01-02: Create browser-based client-side CSV downloads in Admin panel
  - `[ ]` Task 05-01-03: Design monthly dashboard shifts summary charts

- `[ ]` **Phase 6: Production Build & Packaging**
  - `[ ]` Task 06-01-01: Add application branding metadata to `tauri.conf.json` and `app.json`
  - `[ ]` Task 06-01-02: Compile desktop codes to Windows installers (`.msi` / `.exe`)
  - `[ ]` Task 06-01-03: Compile mobile code into release APK packages via EAS CLI
