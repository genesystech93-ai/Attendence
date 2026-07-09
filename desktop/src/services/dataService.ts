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
  autoCheckoutTime?: string; // HH:mm:ss
  holidays: string[]; // YYYY-MM-DD
}

// --------------------------------------------------------------------
// Supabase Client Setup
// --------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

/**
 * Fetch current UTC time from WorldTimeAPI for tamper-proof clock verification.
 * Falls back to local system time if the API is unreachable.
 */
async function fetchNetworkTime(): Promise<NetworkTimeResult> {
  const localTime = new Date();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
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
    console.warn('Attendy TimeGuard: WorldTimeAPI unreachable, using local clock as fallback.', err);
    return { networkTime: localTime, localTime, driftMs: 0, source: 'local_fallback' };
  }
}

/**
 * Get a verified timestamp for attendance operations.
 * Throws an alert-style error if clock drift exceeds the threshold.
 */
async function getVerifiedTimestamp(): Promise<{ timestamp: Date; warning?: string }> {
  const result = await fetchNetworkTime();
  
  if (result.driftMs > TIME_DRIFT_THRESHOLD_MS && result.source !== 'local_fallback') {
    const driftSec = (result.driftMs / 1000).toFixed(1);
    const warning = `⚠️ Clock drift detected: Your system clock is ${driftSec}s out of sync with network time. The server-verified timestamp will be used.`;
    console.warn(`Attendy TimeGuard: ${warning}`);
    return { timestamp: result.networkTime, warning };
  }
  
  return { timestamp: result.networkTime };
}

// Export for UI consumption (drift alert display)
export { fetchNetworkTime, getVerifiedTimestamp };

if (supabase) {
  console.log("Attendy: Running in Cloud Sync mode (Connected to Supabase)");
} else {
  console.log("Attendy: Running in Offline Local mode (Bypassing Supabase)");
}

