# Requirements: Attendy

**Defined:** 2026-07-08
**Core Value:** Ensure precise, tamper-proof employee attendance tracking with minimal operational hosting overhead.

## v1 Requirements

### Authentication
- [ ] **AUTH-01**: User can authenticate with preset emails or credentials
- [ ] **AUTH-02**: User can authenticate with email password JWT
- [ ] **AUTH-03**: User session is persistent across app launches

### Attendance Checking
- [ ] **ATT-01**: Employee can check-in (punch in) to active shift
- [ ] **ATT-02**: Employee can check-out (punch out) to complete shift
- [ ] **ATT-03**: App validates check-in against authorized Wi-Fi SSID
- [ ] **ATT-04**: App validates check-in against geofence center coordinates
- [ ] **ATT-05**: Active shift tracks ticking hours, minutes, and seconds

### Administration & Leaves
- [ ] **ADMIN-01**: Admin can edit geofence coordinates and authorized SSIDs
- [ ] **ADMIN-02**: Admin can approve or reject employee leave requests
- [ ] **ADMIN-03**: Admin can view active logs across all employees
- [ ] **ADMIN-04**: Admin can export monthly attendance logs as CSV
- [ ] **ADMIN-05**: Admin can view aggregated working hours charts
- [ ] **LEAVE-01**: Employee can apply for Sick/Vacation/Casual leaves

### Mobile Specifics
- [ ] **MOB-01**: Mobile client queries native device location coordinate sensors
- [ ] **MOB-02**: Mobile client prompts native biometrics check before punching in

### Security Checks
- [ ] **SEC-01**: Client checks secure network time API during punch-in
- [ ] **SEC-02**: Database enforces server-side transaction timestamp for check-ins

### Deployment Packaging
- [ ] **DEP-01**: Desktop app packaged as a Windows installer
- [ ] **DEP-02**: Mobile app compiled into a downloadable Android package

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 1 | Complete |
| ATT-01 | Phase 1 | Complete |
| ATT-02 | Phase 1 | Complete |
| ATT-03 | Phase 1 | Complete |
| ATT-04 | Phase 1 | Complete |
| ATT-05 | Phase 1 | Complete |
| ADMIN-01 | Phase 1 | Complete |
| ADMIN-02 | Phase 1 | Complete |
| ADMIN-03 | Phase 1 | Complete |
| ADMIN-04 | Phase 5 | Pending |
| ADMIN-05 | Phase 5 | Pending |
| LEAVE-01 | Phase 1 | Complete |
| MOB-01 | Phase 2 | Complete |
| MOB-02 | Phase 2 | Complete |
| SEC-01 | Phase 4 | Pending |
| SEC-02 | Phase 4 | Pending |
| DEP-01 | Phase 6 | Pending |
| DEP-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-08*
*Last updated: 2026-07-08 after initial definition*
