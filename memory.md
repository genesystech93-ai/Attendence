# Architecture Memory Map (Graphify)

This document visualizes the system's state machines, data patterns, and security guardrails using Mermaid graphs to preserve architectural structure.

---

## 🧭 1. Authentication & Session Flow

How the client manages login sessions and role-based views.

```mermaid
graph TD
    Start([User Opens App]) --> CheckSession{Has Local Session?}
    CheckSession -->|Yes| LoadSession[Load Session User Object]
    CheckSession -->|No| ShowLogin[Show Login Screen]
    
    ShowLogin --> ClickPreset[Select Preset Profile] --> LoginSuccess
    ShowLogin --> TypeEmail[Enter Email] --> SubmitLogin[Validate in dataService]
    
    SubmitLogin -->|User Found| LoginSuccess[Write session_user to LocalStorage]
    SubmitLogin -->|Not Found| ShowError[Display 'User Not Found' Error]
    
    LoginSuccess --> RedirectDash[Redirect to Dashboard]
    RedirectDash --> CheckRole{Is Admin?}
    CheckRole -->|Yes| UnlockAdmin[Show Admin Panel tab + Employee selector]
    CheckRole -->|No| LimitTab[Show Dashboard + Leave tabs only]
```

---

## 🔒 2. Check-In Security Validation Pipeline

The technical sequence applied during checking-in to guarantee that employees are physically inside the office and on company Wi-Fi.

```mermaid
flowchart TD
    ClickPunch([Click 'Punch In']) --> CheckBypass{Bypass Security checked?}
    
    %% Bypass Flow
    CheckBypass -->|Yes| RecordLog[Write Check-In Log to Database]
    
    %% Validation Flow
    CheckBypass -->|No| ReadSSID[Read Connected Wi-Fi SSID]
    ReadSSID --> VerifySSID{SSID matches OfficeConfig.allowedWifiSSIDs?}
    VerifySSID -->|No| BlockSSID[Block Punch: Show SSID Alert]
    
    VerifySSID -->|Yes| ReadGPS[Read Device GPS Lat/Lng]
    ReadGPS --> ComputeDistance[Calculate distance to Office Config center using Haversine formula]
    ComputeDistance --> VerifyDistance{Distance <= OfficeConfig.geofenceRadius?}
    
    VerifyDistance -->|No| BlockGPS[Block Punch: Show Geofence Alert]
    VerifyDistance -->|Yes| RecordLog
    
    RecordLog --> UpdateUI[Update Status: SHIFT ACTIVE + Start Ticking Timer]
```

---

## ⏱️ 3. Shift Active State & Duration Ticking

How the active shift clock computes real-time working hours.

```mermaid
stateDiagram-v2
    [*] --> OutOfShift : Logged Out / Checked Out
    OutOfShift --> InShift : checkIn() triggered
    
    state InShift {
        [*] --> InitializeTimer
        InitializeTimer --> TickingState : Start setInterval (1s loop)
        TickingState --> CalculateDiff : Read checkIn Timestamp
        CalculateDiff --> UpdateTimerText : Calculate hours:minutes:seconds
        UpdateTimerText --> TickingState : Delay 1000ms
    }
    
    InShift --> OutOfShift : checkOut() triggered
```

---

## 🗄️ 4. Local Database Persistence Model

Visual mapping of tables and key attributes currently managed in `localStorage` and slated for Supabase.

```mermaid
erDiagram
    users {
        string id PK
        string email
        string fullName
        string role "admin | employee"
        string avatarUrl
        string officeId FK
    }

    attendance_logs {
        string id PK
        string userId FK
        string userName
        string checkIn "ISO Date"
        string checkOut "ISO Date"
        string checkInIp
        string checkInWifi
        json checkInLocation "lat, lng"
        string status "present | late"
        int durationMinutes
    }

    leave_requests {
        string id PK
        string userId FK
        string userName
        string startDate "YYYY-MM-DD"
        string endDate "YYYY-MM-DD"
        string type "sick | vacation | casual"
        string status "pending | approved | rejected"
        string reason
    }

    office_config {
        string id PK
        string name
        float lat
        float lng
        int geofenceRadius "meters"
        stringallowedWifiSSIDs "array"
    }

    users ||--o{ attendance_logs : "creates"
    users ||--o{ leave_requests : "submits"
    office_config ||--o{ users : "governs"
```
