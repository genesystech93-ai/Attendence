# Phase 6: Production Build & Packaging - Research

## 1. Tauri Windows Packaging

Tauri compiles high-performance desktop apps using Rust to bind the OS WebView. On Windows, Tauri packages resources into `.msi` and `.exe` installers.

### Prerequisites (Windows Host)
- **Rust Toolchain:** `rustc`, `cargo` (available via rustup).
- **WiX Toolset v3:** Required to generate `.msi` installers. Can be installed via `dotnet tool` or downloaded directly.

### Command Execution
```bash
cd desktop
npm run tauri build
```
This builds the React frontend, compiles Rust crates, bundles assets, and outputs binaries to `desktop/src-tauri/target/release/bundle/`.

---

## 2. Expo EAS Standalone Builds

EAS (Expo Application Services) compiles React Native bundles in the cloud or locally.

### Config Requirements (`mobile/app.json`)
```json
{
  "expo": {
    "name": "Attendy",
    "slug": "attendy-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "android": {
      "package": "com.attendy.mobile",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "USE_BIOMETRIC"
      ]
    }
  }
}
```

### Local Build Command (Android APK)
```bash
cd mobile
npx eas-cli build --platform android --profile preview --local
```
This generates a downloadable `.apk` file for testing without uploading to public play stores.
