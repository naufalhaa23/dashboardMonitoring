/**
 * MqttSettingsPage.jsx — Halaman konfigurasi MQTT Broker (Admin only).
 * 100% Inline Style bypass Tailwind caching, presisi sesuai referensi.
 */

import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import api from '../services/api';
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
        display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'
      }}
    >
      {children}{required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
    </label>
  );
}

export default function MqttSettingsPage() {
  const [form, setForm] = useState({
    mqtt_broker: '', mqtt_port: '1883', mqtt_topic: '',
    mqtt_username: '', mqtt_password: ''
  });
  const [hasPass, setHasPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/settings/mqtt');
        const d = res.data;
        setForm({
          mqtt_broker: d.mqtt_broker || '',
          mqtt_port: d.mqtt_port || '1883',
          mqtt_topic: d.mqtt_topic || '',
          mqtt_username: d.mqtt_username || '',
          mqtt_password: '',
        });
        setHasPass(d.mqtt_password_set || false);
      } catch {
        setAlert({ type: 'error', message: 'Gagal memuat konfigurasi MQTT.' });
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
      await api.put('/api/settings/mqtt', form);
      setAlert({ type: 'success', message: 'Konfigurasi MQTT berhasil disimpan!' });
      if (form.mqtt_password) setHasPass(true);
      setForm(prev => ({ ...prev, mqtt_password: '' }));
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <Header title="MQTT Settings" connectionStatus="mock" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Header title="MQTT Settings" connectionStatus="mock" />

      <div style={{ padding: '32px', width: '100%', maxWidth: '860px', margin: '0 auto', flex: 1, boxSizing: 'border-box' }}>

        {/* Page Heading */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.025em' }}>
            MQTT Settings
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Konfigurasi koneksi ke MQTT Broker
          </p>
        </div>

        <AlertBanner {...alert} />

        {/* Info box (Blue styling to match reference) */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 20px',
          borderRadius: '8px', marginBottom: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe'
        }}>
          <Info style={{ width: '20px', height: '20px', color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '14px', color: '#1e3a8a', margin: 0, lineHeight: '1.5' }}>
            Perubahan konfigurasi MQTT akan langsung aktif di runtime. Restart backend hanya diperlukan jika server mengalami masalah koneksi.
          </p>
        </div>

        {/* Form Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <form onSubmit={handleSubmit}>

            {/* Card Body */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Broker + Port Row */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '3 1 250px' }}>
                  <FieldLabel htmlFor="mqtt_broker" required>Broker IP / Hostname</FieldLabel>
                  <input
                    id="mqtt_broker" name="mqtt_broker" type="text"
                    value={form.mqtt_broker} onChange={handleChange}
                    placeholder="broker.emqx.io"
                    style={inputStyle} required
                  />
                </div>
                <div style={{ flex: '1 1 100px' }}>
                  <FieldLabel htmlFor="mqtt_port" required>Port</FieldLabel>
                  <input
                    id="mqtt_port" name="mqtt_port" type="number"
                    value={form.mqtt_port} onChange={handleChange}
                    placeholder="1883" min="1" max="65535"
                    style={inputStyle} required
                  />
                </div>
              </div>

              {/* Topic Row */}
              <div>
                <FieldLabel htmlFor="mqtt_topic" required>Topic</FieldLabel>
                <input
                  id="mqtt_topic" name="mqtt_topic" type="text"
                  value={form.mqtt_topic} onChange={handleChange}
                  placeholder="protos/pe11/data"
                  style={inputStyle} required
                />
              </div>

              {/* Divider for Credentials */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Credentials Section */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 16px 0' }}>
                  Credentials <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#64748b' }}>(Optional)</span>
                </h3>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <FieldLabel htmlFor="mqtt_username">Username</FieldLabel>
                    <input
                      id="mqtt_username" name="mqtt_username" type="text"
                      value={form.mqtt_username} onChange={handleChange}
                      placeholder="Masukkan username"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <FieldLabel htmlFor="mqtt_password">Password</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="mqtt_password" name="mqtt_password"
                        type={showPass ? 'text' : 'password'}
                        value={form.mqtt_password} onChange={handleChange}
                        placeholder={hasPass ? '••••••••' : 'Masukkan password'}
                        style={{ ...inputStyle, paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8',
                          padding: '4px', display: 'flex', alignItems: 'center'
                        }}
                      >
                        {showPass ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer (Gray Background) */}
            <div style={{
              padding: '16px 32px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              <button
                id="btn-mqtt-save"
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px',
                  borderRadius: '8px', backgroundColor: '#3b31d4', color: '#ffffff',
                  fontSize: '14px', fontWeight: '600', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                {saving ? (
                  <><RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span>Menyimpan...</span></>
                ) : (
                  <><Save style={{ width: '16px', height: '16px' }} /><span>Simpan Perubahan</span></>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}