/**
 * LoginPage.jsx — Halaman login minimalis centered.
 * Latar belakang pola titik-titik halus, kartu tepat di tengah layar.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', form);
      login(res.data.token, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Full-screen dot-pattern background. Ditambah relative agar footer absolut pas di bawah */
    <div className="bg-dots min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Card Container */}
      <div className="w-full max-w-[420px] animate-fade-in-up">

        {/* Menggunakan class CSS khusus kita, menghapus inline styles & tailwind padding */}
        <div className="login-card-wrapper">

          {/* Brand */}
          <div className="flex flex-col items-center mb-10"> {/* mb diperbesar untuk ruang napas */}
            <div
              className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center mb-5"
              style={{
                background: '#4f46e5',
                boxShadow: '0 8px 20px rgba(79, 70, 229, 0.30)', // Efek glow petir tetap dipertahankan
              }}
            >
              <Zap className="w-7 h-7 text-white" strokeWidth={2.5} fill="rgba(255,255,255,0.15)" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              IoT Power Meter
            </h1>
            <p className="text-sm font-normal text-slate-500">
              Masuk ke Dashboard Monitoring
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6"> {/* Gap antar input diperbesar */}

            {/* Username */}
            <div className="flex flex-col gap-2"> {/* Gap label dan input */}
              <label htmlFor="login-username" className="text-sm font-semibold text-slate-700">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={form.username}
                onChange={handleChange}
                placeholder="Masukkan username Anda"
                className="login-input" /* Class CSS kita */
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Masukkan password Anda"
                  className="login-input pr-12" /* Class CSS kita + padding kanan agar tidak nabrak icon */
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPass
                    ? <EyeOff className="w-5 h-5" />
                    : <Eye className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="login-btn mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="login-version-text absolute bottom-8">
        Versi 2.4.1 (Build 1042)
      </p>
    </div>
  );
}