export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'employee' | 'admin';
  avatarUrl: string;
  officeId: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  checkIn: string; // ISO String
  checkOut?: string; // ISO String
  checkInIp: string;
  checkInWifi: string;
  checkInLocation?: { lat: number; lng: number };
  status: 'present' | 'late' | 'half_day';
  durationMinutes?: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: 'sick' | 'vacation' | 'casual';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface OfficeConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  geofenceRadius: number; // meters
  allowedWifiSSIDs: string[];
}

// Initial Mock Seed Data
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-1',
    email: 'admin@company.com',
    fullName: 'Sophia Miller',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    officeId: 'off-1',
  },
  {
    id: 'usr-2',
    email: 'john@company.com',
    fullName: 'John Doe',
    role: 'employee',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    officeId: 'off-1',
  },
  {
    id: 'usr-3',
    email: 'jane@company.com',
    fullName: 'Jane Smith',
    role: 'employee',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    officeId: 'off-1',
  },
];

const DEFAULT_OFFICE: OfficeConfig = {
  id: 'off-1',
  name: 'Headquarters Main Office',
  lat: 12.9716, // Bengaluru, India coords as default
  lng: 77.5946,
  geofenceRadius: 100, // 100 meters
  allowedWifiSSIDs: ['Office_HighSpeed', 'Office_Secure_5G', 'Workplace_WiFi'],
};

// Generates logs for the past 5 working days for John and Jane to make logs look full
const generateMockLogs = (): AttendanceLog[] => {
  const logs: AttendanceLog[] = [];
  const today = new Date();
  
  // 5 days back
  for (let i = 5; i > 0; i--) {
    const logDate = new Date();
    logDate.setDate(today.getDate() - i);
    
    // Skip weekends (0 is Sunday, 6 is Saturday)
    if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;
    
    // John's logs
    const johnCheckIn = new Date(logDate);
    johnCheckIn.setHours(9, Math.floor(Math.random() * 20), 0); // 9:00 - 9:20
    const johnCheckOut = new Date(logDate);
    johnCheckOut.setHours(18, Math.floor(Math.random() * 30), 0); // 18:00 - 18:30
    
    const diffJohnMs = johnCheckOut.getTime() - johnCheckIn.getTime();
    logs.push({
      id: `log-john-${i}`,
      userId: 'usr-2',
      userName: 'John Doe',
      checkIn: johnCheckIn.toISOString(),
      checkOut: johnCheckOut.toISOString(),
      checkInIp: '192.168.1.144',
      checkInWifi: 'Office_HighSpeed',
      checkInLocation: { lat: 12.9715, lng: 77.5945 },
      status: 'present',
      durationMinutes: Math.floor(diffJohnMs / 60000),
    });

    // Jane's logs - check in late on one day
    const janeCheckIn = new Date(logDate);
    const isLate = i === 2; // day 2 she is late
    janeCheckIn.setHours(isLate ? 10 : 8, isLate ? 15 : 50, 0); 
    const janeCheckOut = new Date(logDate);
    janeCheckOut.setHours(17, isLate ? 30 : 45, 0);

    const diffJaneMs = janeCheckOut.getTime() - janeCheckIn.getTime();
    logs.push({
      id: `log-jane-${i}`,
      userId: 'usr-3',
      userName: 'Jane Smith',
      checkIn: janeCheckIn.toISOString(),
      checkOut: janeCheckOut.toISOString(),
      checkInIp: '192.168.1.199',
      checkInWifi: 'Office_Secure_5G',
      checkInLocation: { lat: 12.9717, lng: 77.5947 },
      status: isLate ? 'late' : 'present',
      durationMinutes: Math.floor(diffJaneMs / 60000),
    });
  }

  return logs;
};

const DEFAULT_LEAVES: LeaveRequest[] = [
  {
    id: 'lv-1',
    userId: 'usr-2',
    userName: 'John Doe',
    startDate: '2026-07-15',
    endDate: '2026-07-16',
    type: 'vacation',
    status: 'pending',
    reason: 'Family vacation trip',
  },
  {
    id: 'lv-2',
    userId: 'usr-3',
    userName: 'Jane Smith',
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    type: 'sick',
    status: 'approved',
    reason: 'Severe fever and recovery',
  },
];

// LocalStorage helpers
const getStored = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw) as T;
};

