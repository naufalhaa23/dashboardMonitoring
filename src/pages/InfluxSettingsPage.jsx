/**
 * InfluxSettingsPage.jsx — Halaman konfigurasi InfluxDB (Admin only).
 *
 * - GET /api/settings/influx  : muat konfigurasi saat ini
 * - PUT /api/settings/influx  : simpan perubahan
 */

import { useState, useEffect } from 'react';
import { Database, Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import api from '../services/api';

const inputClass = `w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary
                    placeholder-text-muted outline-none transition-all duration-200
                    focus:border-primary-400 focus:ring-2 focus:ring-primary-100`;

function Alert({ type, message }) {
  if (!message) return null;
  const styles = {
    success: 'bg-success-light border-success/20 text-success',
    error:   'bg-danger-light border-danger/20 text-danger',
  };
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm mb-4 ${styles[type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function FormField({ label, id, hint, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {hint && <p className="text-xs text-text-muted -mt-1">{hint}</p>}
      {children}
    </div>
  );
}

export default function InfluxSettingsPage() {
  const [form, setForm]         = useState({ influx_url: '', influx_org: '', influx_bucket: '', influx_token: '' });
  const [tokenMasked, setTokenMasked] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [alert, setAlert]       = useState({ type: '', message: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/settings/influx');
        const d = res.data;
        setForm({
          influx_url:    d.influx_url    || '',
          influx_org:    d.influx_org    || '',
          influx_bucket: d.influx_bucket || '',
          influx_token:  '', // Token tidak dikirim dari backend
        });
        setTokenMasked(d.influx_token_masked || '');
      } catch {
        setAlert({ type: 'error', message: 'Gagal memuat konfigurasi InfluxDB.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setAlert({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert({ type: '', message: '' });
    try {
      await api.put('/api/settings/influx', form);
      setAlert({ type: 'success', message: 'Konfigurasi InfluxDB berhasil disimpan!' });
      if (form.influx_token) {
        const t = form.influx_token;
        setTokenMasked(t.length > 8 ? t.slice(0,4) + '****' + t.slice(-4) : '****');
      }
      setForm(prev => ({ ...prev, influx_token: '' }));
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-50">
          <Database className="w-6 h-6 text-violet-600" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">InfluxDB Settings</h1>
          <p className="text-sm text-text-muted">Konfigurasi koneksi ke database time-series</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <Alert {...alert} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* URL */}
          <FormField label="URL" id="influx_url" hint="Contoh: http://localhost:8086" required>
            <input id="influx_url" name="influx_url" type="url"
              value={form.influx_url} onChange={handleChange}
              placeholder="http://localhost:8086" className={inputClass} required />
          </FormField>

          {/* Org & Bucket */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Organization" id="influx_org" hint="Nama Org di InfluxDB" required>
              <input id="influx_org" name="influx_org" type="text"
                value={form.influx_org} onChange={handleChange}
                placeholder="my-org" className={inputClass} required />
            </FormField>
            <FormField label="Bucket" id="influx_bucket" hint="Nama bucket penyimpanan data" required>
              <input id="influx_bucket" name="influx_bucket" type="text"
                value={form.influx_bucket} onChange={handleChange}
                placeholder="power_monitor" className={inputClass} required />
            </FormField>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Token */}
          <FormField
            label="API Token"
            id="influx_token"
            hint={tokenMasked ? `Token tersimpan: ${tokenMasked} — Isi untuk menggantinya.` : 'Token belum tersimpan.'}
          >
            <div className="relative">
              <input id="influx_token" name="influx_token"
                type={showToken ? 'text' : 'password'}
                value={form.influx_token} onChange={handleChange}
                placeholder={tokenMasked ? 'Isi untuk ganti token...' : 'Masukkan API token InfluxDB'}
                className={`${inputClass} pr-11 font-mono text-xs`} />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* Info box */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 text-xs text-violet-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Token InfluxDB tidak pernah ditampilkan secara penuh demi keamanan. Perubahan efektif langsung tanpa perlu restart backend.</span>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700
                         text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-md shadow-violet-200">
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Menyimpan...</span></>
                : <><Save className="w-4 h-4" /><span>Simpan Perubahan</span></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
