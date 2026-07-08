import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
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
  shiftStartTime: string; // HH:mm:ss
  shiftEndTime: string; // HH:mm:ss
  holidays: string[]; // YYYY-MM-DD
}

// --------------------------------------------------------------------
// Supabase Client Setup
// --------------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key';

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --------------------------------------------------------------------
// Time Security: Network Time Verification
// --------------------------------------------------------------------
const TIME_DRIFT_THRESHOLD_MS = 10_000; // 10 seconds

interface NetworkTimeResult {
  networkTime: Date;
  localTime: Date;
  driftMs: number;
  source: 'worldtimeapi' | 'local_fallback';
}

async function fetchNetworkTime(): Promise<NetworkTimeResult> {
  const localTime = new Date();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const networkTime = new Date(data.utc_datetime || data.datetime);
    const driftMs = Math.abs(localTime.getTime() - networkTime.getTime());
    
    return { networkTime, localTime, driftMs, source: 'worldtimeapi' };
  } catch (err) {
    console.warn('Attendy TimeGuard: WorldTimeAPI unreachable, using local clock.', err);
    return { networkTime: localTime, localTime, driftMs: 0, source: 'local_fallback' };
  }
}

async function getVerifiedTimestamp(): Promise<{ timestamp: Date; warning?: string }> {
  const result = await fetchNetworkTime();
  
  if (result.driftMs > TIME_DRIFT_THRESHOLD_MS && result.source !== 'local_fallback') {
    const driftSec = (result.driftMs / 1000).toFixed(1);
    const warning = `⚠️ Clock drift detected: ${driftSec}s out of sync. Server timestamp will be used.`;
    console.warn(`Attendy TimeGuard: ${warning}`);
    return { timestamp: result.networkTime, warning };
  }
  
  return { timestamp: result.networkTime };
}

export { fetchNetworkTime, getVerifiedTimestamp };

if (supabase) {
  console.log("Attendy Mobile: Running in Cloud Sync mode (Connected to Supabase)");
} else {
  console.log("Attendy Mobile: Running in Offline Local mode (Bypassing Supabase)");
}

