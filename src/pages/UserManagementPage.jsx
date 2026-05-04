/**
 * UserManagementPage.jsx — Manajemen akun user (Admin only).
 * Tabel bersih tanpa garis vertikal, Inline Style bypass Tailwind caching.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertCircle, X, CheckCircle, Users, Trash2, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Header from '../components/Header';

// ── Sub-components ─────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
        backgroundColor: isAdmin ? '#eef2ff' : '#f8fafc',
        color: isAdmin ? '#4f46e5' : '#475569',
        border: `1px solid ${isAdmin ? '#c7d2fe' : '#e2e8f0'}`,
        letterSpacing: '0.025em'
      }}
    >
      {isAdmin ? 'Admin' : 'Viewer'}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
      <span
        style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          backgroundColor: isActive ? '#22c55e' : '#cbd5e1'
        }}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function AlertBanner({ type, message, onClose }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle : AlertCircle;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
      borderRadius: '12px', fontSize: '14px', marginBottom: '24px',
      backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
      color: isSuccess ? '#15803d' : '#b91c1c'
    }}>
      <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: '500' }}>{message}</span>
      <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6 }}>
        <X style={{ width: '20px', height: '20px', color: 'inherit' }} />
      </button>
    </div>
  );
}

// ── Add User Modal ─────────────────────────────────────────────────────────────

function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/users', form);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membuat user.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 16px', borderRadius: '8px',
    border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px', color: '#1e293b', outline: 'none'
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '448px', padding: '24px', boxShadow: '0 20px 48px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users style={{ width: '20px', height: '20px', color: '#4f46e5' }} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Tambah User Baru</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {error && (
          <div style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '20px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle style={{ width: '16px', height: '16px' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>Username</label>
            <input type="text" style={inputStyle} value={form.username} onChange={e => { setForm({ ...form, username: e.target.value }); setError(''); }} placeholder="Masukkan username" required />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>Password</label>
            <input type="password" style={inputStyle} value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }} placeholder="Masukkan password" required />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>Role</label>
            <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', color: '#475569', backgroundColor: '#fff', cursor: 'pointer' }}>
              Batal
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '700', color: '#fff', backgroundColor: '#4f46e5', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Membuat...' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Change Password Modal ──────────────────────────────────────────────────────

function ChangePasswordModal({ user, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/api/users/${user.id}/password`, { password });
      onSuccess(user.username);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 16px', borderRadius: '8px',
    border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px', color: '#1e293b', outline: 'none'
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '448px', padding: '24px', boxShadow: '0 20px 48px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key style={{ width: '20px', height: '20px', color: '#ca8a04' }} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Ubah Password</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {error && (
          <div style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '20px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle style={{ width: '16px', height: '16px' }} />
            {error}
          </div>
        )}

        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
          Masukkan password baru untuk user <strong>{user.username}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>Password Baru</label>
            <input type="password" style={inputStyle} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Minimal 6 karakter" required />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', color: '#475569', backgroundColor: '#fff', cursor: 'pointer' }}>
              Batal
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '700', color: '#fff', backgroundColor: '#ca8a04', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { connectionStatus } = useSocket(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [changePasswordUser, setChangePasswordUser] = useState(null);

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Yakin ingin menghapus user ${username}?`)) return;
    try {
      await api.delete(`/api/users/${id}`);
      setUsers(users.map(u => u.id === id ? { ...u, is_active: false } : u));
      setAlert({ type: 'success', message: `User ${username} berhasil dihapus.` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Gagal menghapus user.' });
    }
  };

  const handleToggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'viewer' : 'admin';
    try {
      await api.put(`/api/users/${id}/role`, { role: newRole });
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      setAlert({ type: 'success', message: `Role berhasil diubah menjadi ${newRole}.` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Gagal mengubah role.' });
    }
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users');
      setUsers(res.data);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat daftar user.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAddSuccess = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
    setShowAdd(false);
    setAlert({ type: 'success', message: `User "${newUser.username}" berhasil dibuat.` });
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Header connectionStatus={connectionStatus} />

      <div style={{ padding: '32px', width: '100%', maxWidth: '1200px', margin: '0 auto', flex: 1, boxSizing: 'border-box' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.025em' }}>
              User Management
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Manage system access and roles
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', color: '#fff', backgroundColor: '#4f46e5', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            <span>Tambah User</span>
          </button>
        </div>

        <AlertBanner {...alert} onClose={() => setAlert({ type: '', message: '' })} />

        {/* Table Card - 100% Inline Style */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', width: '35%' }}>Username</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', width: '18%' }}>Role</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', width: '22%' }}>Dibuat</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', width: '18%' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', width: '12%', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Memuat data...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '64px 24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Belum ada user terdaftar.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
                              {u.username[0]}
                            </span>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                            {u.username}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <RoleBadge role={u.role} />
                      </td>
                      <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>
                          {formatDate(u.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <StatusBadge isActive={u.is_active} />
                      </td>
                      <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            title="Ubah Password"
                            onClick={() => setChangePasswordUser(u)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef9c3'; e.currentTarget.style.color = '#ca8a04'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                          >
                            <Key style={{ width: '18px', height: '18px' }} />
                          </button>
                          <button
                            title={`Ubah jadi ${u.role === 'admin' ? 'Viewer' : 'Admin'}`}
                            onClick={() => handleToggleRole(u.id, u.role)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#4f46e5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                          >
                            <Shield style={{ width: '18px', height: '18px' }} />
                          </button>
                          <button
                            title="Hapus User"
                            onClick={() => handleDelete(u.id, u.username)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                          >
                            <Trash2 style={{ width: '18px', height: '18px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer - Strict Inline */}
          {!loading && users.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Showing 1 to {users.length} of {users.length} users
              </p>
              <div style={{ display: 'inline-flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                <button style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '500', color: '#94a3b8', backgroundColor: '#ffffff', border: 'none', borderRight: '1px solid #cbd5e1', cursor: 'not-allowed' }} disabled>
                  Prev
                </button>
                <button style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#ffffff', backgroundColor: '#4f46e5', border: 'none' }}>
                  1
                </button>
                <button style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '500', color: '#475569', backgroundColor: '#ffffff', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer' }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddUserModal onClose={() => setShowAdd(false)} onSuccess={handleAddSuccess} />
      )}
      {changePasswordUser && (
        <ChangePasswordModal
          user={changePasswordUser}
          onClose={() => setChangePasswordUser(null)}
          onSuccess={(username) => {
            setChangePasswordUser(null);
            setAlert({ type: 'success', message: `Password untuk user "${username}" berhasil diubah.` });
          }}
        />
      )}
    </div>
  );
}