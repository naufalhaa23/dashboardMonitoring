/**
 * InfluxSettingsPage.jsx — Halaman konfigurasi InfluxDB (Admin only).
 * 100% Inline Style bypass Tailwind caching, presisi sesuai referensi.
 */

import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Header from '../components/Header';

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#fff',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  transition: 'border-color 0.2s'
};

function AlertBanner({ type, message }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle : AlertCircle;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
      borderRadius: '8px', fontSize: '14px', marginBottom: '24px',
      backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
      color: isSuccess ? '#15803d' : '#b91c1c'
    }}>
      <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: '500' }}>{message}</span>
    </div>
  );
}

function FieldLabel({ children, htmlFor, required }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block', fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '8px'
      }}
    >
      {children}{required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
    </label>
  );
}

export default function InfluxSettingsPage() {
  const { connectionStatus } = useSocket(false);
  const [form, setForm] = useState({
    influx_url: '', influx_org: '', influx_bucket: '', influx_token: ''
  });
  const [tokenMasked, setTokenMasked] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/settings/influx');
        const d = res.data;
        setForm({
          influx_url: d.influx_url || '',
          influx_org: d.influx_org || '',
          influx_bucket: d.influx_bucket || '',
          influx_token: '',
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

  const handleReset = () => {
    setForm({ influx_url: '', influx_org: '', influx_bucket: '', influx_token: '' });
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
        setTokenMasked(t.length > 8 ? t.slice(0, 4) + '••••' + t.slice(-4) : '••••');
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <Header title="InfluxDB Settings" connectionStatus={connectionStatus} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Header title="InfluxDB Settings" connectionStatus={connectionStatus} />

      <div style={{ padding: '32px', width: '100%', maxWidth: '860px', margin: '0 auto', flex: 1, boxSizing: 'border-box' }}>

        {/* Page Heading */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.025em' }}>
            Database Connection
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Configure the connection parameters for your InfluxDB instance to enable time-series data logging from industrial sensors.
          </p>
        </div>

        <AlertBanner {...alert} />

        {/* Security info box (Match Reference 2) */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 20px',
          borderRadius: '8px', marginBottom: '32px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe'
        }}>
          <Info style={{ width: '20px', height: '20px', color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>
              Security Recommendation
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              Ensure that your API Token has restricted write-only access to the specific bucket to minimize security risks. Do not expose this token in client-side code.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <form onSubmit={handleSubmit}>

            {/* Card Body */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Server URL */}
              <div>
                <FieldLabel htmlFor="influx_url">Server URL</FieldLabel>
                <input
                  id="influx_url" name="influx_url" type="url"
                  value={form.influx_url} onChange={handleChange}
                  placeholder="http://localhost:8086"
                  style={inputStyle} required
                />
              </div>

              {/* Organization + Bucket Row */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <FieldLabel htmlFor="influx_org">Organization</FieldLabel>
                  <input
                    id="influx_org" name="influx_org" type="text"
                    value={form.influx_org} onChange={handleChange}
                    placeholder="e.g., PowerMeter Inc"
                    style={inputStyle} required
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <FieldLabel htmlFor="influx_bucket">Bucket Name</FieldLabel>
                  <input
                    id="influx_bucket" name="influx_bucket" type="text"
                    value={form.influx_bucket} onChange={handleChange}
                    placeholder="sensor_data"
                    style={inputStyle} required
                  />
                </div>
              </div>

              {/* API Token */}
              <div>
                <FieldLabel htmlFor="influx_token">API Token</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    id="influx_token" name="influx_token"
                    type={showToken ? 'text' : 'password'}
                    value={form.influx_token} onChange={handleChange}
                    placeholder={tokenMasked ? '••••••••••••••••••••••••••••' : '••••••••••••••••••••••••••••'}
                    style={{ ...inputStyle, paddingRight: '40px', fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      padding: '4px', display: 'flex', alignItems: 'center'
                    }}
                  >
                    {showToken ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0 0' }}>
                  Provide a token with read/write permissions to the specified bucket.
                </p>
              </div>

            </div>

            {/* Card Footer */}
            <div style={{
              padding: '24px 32px', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '12px'
            }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '10px 24px', borderRadius: '8px', backgroundColor: '#ffffff',
                  color: '#0f172a', fontSize: '14px', fontWeight: '500',
                  border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'background-color 0.2s'
                }}
              >
                Reset
              </button>
              <button
                id="btn-influx-save"
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px',
                  borderRadius: '8px', backgroundColor: '#3b31d4', color: '#ffffff',
                  fontSize: '14px', fontWeight: '500', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                {saving ? (
                  <><RefreshCw style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /><span>Menyimpan...</span></>
                ) : (
                  <><Save style={{ width: '18px', height: '18px' }} /><span>Simpan Perubahan</span></>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}