// Initial Mock Seed Data
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'genesoft',
    fullName: 'Super Admin',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    officeId: 'off-1',
  },
  {
    id: 'usr-2',
    username: 'john',
    fullName: 'John Doe',
    role: 'employee',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    officeId: 'off-1',
  },
  {
    id: 'usr-3',
    username: 'jane',
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
  geofenceRadius: 100,
  allowedWifiSSIDs: ['Office_HighSpeed', 'Office_Guest'],
  shiftStartTime: '09:30:00',
  shiftEndTime: '18:30:00',
  holidays: ['2026-12-25', '2026-01-01']
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

// In-memory Database state (for offline operations)
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

  async login(username: string, password?: string): Promise<{ user: User; error?: string }> {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .single();

      if (error || !data) {
        return { user: null as any, error: 'Invalid username' };
      }

      if (password && data.password !== password) {
        return { user: null as any, error: 'Invalid password' };
      }
      
      const mappedUser: User = {
        id: data.id,
        username: data.username,
        fullName: data.full_name,
        role: data.role,
        avatarUrl: data.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        officeId: data.office_id || 'off-1',
      };
      
      DB.sessionUser = mappedUser;
      await persist('session_user', mappedUser);
      return { user: mappedUser };
    } else {
      await this.initialize();
      const user = DB.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      if (!user) return { user: null as any, error: 'Invalid username' };
      
      if (password && user.role === 'admin' && password !== 'SURAJmagar@9890') {
          return { user: null as any, error: 'Invalid admin password' };
      }

      DB.sessionUser = user;
      await persist('session_user', user);
      return { user };
    }
  },

  logout() {
    DB.sessionUser = null;
    AsyncStorage.removeItem('session_user');
  },

  getCurrentUser(): User | null {
    return DB.sessionUser;
  },

  // Attendance Operations
  async checkIn(
    userId: string, 
    wifiSSID: string, 
    ipAddress: string, 
    location?: { lat: number; lng: number }
  ): Promise<AttendanceLog & { timeWarning?: string }> {
    // Fetch active office config to get dynamic shift start time
    const officeConfig = await this.getOfficeConfig();
    
    // TIME SECURITY: Use network-verified timestamp
    const { timestamp: now, warning: timeWarning } = await getVerifiedTimestamp();
    
    // Parse dynamic shiftStartTime (e.g. "09:30:00")
    const [hours, minutes, seconds] = officeConfig.shiftStartTime.split(':').map(Number);
    const limit = new Date(now);
    limit.setHours(hours || 9, minutes || 30, seconds || 0);
    const status = now.getTime() > limit.getTime() ? 'late' : 'present';

    if (supabase) {
      const { data: userProfile } = await supabase.from('users').select('full_name').eq('id', userId).single();
      const newLogObj = {
        user_id: userId,
        check_in: now.toISOString(),
        check_in_ip: ipAddress,
        check_in_wifi: wifiSSID,
        check_in_location: location,
        status: status,
      };

      const { data, error } = await supabase.from('attendance_logs').insert(newLogObj).select().single();
      if (error) throw error;
      
      return {
        id: data.id,
        userId: data.user_id,
        userName: userProfile?.full_name || 'Unknown User',
        checkIn: data.check_in,
        checkInIp: data.check_in_ip,
        checkInWifi: data.check_in_wifi,
        checkInLocation: data.check_in_location,
        status: data.status,
        timeWarning
      };
    } else {
      const user = DB.users.find(u => u.id === userId);
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
      await persist('attendance_logs', DB.attendanceLogs);
      return { ...newLog, timeWarning };
    }
  },

  async checkOut(userId: string): Promise<AttendanceLog | null> {
    // TIME SECURITY: Use network-verified timestamp
    const { timestamp: now } = await getVerifiedTimestamp();

    if (supabase) {
      const { data: activeLog, error: findError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1)
        .single();

      if (findError || !activeLog) return null;

      const checkInTime = new Date(activeLog.check_in);
      const diffMs = now.getTime() - checkInTime.getTime();
      const durationMins = Math.floor(diffMs / 60000);

      const { data, error } = await supabase
        .from('attendance_logs')
        .update({
          check_out: now.toISOString(),
          duration_minutes: durationMins,
        })
        .eq('id', activeLog.id)
        .select()
        .single();

      if (error) throw error;

      const { data: userProfile } = await supabase.from('users').select('full_name').eq('id', userId).single();

      return {
        id: data.id,
        userId: data.user_id,
        userName: userProfile?.full_name || 'Unknown User',
        checkIn: data.check_in,
        checkOut: data.check_out,
        checkInIp: data.check_in_ip,
        checkInWifi: data.check_in_wifi,
        checkInLocation: data.check_in_location,
        status: data.status,
        durationMinutes: data.duration_minutes,
      };
    } else {
      const activeLogIndex = DB.attendanceLogs.findIndex(
        (log) => log.userId === userId && !log.checkOut
      );

      if (activeLogIndex === -1) return null;

      const log = DB.attendanceLogs[activeLogIndex];
      log.checkOut = now.toISOString();

      const checkInTime = new Date(log.checkIn);
      const diffMs = now.getTime() - checkInTime.getTime();
      log.durationMinutes = Math.floor(diffMs / 60000);

      DB.attendanceLogs[activeLogIndex] = log;
      await persist('attendance_logs', DB.attendanceLogs);
      return log;
    }
  },

  async getActiveLog(userId: string): Promise<AttendanceLog | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return null;

      const { data: userProfile } = await supabase.from('users').select('full_name').eq('id', userId).single();

      return {
        id: data[0].id,
        userId: data[0].user_id,
        userName: userProfile?.full_name || 'Unknown User',
        checkIn: data[0].check_in,
        checkInIp: data[0].check_in_ip,
        checkInWifi: data[0].check_in_wifi,
        checkInLocation: data[0].check_in_location,
        status: data[0].status,
      };
    } else {
      return DB.attendanceLogs.find((log) => log.userId === userId && !log.checkOut) || null;
    }
  },

  async getAttendanceLogs(userId?: string): Promise<AttendanceLog[]> {
    if (supabase) {
      let query = supabase.from('attendance_logs').select('*, users(full_name)').order('check_in', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error) throw error;

      return data.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.users?.full_name || 'Unknown',
        checkIn: log.check_in,
        checkOut: log.check_out,
        checkInIp: log.check_in_ip,
        checkInWifi: log.check_in_wifi,
        checkInLocation: log.check_in_location,
        status: log.status,
        durationMinutes: log.duration_minutes,
      }));
    } else {
      if (userId) {
        return DB.attendanceLogs.filter((log) => log.userId === userId);
      }
      return DB.attendanceLogs;
    }
  },

  // Leave Requests
  async getLeaveRequests(userId?: string): Promise<LeaveRequest[]> {
    if (supabase) {
      let query = supabase.from('leave_requests').select('*, users(full_name)').order('start_date', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error) throw error;

      return data.map((req: any) => ({
        id: req.id,
        userId: req.user_id,
        userName: req.users?.full_name || 'Unknown',
        startDate: req.start_date,
        endDate: req.end_date,
        type: req.type,
        status: req.status,
        reason: req.reason,
      }));
    } else {
      if (userId) {
        return DB.leaveRequests.filter((l) => l.userId === userId);
      }
      return DB.leaveRequests;
    }
  },

  async submitLeaveRequest(
    userId: string,
    startDate: string,
    endDate: string,
    type: 'sick' | 'vacation' | 'casual',
    reason: string
  ): Promise<LeaveRequest> {
    if (supabase) {
      const newReq = {
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        type,
        status: 'pending',
        reason,
      };

      const { data, error } = await supabase.from('leave_requests').insert(newReq).select().single();
      if (error) throw error;

      const { data: userProfile } = await supabase.from('users').select('full_name').eq('id', userId).single();

      return {
        id: data.id,
        userId: data.user_id,
        userName: userProfile?.full_name || 'Unknown User',
        startDate: data.start_date,
        endDate: data.end_date,
        type: data.type,
        status: data.status,
        reason: data.reason,
      };
    } else {
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
      await persist('leave_requests', DB.leaveRequests);
      return newRequest;
    }
  },

  async updateLeaveRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<LeaveRequest | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      const { data: userProfile } = await supabase.from('users').select('full_name').eq('id', data.user_id).single();

      return {
        id: data.id,
        userId: data.user_id,
        userName: userProfile?.full_name || 'Unknown User',
        startDate: data.start_date,
        endDate: data.end_date,
        type: data.type,
        status: data.status,
        reason: data.reason,
      };
    } else {
      const index = DB.leaveRequests.findIndex((l) => l.id === requestId);
      if (index === -1) return null;
      
      DB.leaveRequests[index].status = status;
      await persist('leave_requests', DB.leaveRequests);
      return DB.leaveRequests[index];
    }
  },

  // Office Config
  async getOfficeConfig(): Promise<OfficeConfig> {
    if (supabase) {
      const { data, error } = await supabase.from('offices').select('*').limit(1);
      if (error || !data || data.length === 0) {
        return DB.officeConfig;
      }
      return {
        id: data[0].id,
        name: data[0].name,
        lat: data[0].lat,
        lng: data[0].lng,
        geofenceRadius: data[0].geofence_radius,
        allowedWifiSSIDs: data[0].allowed_wifi_ssids,
        shiftStartTime: data[0].shift_start_time || '09:30:00',
        shiftEndTime: data[0].shift_end_time || '18:30:00',
        holidays: data[0].holidays || []
      };
    } else {
      return DB.officeConfig;
    }
  },

  async updateOfficeConfig(config: OfficeConfig): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('offices')
        .upsert({
          id: config.id === 'off-1' ? undefined : config.id,
          name: config.name,
          lat: config.lat,
          lng: config.lng,
          geofence_radius: config.geofenceRadius,
          allowed_wifi_ssids: config.allowedWifiSSIDs,
          shift_start_time: config.shiftStartTime,
          shift_end_time: config.shiftEndTime,
          holidays: config.holidays
        });
      if (error) throw error;
    } else {
      DB.officeConfig = config;
      await persist('office_config', config);
    }
  },

  getUsers(): User[] {
    return DB.users;
  }
};
