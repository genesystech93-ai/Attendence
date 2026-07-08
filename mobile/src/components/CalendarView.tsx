import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AttendanceLog } from '../services/dataService';

interface CalendarViewProps {
  logs: AttendanceLog[];
  holidays: string[];
  currentUserId: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ logs, holidays, currentUserId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filter logs for the current user
  const userLogs = useMemo(() => logs.filter(l => l.userId === currentUserId), [logs, currentUserId]);

  // Map logs to marked dates format
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];

    // Mark Holidays
    holidays.forEach(h => {
      marks[h] = { marked: true, dotColor: '#a855f7' };
    });

    // Mark Attendance Logs
    userLogs.forEach(log => {
      const dateKey = log.checkIn.split('T')[0];
      const color = log.status === 'late' ? '#facc15' : '#34d399';
      
      if (marks[dateKey]) {
        marks[dateKey].dotColor = color;
      } else {
        marks[dateKey] = { marked: true, dotColor: color };
      }
    });

    // Highlight specifically selected date
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: 'rgba(139, 92, 246, 0.4)' };
    } else {
      marks[selectedDate] = { selected: true, selectedColor: 'rgba(139, 92, 246, 0.4)' };
    }

    return marks;
  }, [userLogs, holidays, selectedDate]);

  const selectedLog = userLogs.find(l => l.checkIn.startsWith(selectedDate));
  const isHoliday = holidays.includes(selectedDate);
  const selectedDateObj = new Date(selectedDate);
  const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.card}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: '#94a3b8',
            selectedDayBackgroundColor: 'rgba(139, 92, 246, 0.4)',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#8b5cf6',
            dayTextColor: '#e2e8f0',
            textDisabledColor: '#475569',
            dotColor: '#34d399',
            selectedDotColor: '#ffffff',
            arrowColor: '#8b5cf6',
            monthTextColor: '#e2e8f0',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14
          }}
        />
        
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#34d399' }]} /><Text style={styles.legendText}>On Time</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#facc15' }]} /><Text style={styles.legendText}>Late</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#a855f7' }]} /><Text style={styles.legendText}>Holiday</Text></View>
        </View>
      </View>

      {/* Detail Card */}
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>
          {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {isHoliday ? (
          <View style={[styles.statusBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
            <Text style={{ color: '#d8b4fe', fontWeight: '600', textAlign: 'center' }}>🎉 Company Holiday</Text>
          </View>
        ) : isWeekend ? (
          <View style={[styles.statusBox, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Text style={{ color: '#94a3b8', textAlign: 'center' }}>Weekend</Text>
          </View>
        ) : selectedLog ? (
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.badge, selectedLog.status === 'late' ? styles.badgeLate : styles.badgePresent]}>
                {selectedLog.status === 'late' ? 'Late' : 'On Time'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check In</Text>
              <Text style={styles.detailValue}>{new Date(selectedLog.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check Out</Text>
              <Text style={styles.detailValue}>{selectedLog.checkOut ? new Date(selectedLog.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Network IP</Text>
              <Text style={styles.detailValue}>{selectedLog.checkInIp}</Text>
            </View>
          </View>
        ) : selectedDate < new Date().toISOString().split('T')[0] ? (
          <View style={[styles.statusBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Text style={{ color: '#fca5a5', textAlign: 'center' }}>Absent (No records found)</Text>
          </View>
        ) : (
          <View style={[styles.statusBox, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Text style={{ color: '#94a3b8', textAlign: 'center' }}>No records for today yet.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  detailCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  detailTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailsList: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  badgePresent: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    color: '#34d399',
  },
  badgeLate: {
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    color: '#facc15',
  },
});
