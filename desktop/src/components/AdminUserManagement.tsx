import React, { useState, useEffect } from 'react';
import { dataService, User } from '../services/dataService';

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add User State
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"employee"|"admin">("employee");

  // Reset Password State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const data = await dataService.getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newFullName || !newPassword) return;
    
    const success = await dataService.createUser({
      username: newUsername,
      fullName: newFullName,
      role: newRole,
      password: newPassword
    });

    if (success) {
      setNewUsername("");
      setNewFullName("");
      setNewPassword("");
      fetchUsers();
    } else {
      alert("Failed to create user. Username might already exist.");
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username === 'genesoft') {
      alert("Cannot delete the master admin account.");
      return;
    }
    if (confirm(`Are you sure you want to permanently remove ${username}?`)) {
      await dataService.deleteUser(id);
      fetchUsers();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPasswordValue) return;
    
    const success = await dataService.resetPassword(resetUserId, resetPasswordValue);
    if (success) {
      alert("Password updated successfully!");
      setResetUserId(null);
      setResetPasswordValue("");
    } else {
      alert("Failed to update password.");
    }
  };

  return (
    <div className="admin-grid" style={{ gridTemplateColumns: "1fr" }}>
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Employee & Admin Accounts</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          
          {/* Add User Form */}
          <div style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px" }}>
            <h4 style={{ marginBottom: "16px", color: "#e2e8f0" }}>Add New Account</h4>
            <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>Create Account</button>
            </form>
          </div>

          {/* User List & Reset Pass */}
          <div>
            {resetUserId && (
               <div style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
                <h4 style={{ marginBottom: "12px", color: "#d8b4fe" }}>Reset Password for {users.find(u => u.id === resetUserId)?.username}</h4>
                <form onSubmit={handleResetPassword} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>New Password</label>
                    <input type="text" className="form-input" value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: "#8b5cf6" }}>Save Password</button>
                  <button type="button" className="btn-primary" style={{ backgroundColor: "transparent", border: "1px solid #475569" }} onClick={() => setResetUserId(null)}>Cancel</button>
                </form>
               </div>
            )}

            <div className="table-wrapper">
              {loading ? <p>Loading users...</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                        <td>{u.username}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'present' : 'half_day'}`}>{u.role}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                              className="action-btn-small" 
                              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                              onClick={() => setResetUserId(u.id)}
                            >
                              Reset Pass
                            </button>
                            {u.username !== 'genesoft' && (
                              <button 
                                className="action-btn-small reject"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                              >
                                Remove
                              </button>
                            )}
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
  );
};
