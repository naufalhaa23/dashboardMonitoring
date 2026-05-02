/**
 * UserManagementPage.jsx — Manajemen akun user (Admin only).
 *
 * - GET    /api/users           : daftar semua user
 * - POST   /api/users           : buat user baru
 * - DELETE /api/users/<id>      : hapus user
 * - PUT    /api/users/<id>/role : ubah role user
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Trash2, RefreshCw, Shield, Eye, AlertCircle, X, CheckCircle, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold
      ${role === 'admin'
        ? 'bg-primary-100 text-primary-700'
        : 'bg-surface-secondary text-text-secondary border border-border'}`
    }>
      {role === 'admin' ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      {role === 'admin' ? 'Admin' : 'Viewer'}
    </span>
  );
}

function Alert({ type, message, onClose }) {
  if (!message) return null;
  const styles = {
    success: 'bg-success-light border-success/20 text-success',
    error:   'bg-danger-light border-danger/20 text-danger',
  };
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm mb-4 ${styles[type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
    </div>
  );
}

// ── Modal Tambah User ─────────────────────────────────────────────────────────

function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ username: '', password: '', role: 'viewer' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass = `w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary
                      placeholder-text-muted outline-none transition-all
                      focus:border-primary-400 focus:ring-2 focus:ring-primary-100`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) { setError('Username dan password wajib diisi.'); return; }
    if (form.password.length < 6) { setError('Password minimal 6 karakter.'); return; }
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

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up"
           style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Tambah User Baru</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Username</label>
            <input type="text" placeholder="Nama pengguna" className={inputClass}
              value={form.username} onChange={e => { setForm({...form, username: e.target.value}); setError(''); }} required />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Password</label>
            <input type="password" placeholder="Min. 6 karakter" className={inputClass}
              value={form.password} onChange={e => { setForm({...form, password: e.target.value}); setError(''); }} required />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Role</label>
            <div className="relative">
              <select className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="viewer">Viewer — Hanya Dashboard</option>
                <option value="admin">Admin — Akses Penuh</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold
                         transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Membuat...</> : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Konfirmasi Hapus ──────────────────────────────────────────────────────────

function DeleteConfirmModal({ user: targetUser, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up"
           style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Hapus User</h2>
            <p className="text-sm text-text-muted">Tindakan ini tidak bisa dibatalkan</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary mb-5">
          Yakin ingin menghapus akun <span className="font-semibold text-text-primary">"{targetUser?.username}"</span>?
          User ini tidak akan bisa login lagi.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-danger hover:bg-red-700 text-white text-sm font-semibold
                       transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Menghapus...</> : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert]       = useState({ type: '', message: '' });

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

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/users/${toDelete.id}`);
      setUsers(prev => prev.filter(u => u.id !== toDelete.id));
      setAlert({ type: 'success', message: `User "${toDelete.username}" berhasil dihapus.` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Gagal menghapus user.' });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.put(`/api/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u));
      setAlert({ type: 'success', message: `Role berhasil diubah ke "${newRole}".` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Gagal mengubah role.' });
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50">
            <Users className="w-6 h-6 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">User Management</h1>
            <p className="text-sm text-text-muted">{users.length} akun terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} disabled={loading}
            className="p-2.5 rounded-xl border border-border hover:bg-surface-secondary text-text-muted transition-colors"
            title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700
                       text-white text-sm font-semibold transition-colors shadow-md shadow-primary-200">
            <Plus className="w-4 h-4" />
            <span>Tambah User</span>
          </button>
        </div>
      </div>

      <Alert {...alert} onClose={() => setAlert({ type: '', message: '' })} />

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted gap-2">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">Belum ada user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Username</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden sm:table-cell">Dibuat</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-secondary/50 transition-colors">
                    {/* Username */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700 uppercase">
                            {u.username[0]}
                          </span>
                        </div>
                        <span className="font-medium text-text-primary">
                          {u.username}
                          {u.id === currentUser?.id && (
                            <span className="ml-2 text-[10px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-md">Anda</span>
                          )}
                        </span>
                      </div>
                    </td>
                    {/* Role (editable) */}
                    <td className="px-5 py-4">
                      {u.id === currentUser?.id ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <div className="relative inline-block">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className="text-xs font-semibold pl-2 pr-6 py-1 rounded-full cursor-pointer outline-none
                                       appearance-none border border-transparent hover:border-border transition-colors
                                       bg-transparent"
                            style={{ color: u.role === 'admin' ? '#2563eb' : '#475569' }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
                        </div>
                      )}
                    </td>
                    {/* Created */}
                    <td className="px-5 py-4 text-text-muted hidden sm:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                        ${u.is_active ? 'bg-success-light text-success' : 'bg-surface-tertiary text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-success' : 'bg-text-muted'}`} />
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {u.id !== currentUser?.id ? (
                        <button
                          onClick={() => setToDelete(u)}
                          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-light transition-colors"
                          title="Hapus user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-text-muted px-2">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSuccess={handleAddSuccess} />}
      {toDelete && (
        <DeleteConfirmModal
          user={toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
