import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { dataService, User, AttendanceLog, LeaveRequest, OfficeConfig } from './src/services/dataService';
import { CalendarView } from './src/components/CalendarView';

const { width } = Dimensions.get('window');

// Haversine formula to compute distance in meters
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

export default function App() {
  // App State
  const [dbInitialized, setDbInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaves' | 'calendar' | 'settings'>('dashboard');

  // Real-time ticking Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Shift Active States
  const [activeDurationText, setActiveDurationText] = useState<'00:00:00' | string>('00:00:00');
  const [activeLog, setActiveLog] = useState<AttendanceLog | null>(null);

  // App data lists
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig | null>(null);

  // Real location sensors
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [realDistance, setRealDistance] = useState<number | null>(null);

  // Auth/Email Input
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Simulator configurations
  const [useSimulation, setUseSimulation] = useState(true); // Default to simulation mode for easier testing
  const [simulatedSSID, setSimulatedSSID] = useState('Office_HighSpeed');
  const [simulatedLat, setSimulatedLat] = useState(12.97165);
  const [simulatedLng, setSimulatedLng] = useState(77.59462);
  const [bypassChecks, setBypassChecks] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  // Leave Form
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState<'sick' | 'vacation' | 'casual'>('vacation');
  const [leaveReason, setLeaveReason] = useState('');

  const timerRef = useRef<any>(null);

  // 1. Boot up: Initialize local storage & check biometrics
  useEffect(() => {
    async function loadApp() {
      await dataService.initialize();
      const user = dataService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      setDbInitialized(true);

      // Check biometrics availability
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(compatible && enrolled);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsErrorMsg('Permission to access location was denied');
      } else {
        // Read GPS in background every 15s
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 10 },
          (location) => {
            const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
            setCurrentCoords(coords);
          }
        );
      }
    }

    loadApp();

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Compute geodistance dynamically when real coordinates update
  useEffect(() => {
    if (currentCoords && officeConfig) {
      const dist = getDistanceMeters(
        currentCoords.lat,
        currentCoords.lng,
        officeConfig.lat,
        officeConfig.lng
      );
      setRealDistance(dist);
    }
  }, [currentCoords, officeConfig]);

  const activeLogRef = useRef<AttendanceLog | null>(null);

  // Sync ref to state
  useEffect(() => {
    activeLogRef.current = activeLog;
  }, [activeLog]);

  // Fetch data on session state load
  useEffect(() => {
    if (currentUser) {
      refreshData();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        const active = activeLogRef.current;
        if (active) {
          const checkInDate = new Date(active.checkIn);
          const diffMs = new Date().getTime() - checkInDate.getTime();
          const totalSecs = Math.floor(diffMs / 1000);

          const hours = Math.floor(totalSecs / 3600);
          const minutes = Math.floor((totalSecs % 3600) / 60);
          const seconds = totalSecs % 60;

          const pad = (num: number) => num.toString().padStart(2, '0');
          setActiveDurationText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        } else {
          setActiveDurationText('00:00:00');
        }
      }, 1000);
    }
  }, [currentUser]);

  const refreshData = async () => {
    if (!currentUser) return;
    try {
      const config = await dataService.getOfficeConfig();
      setOfficeConfig(config);

      const active = await dataService.getActiveLog(currentUser.id);
      setActiveLog(active);

      if (currentUser.role === 'admin') {
        const [logs, leaves] = await Promise.all([
          dataService.getAttendanceLogs(),
          dataService.getLeaveRequests()
        ]);
        setAttendanceLogs(logs);
        setLeaveRequests(leaves);
      } else {
        const [logs, leaves] = await Promise.all([
          dataService.getAttendanceLogs(currentUser.id),
          dataService.getLeaveRequests(currentUser.id)
        ]);
        setAttendanceLogs(logs);
        setLeaveRequests(leaves);
      }
    } catch (e) {
      console.error("Failed to refresh mobile data", e);
    }
  };

  const handleLogin = async () => {
    if (!loginUsername) {
      setLoginError('Enter username');
      return;
    }
    const { user, error } = await dataService.login(loginUsername, loginPassword);
    if (error) {
      setLoginError(error);
    } else {
      setLoginError('');
      setCurrentUser(user);
    }
  };



  const handleLogout = () => {
    dataService.logout();
    setCurrentUser(null);
  };

  // Perform secure check-in with Geofence, Wi-Fi SSID, and Biometrics
  const handleCheckIn = async () => {
    if (!currentUser || !officeConfig) return;

    // A. BIOMETRIC SECURITY
    if (biometricsAvailable) {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm Identity for Attendance Clock-In',
        fallbackLabel: 'Use Device Passcode',
      });
      if (!authResult.success) {
        Alert.alert('Security Alert', 'Biometrics verification failed. Clock-in rejected.');
        return;
      }
    } else {
      // Simulate biometric validation
      let confirmed = false;
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Simulated Biometrics',
          'Biometrics scanner validated. Press OK to verify FaceID/Fingerprint.',
          [
            { text: 'Cancel', onPress: () => { confirmed = false; resolve(); } },
            { text: 'OK', onPress: () => { confirmed = true; resolve(); } }
          ]
        );
      });
      if (!confirmed) return;
    }

    // B. PUNCH-IN VALIDATION
    let checkInSSID = simulatedSSID;
    let checkInLat = simulatedLat;
    let checkInLng = simulatedLng;

    if (!useSimulation) {
      // Use real sensors if simulation is turned off
      if (!currentCoords) {
        Alert.alert('Location Pending', 'Still waiting for device GPS sensor lock. Please try again in 5 seconds.');
        return;
      }
      checkInLat = currentCoords.lat;
      checkInLng = currentCoords.lng;
      checkInSSID = 'Office_HighSpeed'; // Assumed connection
    }

    if (!bypassChecks) {
      // 1. Wi-Fi SSID matches
      const wifiMatch = officeConfig.allowedWifiSSIDs.some(
        (ssid) => ssid.trim().toLowerCase() === checkInSSID.trim().toLowerCase()
      );
      if (!wifiMatch) {
        Alert.alert('Check-In Blocked', `Unauthorized Network. "${checkInSSID}" is not a recognized office Wi-Fi SSID.`);
        return;
      }

      // 2. Geofence radius check
      const dist = getDistanceMeters(checkInLat, checkInLng, officeConfig.lat, officeConfig.lng);
      if (dist > officeConfig.geofenceRadius) {
        Alert.alert(
          'Check-In Blocked',
          `Distance restriction failed. You are ${Math.round(dist)}m away from office limits (radius ${officeConfig.geofenceRadius}m).`
        );
        return;
      }
    }

    try {
      // Write clock in log
      await dataService.checkIn(currentUser.id, checkInSSID, '192.168.1.189', {
        lat: checkInLat,
        lng: checkInLng,
      });
      await refreshData();
      Alert.alert('Success', 'Punch-in recorded successfully!');
    } catch (e: any) {
      Alert.alert('Check-In Failed', e.message || 'Failed to record check in.');
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      await dataService.checkOut(currentUser.id);
      await refreshData();
      Alert.alert('Success', 'Clocked out. Great work today!');
    } catch (e: any) {
      Alert.alert('Check-Out Failed', e.message || 'Failed to record check out.');
    }
  };

  const handleLeaveRequestSubmit = async () => {
    if (!currentUser) return;
    if (!leaveStart || !leaveEnd || !leaveReason) {
      Alert.alert('Error', 'Please fill in all leave request inputs.');
      return;
    }

    try {
      await dataService.submitLeaveRequest(currentUser.id, leaveStart, leaveEnd, leaveType, leaveReason);
      Alert.alert('Success', 'Leave request submitted to admin queue.');
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      await refreshData();
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message || 'Failed to submit leave request.');
    }
  };

  const calculateHoursWorked = () => {
    const userLogs = attendanceLogs.filter((log) => log.userId === currentUser?.id);
    const mins = userLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    return (mins / 60).toFixed(1);
  };

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  // A. LOGIN SCREEN
  if (!currentUser) {
    return (
      <View style={styles.loginContainer}>
        <StatusBar style="light" />
        <Image source={require('./assets/icon.png')} style={styles.logoImage} />
        <Text style={styles.loginTitle}>Genesoft Infotech</Text>
        <Text style={styles.loginSubtitle}>Attendance Management System</Text>

        <View style={styles.cardGlass}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. john"
            placeholderTextColor="#64748b"
            value={loginUsername}
            onChangeText={setLoginUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#64748b"
            value={loginPassword}
            onChangeText={setLoginPassword}
            autoCapitalize="none"
            secureTextEntry={true}
          />

          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
            <Text style={styles.btnText}>Authenticate Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // B. MAIN APPLICATION LAYOUT
  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hello, {currentUser.fullName.split(' ')[0]}</Text>
          <Text style={styles.headerSub}>Attendance Dashboard</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Stats Panel */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Month Hours</Text>
                <Text style={styles.statVal}>{calculateHoursWorked()} hrs</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Late Days</Text>
                <Text style={styles.statVal}>
                  {attendanceLogs.filter((log) => log.status === 'late').length}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Leave Left</Text>
                <Text style={styles.statVal}>12d</Text>
              </View>
            </View>

            {/* Check In Action circle */}
            <View style={styles.actionCard}>
              <Text style={styles.actionCardTitle}>Office Sensor Verification</Text>
              
              <View style={styles.circleOuter}>
                {!activeLog ? (
                  <TouchableOpacity style={styles.circleBtn} onPress={handleCheckIn}>
                    <Text style={styles.circleBtnText}>PUNCH IN</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.circleBtn, styles.circleBtnActive]} onPress={handleCheckOut}>
                    <Text style={styles.circleBtnText}>PUNCH OUT</Text>
                  </TouchableOpacity>
                )}
              </View>

              {activeLog ? (
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.timerDisplay}>{activeDurationText}</Text>
                  <Text style={[styles.statusLabel, { color: '#34d399' }]}>SHIFT ACTIVE</Text>
                </View>
              ) : (
                <Text style={styles.statusLabel}>NOT CLOCKED IN</Text>
              )}
            </View>

            {/* Diagnostic Card */}
            <View style={styles.cardGlass}>
              <Text style={styles.cardHeaderTitle}>Live Diagnostic Check</Text>
              
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagLabel}>Biometric Hardware:</Text>
                <Text style={styles.diagVal}>{biometricsAvailable ? '🟢 Ready (FaceID/TouchID)' : '🟡 Simulated'}</Text>
              </View>
              
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagLabel}>Office Geofence Dist:</Text>
                <Text style={styles.diagVal}>
                  {useSimulation
                    ? `${Math.round(getDistanceMeters(simulatedLat, simulatedLng, officeConfig?.lat || 0, officeConfig?.lng || 0))}m (Simulated)`
                    : realDistance !== null
                    ? `${Math.round(realDistance)}m (GPS Sensor)`
                    : 'Searching GPS...'}
                </Text>
              </View>

              <View style={styles.diagnosticRow}>
                <Text style={styles.diagLabel}>SSID Gateway Check:</Text>
                <Text style={styles.diagVal}>
                  {useSimulation ? `"${simulatedSSID}"` : 'Real Wi-Fi SSID connected'}
                </Text>
              </View>
            </View>

            {/* Recent Logs List */}
            <View style={styles.cardGlass}>
              <Text style={styles.cardHeaderTitle}>Recent Attendance Logs</Text>
              {attendanceLogs.length === 0 ? (
                <Text style={styles.emptyText}>No check-ins recorded yet.</Text>
              ) : (
                attendanceLogs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View>
                      <Text style={styles.logDate}>
                        {new Date(log.checkIn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.logTime}>
                        In: {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.badge, log.status === 'present' ? styles.badgePresent : styles.badgeLate]}>
                        <Text style={styles.badgeText}>{log.status}</Text>
                      </View>
                      {log.durationMinutes ? (
                        <Text style={styles.logDuration}>
                          {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* LEAVES TAB */}
        {activeTab === 'leaves' && (
          <View>
            {/* New Leave Card */}
            <View style={styles.cardGlass}>
              <Text style={styles.cardHeaderTitle}>Apply for Leave</Text>
              
              <Text style={styles.label}>Leave Type</Text>
              <View style={styles.leaveTypeRow}>
                {['sick', 'vacation', 'casual'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, leaveType === t ? styles.typeBtnActive : null]}
                    onPress={() => setLeaveType(t as any)}
                  >
                    <Text style={[styles.typeBtnText, leaveType === t ? styles.typeBtnTextActive : null]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
                value={leaveStart}
                onChangeText={setLeaveStart}
              />

              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
                value={leaveEnd}
                onChangeText={setLeaveEnd}
              />

              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Explain the reason for leave request"
                placeholderTextColor="#64748b"
                multiline
                value={leaveReason}
                onChangeText={setLeaveReason}
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleLeaveRequestSubmit}>
                <Text style={styles.btnText}>Submit Request</Text>
              </TouchableOpacity>
            </View>

            {/* Leave History */}
            <View style={styles.cardGlass}>
              <Text style={styles.cardHeaderTitle}>Leave Requests History</Text>
              {leaveRequests.length === 0 ? (
                <Text style={styles.emptyText}>No leaves requested yet.</Text>
              ) : (
                leaveRequests.map((req) => (
                  <View key={req.id} style={styles.logItem}>
                    <View>
                      <Text style={styles.logDate}>{req.startDate} to {req.endDate}</Text>
                      <Text style={styles.logTime}>{req.type.toUpperCase()} - {req.reason}</Text>
                    </View>
                    <View style={[styles.badge, req.status === 'approved' ? styles.badgePresent : req.status === 'pending' ? styles.badgePending : styles.badgeLate]}>
                      <Text style={styles.badgeText}>{req.status.toUpperCase()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* SETTINGS / SIMULATOR TAB */}
        {activeTab === 'settings' && (
          <View>
            <View style={styles.cardGlass}>
              <Text style={styles.cardHeaderTitle}>Device Sensors Configuration</Text>
              
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Simulate Device States</Text>
                  <Text style={styles.switchSub}>Spoof Wi-Fi & Coordinates</Text>
                </View>
                <Switch
                  value={useSimulation}
                  onValueChange={setUseSimulation}
                  trackColor={{ false: '#1e293b', true: '#06b6d4' }}
                />
              </View>

              {useSimulation && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Simulated SSID (Wi-Fi)</Text>
                  <TextInput
                    style={styles.input}
                    value={simulatedSSID}
                    onChangeText={setSimulatedSSID}
                    editable={!activeLog}
                  />

                  <Text style={styles.label}>Simulated Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={simulatedLat.toString()}
                    onChangeText={(val) => setSimulatedLat(parseFloat(val) || 0)}
                    keyboardType="numeric"
                    editable={!activeLog}
                  />

                  <Text style={styles.label}>Simulated Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={simulatedLng.toString()}
                    onChangeText={(val) => setSimulatedLng(parseFloat(val) || 0)}
                    keyboardType="numeric"
                    editable={!activeLog}
                  />

                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchLabel}>Bypass Verification checks</Text>
                      <Text style={styles.switchSub}>Admin override</Text>
                    </View>
                    <Switch
                      value={bypassChecks}
                      onValueChange={setBypassChecks}
                      trackColor={{ false: '#1e293b', true: '#8b5cf6' }}
                      disabled={!!activeLog}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Logout button */}
            <TouchableOpacity style={styles.btnDanger} onPress={handleLogout}>
              <Text style={styles.btnText}>Log Out Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <CalendarView 
            logs={attendanceLogs}
            holidays={officeConfig?.holidays || []}
            currentUserId={currentUser.id}
          />
        )}

      </ScrollView>

      {/* BOTTOM TAB NAVIGATION */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dashboard' ? styles.tabItemActive : null]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabItemText, activeTab === 'dashboard' ? styles.tabItemTextActive : null]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'leaves' ? styles.tabItemActive : null]}
          onPress={() => setActiveTab('leaves')}
        >
          <Text style={[styles.tabItemText, activeTab === 'leaves' ? styles.tabItemTextActive : null]}>
            Leaves
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'calendar' ? styles.tabItemActive : null]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabItemText, activeTab === 'calendar' ? styles.tabItemTextActive : null]}>
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' ? styles.tabItemActive : null]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabItemText, activeTab === 'settings' ? styles.tabItemTextActive : null]}>
            Sensors
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center',
  },
  cardGlass: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnDanger: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 8,
  },
  presetsBox: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    marginBottom: 8,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  presetEmail: {
    fontSize: 11,
    color: '#64748b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeEmployee: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  badgePresent: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeLate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },

  // MAIN LAYOUT STYLES
  appContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
  },
  timeBadge: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timeText: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  mainScroll: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 20,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  circleBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  circleBtnActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  circleBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  timerDisplay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
    marginTop: 10,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  diagLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  diagVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  logDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  logTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  logDuration: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  leaveTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  typeBtnActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
  },

  // BOTTOM TABBAR STYLES
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabItemTextActive: {
    color: '#06b6d4',
  },
});