// --------------------------------------------------------------------
// Initial Mock Seed Data (Offline fallback)
// --------------------------------------------------------------------
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
  lat: 12.9716,
  lng: 77.5946,
  geofenceRadius: 100,
  allowedWifiSSIDs: ['Office_HighSpeed', 'Office_Guest'],
  shiftStartTime: '09:30:00',
  shiftEndTime: '18:30:00',
  autoCheckoutTime: '20:00:00',
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
  initialize() {
    if (supabase) return; // Supabase handles schema in the cloud
    getStored('users', DEFAULT_USERS);
    getStored('office_config', DEFAULT_OFFICE);
    getStored('attendance_logs', generateMockLogs());
    getStored('leave_requests', DEFAULT_LEAVES);
  },

  // Auth Operations
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
      
      setStored('session_user', mappedUser);
      return { user: mappedUser };
    } else {
      this.initialize();
      const users = getStored<any[]>('users', DEFAULT_USERS); // any to allow mock password
      const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (!user) return { user: null as any, error: 'Invalid username' };
      
      if (password && user.role === 'admin' && password !== 'SURAJmagar@9890') {
          return { user: null as any, error: 'Invalid admin password' };
      }

      setStored('session_user', user);
      return { user };
    }
  },

  // User Management
  async getAllUsers(): Promise<User[]> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) return [];
      return data.map(d => ({
        id: d.id,
        username: d.username,
        fullName: d.full_name,
        role: d.role,
        avatarUrl: d.avatar_url,
        officeId: d.office_id
      }));
    }
    return getStored<User[]>('users', DEFAULT_USERS);
  },

  async createUser(payload: { username: string, fullName: string, role: string, password: string }): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('users').insert({
        username: payload.username.trim().toLowerCase(),
        full_name: payload.fullName,
        role: payload.role,
        password: payload.password
      });
      return !error;
    }
    return true; // local mock omit logic
  },

  async deleteUser(userId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      return !error;
    }
    return true;
  },

  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId);
      return !error;
    }
    return true;
  },

  logout() {
    localStorage.removeItem('session_user');
  },

  getCurrentUser(): User | null {
    const user = localStorage.getItem('session_user');
    return user ? JSON.parse(user) : null;
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
        timeWarning,
      };
    } else {
      this.initialize();
      const logs = getStored<AttendanceLog[]>('attendance_logs', []);
      const users = getStored<User[]>('users', DEFAULT_USERS);
      const user = users.find(u => u.id === userId);

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

      logs.unshift(newLog);
      setStored('attendance_logs', logs);
      return { ...newLog, timeWarning };
    }
  },

  async checkOut(userId: string): Promise<(AttendanceLog & { timeWarning?: string }) | null> {
    // TIME SECURITY: Use network-verified timestamp
    const { timestamp: now, warning: timeWarning } = await getVerifiedTimestamp();

    if (supabase) {
      // Find today's active check-in (where check_out is null)
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
        timeWarning,
      };
    } else {
      this.initialize();
      const logs = getStored<AttendanceLog[]>('attendance_logs', []);
      const activeLogIndex = logs.findIndex(
        (log) => log.userId === userId && !log.checkOut
      );
      if (activeLogIndex === -1) return null;

      const log = logs[activeLogIndex];
      log.checkOut = now.toISOString();
      const checkInTime = new Date(log.checkIn);
      const diffMs = now.getTime() - checkInTime.getTime();
      log.durationMinutes = Math.floor(diffMs / 60000);

      logs[activeLogIndex] = log;
      setStored('attendance_logs', logs);
      return { ...log, timeWarning };
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
      this.initialize();
      const logs = getStored<AttendanceLog[]>('attendance_logs', []);
      return logs.find((log) => log.userId === userId && !log.checkOut) || null;
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
      this.initialize();
      const logs = getStored<AttendanceLog[]>('attendance_logs', []);
      if (userId) return logs.filter((log) => log.userId === userId);
      return logs;
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
      this.initialize();
      const leaves = getStored<LeaveRequest[]>('leave_requests', []);
      if (userId) return leaves.filter((l) => l.userId === userId);
      return leaves;
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
      this.initialize();
      const leaves = getStored<LeaveRequest[]>('leave_requests', []);
      const index = leaves.findIndex((l) => l.id === requestId);
      if (index === -1) return null;
      
      leaves[index].status = status;
      setStored('leave_requests', leaves);
      return leaves[index];
    }
  },

  // Office Config
  async getOfficeConfig(): Promise<OfficeConfig> {
    if (supabase) {
      const { data, error } = await supabase.from('offices').select('*').limit(1);
      if (error || !data || data.length === 0) {
        // Fallback to default
        return DEFAULT_OFFICE;
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
        autoCheckoutTime: data[0].auto_checkout_time || '20:00:00',
        holidays: data[0].holidays || []
      };
    } else {
      this.initialize();
      return getStored<OfficeConfig>('office_config', DEFAULT_OFFICE);
    }
  },

  async updateOfficeConfig(config: OfficeConfig): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('offices')
        .upsert({
          id: config.id === 'off-1' ? undefined : config.id, // Generate new UUID if it's default
          name: config.name,
          lat: config.lat,
          lng: config.lng,
          geofence_radius: config.geofenceRadius,
          allowed_wifi_ssids: config.allowedWifiSSIDs,
          shift_start_time: config.shiftStartTime,
          shift_end_time: config.shiftEndTime,
          auto_checkout_time: config.autoCheckoutTime,
          holidays: config.holidays
        });
      if (error) throw error;
    } else {
      setStored('office_config', config);
    }
  },

  // Admin Analytics & Reports
  async getAttendanceSummary(): Promise<{ totalHours: number; lateCount: number; totalLogs: number }> {
    if (supabase) {
      const { data, error } = await supabase.rpc('get_attendance_summary');
      if (error) {
        console.error("RPC Error:", error);
        return { totalHours: 0, lateCount: 0, totalLogs: 0 };
      }
      return {
        totalHours: data?.[0]?.total_hours || 0,
        lateCount: data?.[0]?.late_count || 0,
        totalLogs: data?.[0]?.total_logs || 0,
      };
    } else {
      this.initialize();
      const logs = getStored<AttendanceLog[]>('attendance_logs', []);
      let totalMinutes = 0;
      let lateCount = 0;
      logs.forEach(log => {
        if (log.durationMinutes) totalMinutes += log.durationMinutes;
        if (log.status === 'late') lateCount++;
      });
      return {
        totalHours: Math.floor(totalMinutes / 60),
        lateCount,
        totalLogs: logs.length
      };
    }
  },

  async runAutoCheckout(): Promise<void> {
    if (supabase) {
      const { error } = await supabase.rpc('run_auto_checkout');
      if (error) {
        console.error("Auto-checkout RPC Error:", error);
      } else {
        console.log("Auto-checkout run successfully.");
      }
    }
  },

  exportToCSV(logs: AttendanceLog[]): void {
    if (!logs || logs.length === 0) return;
    
    // Create CSV header
    const headers = ['ID', 'User ID', 'Name', 'Check In', 'Check Out', 'IP Address', 'WiFi', 'Status', 'Duration (mins)'];
    
    // Create CSV rows
    const rows = logs.map(log => [
      log.id,
      log.userId,
      `"${log.userName}"`, // Escape commas in names
      `"${new Date(log.checkIn).toLocaleString()}"`,
      log.checkOut ? `"${new Date(log.checkOut).toLocaleString()}"` : 'Active',
      log.checkInIp,
      `"${log.checkInWifi}"`,
      log.status,
      log.durationMinutes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Helper to add mock users
  getUsers(): User[] {
    this.initialize();
    return getStored<User[]>('users', DEFAULT_USERS);
  }
};
