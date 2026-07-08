import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // We import base css and override in App.css
import { AttendanceLog } from '../services/dataService';

interface CalendarViewProps {
  logs: AttendanceLog[];
  holidays: string[];
  isAdmin: boolean;
  currentUserId: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  logs, 
  holidays, 
  isAdmin, 
  currentUserId 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [targetUserId, setTargetUserId] = useState<string>(currentUserId);

  // Extract unique users from logs for the admin dropdown
  const uniqueUsers = Array.from(new Map(logs.map(log => [log.userId, log.userName])).entries());

  // Filter logs for the currently viewed user
  const userLogs = logs.filter(log => log.userId === targetUserId);

  // Helper to format date consistently to match holidays/logs
  const formatYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    const ymd = formatYMD(date);
    
    // Check if Holiday
    if (holidays.includes(ymd)) {
      return <div className="cal-dot holiday" title="Holiday" />;
    }

    // Check if Weekend
    const day = date.getDay();
    if (day === 0 || day === 6) {
      return null;
    }

    // Find log for this day
    const logForDay = userLogs.find(l => l.checkIn.startsWith(ymd));
    
    if (logForDay) {
      if (logForDay.status === 'late') {
        return <div className="cal-dot late" title="Late Check-in" />;
      }
      return <div className="cal-dot present" title="On Time" />;
    }

    // If no log and date is in the past (excluding today)
    const today = formatYMD(new Date());
    if (ymd < today) {
      return <div className="cal-dot absent" title="Absent" />;
    }

    return null;
  };

  // Find logs for the specifically selected date
  const selectedYMD = formatYMD(selectedDate);
  const selectedLog = userLogs.find(l => l.checkIn.startsWith(selectedYMD));
  const isHoliday = holidays.includes(selectedYMD);
  
  const selectedDay = selectedDate.getDay();
  const isWeekend = selectedDay === 0 || selectedDay === 6;

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
      
      {/* Calendar Area */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Attendance Calendar</h2>
          
          {isAdmin && (
            <select 
              className="form-input" 
              style={{ width: '200px', padding: '8px 12px' }}
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              {uniqueUsers.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}
        </div>

        <Calendar 
          onChange={(val) => setSelectedDate(val as Date)} 
          value={selectedDate}
          tileContent={tileContent}
          calendarType="gregory"
        />
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', justifyContent: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="cal-dot present" /> On Time
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="cal-dot late" /> Late
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="cal-dot absent" /> Absent
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="cal-dot holiday" /> Holiday
          </div>
        </div>
      </div>

      {/* Details Side Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#94a3b8' }}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        
        {isHoliday ? (
          <div style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)', color: '#d8b4fe', textAlign: 'center' }}>
            🎉 Company Holiday
          </div>
        ) : isWeekend ? (
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#94a3b8', textAlign: 'center' }}>
            Weekend
          </div>
        ) : selectedLog ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#64748b' }}>Status</span>
              <span className={`badge ${selectedLog.status}`}>
                {selectedLog.status === 'late' ? 'Late' : 'On Time'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#64748b' }}>Check In</span>
              <span>{new Date(selectedLog.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#64748b' }}>Check Out</span>
              <span>{selectedLog.checkOut ? new Date(selectedLog.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Network</span>
              <span>{selectedLog.checkInWifi}</span>
            </div>
          </div>
        ) : selectedYMD < formatYMD(new Date()) ? (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', textAlign: 'center' }}>
            Absent (No records found)
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#94a3b8', textAlign: 'center' }}>
            No records for today yet.
          </div>
        )}
      </div>

    </div>
  );
};
