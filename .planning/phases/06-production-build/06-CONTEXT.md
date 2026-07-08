# Phase 6: Production Build & Packaging - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** System deployment alignment

<domain>
## Phase Boundary

We are compiling client source code into release binaries:
- Windows Desktop: Tauri compilation into standard Windows installer formats (`.exe` / `.msi`).
- Android Mobile: Expo EAS setup to compile a standalone Android binary (`.apk`).

</domain>

<decisions>
## Implementation Decisions

### 1. Tauri Bundle Settings
- Set bundling options inside `src-tauri/tauri.conf.json` (such as active application identifiers, product names, version variables, and publisher configurations).
- Disable development debug flags for production compiles.

### 2. Expo Android Configs
- Define package bundle naming keys (e.g. `com.attendy.mobile`) inside `mobile/app.json`.
- Configure version codes and permission variables (GPS geolocation request declarations).

### Claude's Discretion
- Verify that standard assets (icons, splash screens) are in place so build bundles render clean branding.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Active constraints.
- `desktop/package.json` — Desktop build targets.
- `mobile/package.json` — Mobile build targets.

</canonical_refs>

<specifics>
## Specific Ideas

- Check WiX Toolset dependencies on Windows for Tauri build.

</specifics>

<deferred>
## Deferred Ideas

- iOS App Store publishing. Defer to v2 (requires Apple Developer Program membership).

</deferred>

---
*Phase: 06-production-build*
*Context gathered: 2026-07-08*