const setStored = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const dataService = {
  // Setup database
  initialize() {
    getStored('users', DEFAULT_USERS);
    getStored('office_config', DEFAULT_OFFICE);
    getStored('attendance_logs', generateMockLogs());
    getStored('leave_requests', DEFAULT_LEAVES);
  },

  // Auth Operations
  login(email: string): { user: User; error?: string } {
    this.initialize();
    const users = getStored<User[]>('users', DEFAULT_USERS);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { user: null as any, error: 'User with this email not found' };
    }
    
    setStored('session_user', user);
    return { user };
  },

  logout() {
    localStorage.removeItem('session_user');
  },

  getCurrentUser(): User | null {
    const user = localStorage.getItem('session_user');
    return user ? JSON.parse(user) : null;
  },

  // Attendance Operations
  checkIn(
    userId: string, 
    wifiSSID: string, 
    ipAddress: string, 
    location?: { lat: number; lng: number }
  ): AttendanceLog {
    this.initialize();
    const logs = getStored<AttendanceLog[]>('attendance_logs', []);
    const users = getStored<User[]>('users', DEFAULT_USERS);
    const user = users.find(u => u.id === userId);
    
    const now = new Date();
    // Check if late (after 09:30 AM)
    const limit = new Date(now);
    limit.setHours(9, 30, 0);
    const status = now.getTime() > limit.getTime() ? 'late' : 'present';

    const newLog: AttendanceLog = {
      id: `log-${Date.now()}`,
      userId,
      userName: user ? user.fullName : 'Unknown User',
      checkIn: now.toISOString(),
      checkInIp: ipAddress,
      checkInWifi: wifiSSID,
      checkInLocation: location,
      status,
    };

    logs.unshift(newLog); // Put latest logs first
    setStored('attendance_logs', logs);
    return newLog;
  },

  checkOut(userId: string): AttendanceLog | null {
    this.initialize();
    const logs = getStored<AttendanceLog[]>('attendance_logs', []);
    // Find today's checkin log that doesn't have checkout
    const activeLogIndex = logs.findIndex(
      (log) => log.userId === userId && !log.checkOut
    );

    if (activeLogIndex === -1) return null;

    const log = logs[activeLogIndex];
    const now = new Date();
    log.checkOut = now.toISOString();

    const checkInTime = new Date(log.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    log.durationMinutes = Math.floor(diffMs / 60000);

    logs[activeLogIndex] = log;
    setStored('attendance_logs', logs);
    return log;
  },

  getActiveLog(userId: string): AttendanceLog | null {
    this.initialize();
    const logs = getStored<AttendanceLog[]>('attendance_logs', []);
    return logs.find((log) => log.userId === userId && !log.checkOut) || null;
  },

  getAttendanceLogs(userId?: string): AttendanceLog[] {
    this.initialize();
    const logs = getStored<AttendanceLog[]>('attendance_logs', []);
    if (userId) {
      return logs.filter((log) => log.userId === userId);
    }
    return logs;
  },

  // Leave Requests
  getLeaveRequests(userId?: string): LeaveRequest[] {
    this.initialize();
    const leaves = getStored<LeaveRequest[]>('leave_requests', []);
    if (userId) {
      return leaves.filter((l) => l.userId === userId);
    }
    return leaves;
  },

  submitLeaveRequest(
    userId: string,
    startDate: string,
    endDate: string,
    type: 'sick' | 'vacation' | 'casual',
    reason: string
  ): LeaveRequest {
    this.initialize();
    const leaves = getStored<LeaveRequest[]>('leave_requests', []);
    const users = getStored<User[]>('users', DEFAULT_USERS);
    const user = users.find(u => u.id === userId);

    const newRequest: LeaveRequest = {
      id: `lv-${Date.now()}`,
      userId,
      userName: user ? user.fullName : 'Unknown User',
      startDate,
      endDate,
      type,
      status: 'pending',
      reason,
    };

    leaves.unshift(newRequest);
    setStored('leave_requests', leaves);
    return newRequest;
  },

  updateLeaveRequestStatus(requestId: string, status: 'approved' | 'rejected'): LeaveRequest | null {
    this.initialize();
    const leaves = getStored<LeaveRequest[]>('leave_requests', []);
    const index = leaves.findIndex((l) => l.id === requestId);
    
    if (index === -1) return null;
    
    leaves[index].status = status;
    setStored('leave_requests', leaves);
    return leaves[index];
  },

  // Office Config
  getOfficeConfig(): OfficeConfig {
    this.initialize();
    return getStored<OfficeConfig>('office_config', DEFAULT_OFFICE);
  },

  updateOfficeConfig(config: OfficeConfig): void {
    setStored('office_config', config);
  },

  // Helper to add mock users
  getUsers(): User[] {
    this.initialize();
    return getStored<User[]>('users', DEFAULT_USERS);
  }
};
