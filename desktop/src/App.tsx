import { useState, useEffect, useRef } from "react";
import { dataService, User, AttendanceLog, LeaveRequest, OfficeConfig } from "./services/dataService";
import { CalendarView } from "./components/CalendarView";
import { AdminUserManagement } from "./components/AdminUserManagement";
import "./App.css";
import gtDarkLogo from "./assets/gt-dark.png";
import gtIconLogo from "./assets/gt-icon.png";

// Haversine formula to compute distance in meters between two points
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

function App() {
  // Navigation & User Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "leaves" | "calendar" | "admin">("dashboard");
  
  // Real-time ticking Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Active shift timer
  const [activeDurationText, setActiveDurationText] = useState<string>("00:00:00");
  const [activeLog, setActiveLog] = useState<AttendanceLog | null>(null);
  
  // App data lists
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState({ totalHours: 0, lateCount: 0, totalLogs: 0 });
  
  // Login Form States
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Attendance Simulation States
  const [simulatedSSID, setSimulatedSSID] = useState("Office_HighSpeed");
  const [simulatedIP, setSimulatedIP] = useState("192.168.1.12");
  const [simulatedLat, setSimulatedLat] = useState(12.97165); // Just 5 meters off the office lat (12.9716)
  const [simulatedLng, setSimulatedLng] = useState(77.59462); // Just 2 meters off the office lng (77.5946)
  const [bypassChecks, setBypassChecks] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);

  // New Leave Form States
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState<"sick" | "vacation" | "casual">("vacation");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState(false);

  // Admin Config Form States
  const [adminOfficeName, setAdminOfficeName] = useState("");
  const [adminOfficeLat, setAdminOfficeLat] = useState(12.9716);
  const [adminOfficeLng, setAdminOfficeLng] = useState(77.5946);
  const [adminOfficeRadius, setAdminOfficeRadius] = useState(100);
  const [adminOfficeWifiRaw, setAdminOfficeWifiRaw] = useState("");
  const [adminShiftStart, setAdminShiftStart] = useState("09:30:00");
  const [adminShiftEnd, setAdminShiftEnd] = useState("18:30:00");
  const [adminHolidaysRaw, setAdminHolidaysRaw] = useState("");
  const [adminSuccessMsg, setAdminSuccessMsg] = useState("");

  // Refs for tracking timer loops
  const timerRef = useRef<number | null>(null);
  const activeLogRef = useRef<AttendanceLog | null>(null);

  // Sync ref to state
  useEffect(() => {
    activeLogRef.current = activeLog;
  }, [activeLog]);

  // Boot up initialization
  useEffect(() => {
    const initApp = async () => {
      dataService.initialize();
      const user = dataService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    initApp();
    
    // Ticking current date/time clock
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fetch data on login or session load
  useEffect(() => {
    if (currentUser) {
      refreshData();
      
      // Setup dynamic ticking work duration timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = window.setInterval(() => {
        const currentActive = activeLogRef.current;
        if (currentActive) {
          const checkInDate = new Date(currentActive.checkIn);
          const diffMs = new Date().getTime() - checkInDate.getTime();
          const totalSecs = Math.floor(diffMs / 1000);
          
          const hours = Math.floor(totalSecs / 3600);
          const minutes = Math.floor((totalSecs % 3600) / 60);
          const seconds = totalSecs % 60;
          
          const pad = (num: number) => num.toString().padStart(2, "0");
          setActiveDurationText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        } else {
          setActiveDurationText("00:00:00");
        }
      }, 1000);
    }
  }, [currentUser]);

  const refreshData = async () => {
    if (!currentUser) return;
    try {
      const config = await dataService.getOfficeConfig();
      setOfficeConfig(config);

      // Seed admin fields
      setAdminOfficeName(config.name);
      setAdminOfficeLat(config.lat);
      setAdminOfficeLng(config.lng);
      setAdminOfficeRadius(config.geofenceRadius);
      setAdminOfficeWifiRaw(config.allowedWifiSSIDs.join(", "));
      setAdminShiftStart(config.shiftStartTime);
      setAdminShiftEnd(config.shiftEndTime);
      setAdminHolidaysRaw(config.holidays.join(", "));

      // Fetch active log
      const active = await dataService.getActiveLog(currentUser.id);
      setActiveLog(active);

      // Attendance logs (for admin - see all; for employee - see own)
      if (currentUser.role === "admin") {
        const [logs, leaves, summary] = await Promise.all([
          dataService.getAttendanceLogs(),
          dataService.getLeaveRequests(),
          dataService.getAttendanceSummary()
        ]);
        setAttendanceLogs(logs);
        setLeaveRequests(leaves);
        setAttendanceSummary(summary);
      } else {
        const [logs, leaves] = await Promise.all([
          dataService.getAttendanceLogs(currentUser.id),
          dataService.getLeaveRequests(currentUser.id)
        ]);
        setAttendanceLogs(logs);
        setLeaveRequests(leaves);
      }
    } catch (e) {
      console.error("Failed to refresh dashboard data", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername) {
      setLoginError("Please enter your username");
      return;
    }
    const { user, error } = await dataService.login(loginUsername, loginPassword);
    if (error) {
      setLoginError(error);
    } else {
      setLoginError("");
      setCurrentUser(user);
      setActiveTab("dashboard");
    }
  };



  const handleLogout = () => {
    dataService.logout();
    setCurrentUser(null);
  };

  // Perform Check In with security validation
  const handleCheckIn = async () => {
    if (!currentUser || !officeConfig) return;
    setClockError(null);

    if (!bypassChecks) {
      // 1. Wi-Fi Verification
      const wifiMatch = officeConfig.allowedWifiSSIDs.some(
        (ssid) => ssid.trim().toLowerCase() === simulatedSSID.trim().toLowerCase()
      );
      if (!wifiMatch) {
        setClockError(
          `Security Alert: Check-in blocked. SSID "${simulatedSSID}" is not an authorized office network.`
        );
        return;
      }

      // 2. Geofence Distance Check
      const distance = getDistanceMeters(
        simulatedLat,
        simulatedLng,
        officeConfig.lat,
        officeConfig.lng
      );
      if (distance > officeConfig.geofenceRadius) {
        setClockError(
          `Security Alert: Check-in blocked. You are currently ${Math.round(
            distance
          )}m away from the office. Geofencing radius is set to ${officeConfig.geofenceRadius}m.`
        );
        return;
      }
    }

    try {
      // Success - trigger write
      await dataService.checkIn(
        currentUser.id,
        simulatedSSID,
        simulatedIP,
        { lat: simulatedLat, lng: simulatedLng }
      );
      await refreshData();
    } catch (e: any) {
      setClockError(e.message || "Failed to check in.");
    }
  };

  // Handle Checkout
  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      await dataService.checkOut(currentUser.id);
      await refreshData();
    } catch (e: any) {
      setClockError(e.message || "Failed to check out.");
    }
  };

  // Handle Submit Leave Request
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!leaveStart || !leaveEnd || !leaveReason) {
      return;
    }

    try {
      await dataService.submitLeaveRequest(
        currentUser.id,
        leaveStart,
        leaveEnd,
        leaveType,
        leaveReason
      );
      setLeaveSuccess(true);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      await refreshData();

      setTimeout(() => {
        setLeaveSuccess(false);
      }, 4000);
    } catch (e) {
      console.error("Failed to submit leave", e);
    }
  };

  // Admin: update config
  const handleSaveOfficeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== "admin") return;

    try {
      await dataService.updateOfficeConfig({
        id: officeConfig?.id || 'off-1',
        name: adminOfficeName,
        lat: adminOfficeLat,
        lng: adminOfficeLng,
        geofenceRadius: adminOfficeRadius,
        allowedWifiSSIDs: adminOfficeWifiRaw.split(',').map(s => s.trim()).filter(s => s),
        shiftStartTime: adminShiftStart,
        shiftEndTime: adminShiftEnd,
        holidays: adminHolidaysRaw.split(',').map(s => s.trim()).filter(s => s)
      });
      setAdminSuccessMsg("Settings saved successfully.");
      setTimeout(() => setAdminSuccessMsg(""), 3000);
      refreshData();
    } catch (e: any) {
      alert("Error saving: " + e.message);
    }
  };

  const handleDownloadCSV = () => {
    dataService.exportToCSV(attendanceLogs);
  };

  // Admin: Approve/Reject Leave requests
  const handleLeaveStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    try {
      await dataService.updateLeaveRequestStatus(id, status);
      await refreshData();
    } catch (e) {
      console.error("Failed to update leave status", e);
    }
  };

  // Calculations for stats dashboard cards
  const calculateTotalHours = () => {
    const userLogs = attendanceLogs.filter((log) => log.userId === (currentUser?.role === "admin" ? "usr-2" : currentUser?.id));
    const totalMins = userLogs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);
    return (totalMins / 60).toFixed(1);
  };

  const calculateLateDays = () => {
    const userLogs = attendanceLogs.filter((log) => log.userId === (currentUser?.role === "admin" ? "usr-2" : currentUser?.id));
    return userLogs.filter((log) => log.status === "late").length;
  };

  // Helper date formatted string
  const formatDateString = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatHours = (mins?: number) => {
    if (!mins) return "--";
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  };

  // SVG Icons definition to keep compile clean and layout light
  const icons = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ),
    leaves: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    admin: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    logout: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    clock: (
      <svg className="clock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    globe: (
      <svg className="w-4 h-4 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  };

  // Render Login state if not authenticated
  if (!currentUser) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel fade-in">
          <img src={gtIconLogo} alt="Genesoft Infotech" className="login-logo" />
          <h2>Genesoft Infotech</h2>
          <p>Sign in using employee email credentials to check in</p>
          
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
              <label>Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              {loginError && <span className="error-text" style={{ marginTop: "8px", display: "block" }}>{loginError}</span>}
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "8px" }}>
              Secure Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render main layout
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar glass-panel">
        <div>
          <div className="brand-section">
            <img src={gtDarkLogo} alt="Genesoft Infotech" className="brand-logo" />
          </div>
          
          <div className="nav-menu">
            <div
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              {icons.dashboard}
              <span>Dashboard</span>
            </div>
            
            <div
              className={`nav-item ${activeTab === "leaves" ? "active" : ""}`}
              onClick={() => setActiveTab("leaves")}
            >
              {icons.leaves}
              <span>My Leaves</span>
            </div>

            <div
              className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              {icons.clock}
              <span>Calendar</span>
            </div>

            {currentUser.role === "admin" && (
              <div
                className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                {icons.admin}
                <span>Admin Panel</span>
              </div>
            )}
          </div>
        </div>

        {/* User profile footer */}
        <div className="user-profile-badge">
          <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="avatar" />
          <div className="user-info">
            <div className="user-name">{currentUser.fullName}</div>
            <div className="user-role">{currentUser.role}</div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Log Out">
            {icons.logout}
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-content">
        {/* Header section */}
        <div className="content-header fade-in">
          <div className="welcome-msg">
            <h2>Welcome back, {currentUser.fullName.split(" ")[0]}</h2>
            <p>
              {currentUser.role === "admin"
                ? "System Status: Online. Operational dashboard active."
                : "Confirm attendance by punching in below."}
            </p>
          </div>

          <div className="live-clock-badge">
            {icons.clock}
            <span>
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        </div>

        {/* Tabs Router */}
        {activeTab === "dashboard" && (
          <div className="fade-in" style={{ animationDelay: "0.1s" }}>
            
            {/* Stats Row */}
            <div className="stats-row">
              <div className="stat-card glass-panel">
                <div className="stat-icon-wrapper purple">⏰</div>
                <div className="stat-meta">
                  <span className="stat-val">{calculateTotalHours()} hrs</span>
                  <span className="stat-label">Hours Logged This Month</span>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-icon-wrapper cyan">⚠️</div>
                <div className="stat-meta">
                  <span className="stat-val">{calculateLateDays()} days</span>
                  <span className="stat-label">Late Clock-Ins</span>
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-icon-wrapper emerald">📅</div>
                <div className="stat-meta">
                  <span className="stat-val">12 days</span>
                  <span className="stat-label">Leaves Remaining</span>
                </div>
              </div>
            </div>

            {/* Dashboard grid (Check-in widget & Simulators) */}
            <div className="dashboard-grid">
              
              {/* Check-in Widget */}
              <div className="glass-panel check-in-widget">
                {!activeLog ? (
                  <>
                    <button className="action-circle-btn glow-pulse" onClick={handleCheckIn}>
                      <span>Punch In</span>
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                    <div className="status-label">NOT CLOCKED IN</div>
                  </>
                ) : (
                  <>
                    <button className="action-circle-btn checked-in" onClick={handleCheckOut}>
                      <span>Punch Out</span>
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                    <div className="timer-display">{activeDurationText}</div>
                    <div className="status-label" style={{ color: "#34d399" }}>SHIFTACTIVE</div>
                  </>
                )}

                {clockError && (
                  <div className="error-text" style={{ padding: "0 24px", marginTop: "16px", textAlign: "center" }}>
                    {clockError}
                  </div>
                )}
              </div>

              {/* Simulation Environment Control panel */}
              <div className="glass-panel simulator-panel" style={{ padding: "24px" }}>
                <h4 className="simulator-title">
                  {icons.globe} Device Sensors Simulator
                </h4>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label>SSID (Wi-Fi)</label>
                    <select 
                      className="form-select"
                      value={simulatedSSID}
                      onChange={(e) => setSimulatedSSID(e.target.value)}
                      disabled={!!activeLog}
                    >
                      <option value="Office_HighSpeed">Office_HighSpeed (Valid)</option>
                      <option value="Office_Secure_5G">Office_Secure_5G (Valid)</option>
                      <option value="Home_WiFi_2.4G">Home_WiFi_2.4G (Invalid)</option>
                      <option value="Starbucks_Guest">Starbucks_Guest (Invalid)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Simulated IP</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={simulatedIP} 
                      onChange={(e) => setSimulatedIP(e.target.value)}
                      disabled={!!activeLog}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label>Latitude</label>
                    <input 
                      type="number" 
                      step="0.00001"
                      className="form-input" 
                      value={simulatedLat} 
                      onChange={(e) => setSimulatedLat(parseFloat(e.target.value))}
                      disabled={!!activeLog}
                    />
                  </div>

                  <div className="form-group">
                    <label>Longitude</label>
                    <input 
                      type="number" 
                      step="0.00001"
                      className="form-input" 
                      value={simulatedLng} 
                      onChange={(e) => setSimulatedLng(parseFloat(e.target.value))}
                      disabled={!!activeLog}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    id="bypass-security"
                    checked={bypassChecks}
                    onChange={(e) => setBypassChecks(e.target.checked)}
                    disabled={!!activeLog}
                  />
                  <label htmlFor="bypass-security" style={{ fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                    Bypass Geofence & SSID Checks
                  </label>
                </div>
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="glass-panel logs-section">
              <div className="logs-header">
                <h3>Attendance Log History</h3>
                <span className="badge present">Synced Offline</span>
              </div>
              
              <div className="table-wrapper">
                {attendanceLogs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No check-ins recorded yet.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        {currentUser.role === "admin" && <th>Employee</th>}
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Network SSID</th>
                        <th>IP Address</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLogs.map((log) => (
                        <tr key={log.id}>
                          {currentUser.role === "admin" && <td>{log.userName}</td>}
                          <td>{formatDateString(log.checkIn)}</td>
                          <td>{log.checkOut ? formatDateString(log.checkOut) : "--"}</td>
                          <td>{log.checkInWifi}</td>
                          <td>{log.checkInIp}</td>
                          <td>{formatHours(log.durationMinutes)}</td>
                          <td>
                            <span className={`badge ${log.status}`}>
                              {log.status === "late" ? "Late" : "On Time"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <CalendarView 
            logs={attendanceLogs}
            holidays={officeConfig?.holidays || []}
            isAdmin={currentUser.role === 'admin'}
            currentUserId={currentUser.id}
          />
        )}

        {/* Leaves Tab */}
        {activeTab === "leaves" && (
          <div className="fade-in leaves-grid">
            {/* Request Form */}
            <div className="glass-panel leaves-form-card">
              <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Request Leave</h3>
              <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div className="form-group">
                  <label>Leave Type</label>
                  <select 
                    className="form-select"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="vacation">Vacation Leave</option>
                    <option value="casual">Casual Leave</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason / Details</label>
                  <textarea 
                    rows={4}
                    className="form-textarea" 
                    placeholder="Provide details about your leave request..."
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary">
                  Submit Request
                </button>

                {leaveSuccess && (
                  <div style={{ color: "#34d399", fontSize: "0.85rem", textAlign: "center", marginTop: "4px" }}>
                    Leave request submitted successfully!
                  </div>
                )}
              </form>
            </div>

            {/* Leave History List */}
            <div className="glass-panel leaves-list-card">
              <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Leave History</h3>
              <div className="table-wrapper">
                {leaveRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No leave requests found.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        {currentUser.role === "admin" && <th>Employee</th>}
                        <th>Type</th>
                        <th>Period</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((req) => (
                        <tr key={req.id}>
                          {currentUser.role === "admin" && <td>{req.userName}</td>}
                          <td style={{ textTransform: "capitalize" }}>{req.type}</td>
                          <td style={{ fontSize: "0.85rem" }}>
                            {req.startDate} to {req.endDate}
                          </td>
                          <td>
                            <span className={`badge ${req.status}`}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "#94a3b8", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.reason}>
                            {req.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Tab (Protected) */}
        {activeTab === "admin" && currentUser.role === "admin" && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Analytics Dashboard */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Workforce Analytics</h3>
                <button className="btn-primary" onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Download CSV Report
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                    {icons.clock}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{attendanceSummary.totalHours} hrs</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Hours Logged</div>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{attendanceSummary.lateCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Late Check-Ins</div>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{attendanceSummary.totalLogs}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Check-Ins</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-grid">
              <AdminUserManagement />
              
              <div className="admin-header-row">
                {/* Geofence and Configuration Settings */}
                <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Office Location Configurations</h3>
                <form onSubmit={handleSaveOfficeConfig} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  <div className="form-group">
                    <label>Office Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={adminOfficeName}
                      onChange={(e) => setAdminOfficeName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label>Center Latitude</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        className="form-input" 
                        value={adminOfficeLat}
                        onChange={(e) => setAdminOfficeLat(parseFloat(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Center Longitude</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        className="form-input" 
                        value={adminOfficeLng}
                        onChange={(e) => setAdminOfficeLng(parseFloat(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label>Geofence Radius (meters)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={adminOfficeRadius}
                        onChange={(e) => setAdminOfficeRadius(parseInt(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Authorized SSIDs (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={adminOfficeWifiRaw}
                        onChange={(e) => setAdminOfficeWifiRaw(e.target.value)}
                        placeholder="SSID1, SSID2"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label>Shift Start Time (HH:mm:ss)</label>
                      <input 
                        type="time" 
                        step="1"
                        className="form-input" 
                        value={adminShiftStart}
                        onChange={(e) => setAdminShiftStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Shift End Time (HH:mm:ss)</label>
                      <input 
                        type="time" 
                        step="1"
                        className="form-input" 
                        value={adminShiftEnd}
                        onChange={(e) => setAdminShiftEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Holidays (comma separated YYYY-MM-DD)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={adminHolidaysRaw}
                      onChange={(e) => setAdminHolidaysRaw(e.target.value)}
                      placeholder="2026-12-25, 2026-01-01"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Save Configurations
                  </button>

                  {adminSuccessMsg && (
                    <div style={{ color: "#34d399", fontSize: "0.85rem", textAlign: "center", marginTop: "4px" }}>
                      {adminSuccessMsg}
                    </div>
                  )}
                </form>
              </div>

              {/* Leave Approvals Console */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Leave Requests Approval Panel</h3>
                <div className="table-wrapper" style={{ maxHeight: "300px" }}>
                  {leaveRequests.filter(r => r.status === "pending").length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      No pending leave requests.
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Leave Detail</th>
                          <th>Reason</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests
                          .filter((req) => req.status === "pending")
                          .map((req) => (
                            <tr key={req.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{req.userName}</div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "capitalize" }}>{req.type}</div>
                              </td>
                              <td style={{ fontSize: "0.85rem" }}>
                                {req.startDate} to {req.endDate}
                              </td>
                              <td style={{ fontSize: "0.8rem", color: "#94a3b8", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.reason}>
                                {req.reason}
                              </td>
                              <td>
                                <div style={{ display: "flex" }}>
                                  <button
                                    className="action-btn-small approve"
                                    onClick={() => handleLeaveStatusUpdate(req.id, "approved")}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="action-btn-small reject"
                                    onClick={() => handleLeaveStatusUpdate(req.id, "rejected")}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
