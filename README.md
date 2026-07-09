# Genesoft Attendance (Attendy)

A comprehensive, cross-platform enterprise attendance system featuring geolocation tracking, Wi-Fi validation, and advanced anti-spoofing security. 

## 🏗️ Architecture
This system is composed of three main clients connected to a unified backend:
1. **Mobile App (React Native / Expo):** For employees to securely clock in/out using GPS and Wi-Fi sensors.
2. **Web Dashboard (React / Vite):** For admins to view analytics, manage leaves, and configure office geofences.
3. **Desktop App (Tauri / Rust):** A native Windows `.exe` wrapper around the web dashboard for permanent administrative installations.
4. **Backend (Supabase):** PostgreSQL database handling all data logic securely.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js (v24+)](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio) (for local mobile builds)
- [Rust](https://www.rust-lang.org/tools/install) (for local desktop builds)

### 1. Database Setup
1. Create a project on [Supabase](https://supabase.com).
2. Execute the schema from `backend/schema.sql` in the Supabase SQL Editor.
3. Gather your `Project URL` and `anon public` API key.

### 2. Environment Variables
Create a `.env` file in the `mobile` directory and `.env.local` in the `desktop` directory:
```env
# mobile/.env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# desktop/.env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Running the Apps
**Desktop/Web Dashboard:**
```bash
cd desktop
npm install
npm run dev
```

**Mobile App:**
```bash
cd mobile
npm install
npx expo start
```

---

## 🌍 Hosting & Deployment

### Web Dashboard (Vercel)
The web dashboard is designed for automated deployment on Vercel.
1. Connect your GitHub repository to Vercel.
2. Set the Root Directory to `desktop`.
3. Add the two `VITE_` Environment Variables in Vercel settings.
4. Vercel will automatically deploy on every push to the `main` branch.

### Mobile App (APK / IPA)
To generate production-ready mobile apps, use Expo Application Services (EAS):
```bash
cd mobile
npx eas build -p android --profile preview  # Generates Android APK
npx eas build -p ios --profile preview      # Generates iOS IPA (Requires Apple Dev Account)
```
*Note: To build offline on Windows, open the `mobile/android` folder in Android Studio and click "Build APK(s)".*

### Desktop Executable (Windows .exe)
The `.exe` installer is completely automated via GitHub Actions!
1. Push your code to the `main` branch on GitHub.
2. Navigate to the **Actions** tab in your GitHub repository to watch it build.
3. Once the build finishes, a new Draft Release will appear in the **Releases** tab containing your `Genesoft Attendance.msi` installer.

---

## 🔒 Security Features
- **Custom Authentication:** Secure username/password auth isolated from public endpoints.
- **Mock Location Detection:** Hardware-level detection (`location.mocked`) to permanently block Fake GPS apps.
- **Server-Time Validation:** PostgreSQL triggers preventing local clock tampering.
