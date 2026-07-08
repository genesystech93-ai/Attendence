import AsyncStorage from '@react-native-async-storage/async-storage';

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
  lat: 12.9716, // Bengaluru Coordinates
  lng: 77.5946,
  geofenceRadius: 100, // 100 meters
  allowedWifiSSIDs: ['Office_HighSpeed', 'Office_Secure_5G', 'Workplace_WiFi'],
};

const generateMockLogs = (): AttendanceLog[] => {
  const logs: AttendanceLog[] = [];
  const today = new Date();
  
  for (let i = 5; i > 0; i--) {
    const logDate = new Date();
    logDate.setDate(today.getDate() - i);
    if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;
    
    const johnCheckIn = new Date(logDate);
    johnCheckIn.setHours(9, Math.floor(Math.random() * 20), 0);
    const johnCheckOut = new Date(logDate);
    johnCheckOut.setHours(18, Math.floor(Math.random() * 30), 0);
    
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
];

// In-memory Database state
let DB = {
  users: DEFAULT_USERS,
  officeConfig: DEFAULT_OFFICE,
  attendanceLogs: [] as AttendanceLog[],
  leaveRequests: DEFAULT_LEAVES,
  sessionUser: null as User | null
};

// Async helpers
const persist = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save state to AsyncStorage", e);
  }
};

export const dataService = {
  // Setup database asynchronously on launch
  async initialize(): Promise<void> {
    try {
      const usersRaw = await AsyncStorage.getItem('users');
      if (!usersRaw) {
        await AsyncStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
        await AsyncStorage.setItem('office_config', JSON.stringify(DEFAULT_OFFICE));
        await AsyncStorage.setItem('attendance_logs', JSON.stringify(generateMockLogs()));
        await AsyncStorage.setItem('leave_requests', JSON.stringify(DEFAULT_LEAVES));
        DB.users = DEFAULT_USERS;
        DB.officeConfig = DEFAULT_OFFICE;
        DB.attendanceLogs = generateMockLogs();
        DB.leaveRequests = DEFAULT_LEAVES;
      } else {
        DB.users = JSON.parse(usersRaw);
        DB.officeConfig = JSON.parse((await AsyncStorage.getItem('office_config')) || JSON.stringify(DEFAULT_OFFICE));
        DB.attendanceLogs = JSON.parse((await AsyncStorage.getItem('attendance_logs')) || '[]');
        DB.leaveRequests = JSON.parse((await AsyncStorage.getItem('leave_requests')) || '[]');
      }

      const sessionRaw = await AsyncStorage.getItem('session_user');
      if (sessionRaw) {
        DB.sessionUser = JSON.parse(sessionRaw);
      }
    } catch (e) {
      console.error("Initialization of mobile DB failed", e);
    }
  },

  // Auth Operations
  login(email: string): { user: User; error?: string } {
    const user = DB.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { user: null as any, error: 'User with this email not found' };
    }
    
    DB.sessionUser = user;
    persist('session_user', user);
    return { user };
  },

  logout() {
    DB.sessionUser = null;
    AsyncStorage.removeItem('session_user');
  },

  getCurrentUser(): User | null {
    return DB.sessionUser;
  },

  // Attendance Operations
  checkIn(
    userId: string, 
    wifiSSID: string, 
    ipAddress: string, 
    location?: { lat: number; lng: number }
  ): AttendanceLog {
    const user = DB.users.find(u => u.id === userId);
    const now = new Date();
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

    DB.attendanceLogs.unshift(newLog);
    persist('attendance_logs', DB.attendanceLogs);
    return newLog;
  },

  checkOut(userId: string): AttendanceLog | null {
    const activeLogIndex = DB.attendanceLogs.findIndex(
      (log) => log.userId === userId && !log.checkOut
    );

    if (activeLogIndex === -1) return null;

    const log = DB.attendanceLogs[activeLogIndex];
    const now = new Date();
    log.checkOut = now.toISOString();

    const checkInTime = new Date(log.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    log.durationMinutes = Math.floor(diffMs / 60000);

    DB.attendanceLogs[activeLogIndex] = log;
    persist('attendance_logs', DB.attendanceLogs);
    return log;
  },

  getActiveLog(userId: string): AttendanceLog | null {
    return DB.attendanceLogs.find((log) => log.userId === userId && !log.checkOut) || null;
  },

  getAttendanceLogs(userId?: string): AttendanceLog[] {
    if (userId) {
      return DB.attendanceLogs.filter((log) => log.userId === userId);
    }
    return DB.attendanceLogs;
  },

  // Leave Requests
  getLeaveRequests(userId?: string): LeaveRequest[] {
    if (userId) {
      return DB.leaveRequests.filter((l) => l.userId === userId);
    }
    return DB.leaveRequests;
  },

  submitLeaveRequest(
    userId: string,
    startDate: string,
    endDate: string,
    type: 'sick' | 'vacation' | 'casual',
    reason: string
  ): LeaveRequest {
    const user = DB.users.find(u => u.id === userId);

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

    DB.leaveRequests.unshift(newRequest);
    persist('leave_requests', DB.leaveRequests);
    return newRequest;
  },

  updateLeaveRequestStatus(requestId: string, status: 'approved' | 'rejected'): LeaveRequest | null {
    const index = DB.leaveRequests.findIndex((l) => l.id === requestId);
    if (index === -1) return null;
    
    DB.leaveRequests[index].status = status;
    persist('leave_requests', DB.leaveRequests);
    return DB.leaveRequests[index];
  },

  // Office Config
  getOfficeConfig(): OfficeConfig {
    return DB.officeConfig;
  },

  updateOfficeConfig(config: OfficeConfig): void {
    DB.officeConfig = config;
    persist('office_config', config);
  },

  getUsers(): User[] {
    return DB.users;
  }
};
