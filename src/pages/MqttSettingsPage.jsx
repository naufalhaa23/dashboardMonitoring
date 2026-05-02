/**
 * MqttSettingsPage.jsx — Halaman konfigurasi MQTT Broker (Admin only).
 *
 * - GET /api/settings/mqtt  : muat konfigurasi saat ini
 * - PUT /api/settings/mqtt  : simpan perubahan
 */

import { useState, useEffect } from 'react';
import { Wifi, Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import api from '../services/api';

function PageHeader({ title, subtitle, icon: Icon, iconColor, iconBg }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

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

function FormField({ label, id, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">{label}</label>
      {hint && <p className="text-xs text-text-muted -mt-1">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass = `w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary
                    placeholder-text-muted outline-none transition-all duration-200
                    focus:border-primary-400 focus:ring-2 focus:ring-primary-100`;

export default function MqttSettingsPage() {
  const [form, setForm]       = useState({ mqtt_broker: '', mqtt_port: '1883', mqtt_topic: '', mqtt_username: '', mqtt_password: '' });
  const [hasPass, setHasPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [alert, setAlert]     = useState({ type: '', message: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/settings/mqtt');
        const d = res.data;
        setForm({
          mqtt_broker:   d.mqtt_broker   || '',
          mqtt_port:     d.mqtt_port     || '1883',
          mqtt_topic:    d.mqtt_topic    || '',
          mqtt_username: d.mqtt_username || '',
          mqtt_password: '', // Tidak menampilkan password asli
        });
        setHasPass(d.mqtt_password_set || false);
      } catch (err) {
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
      <div className="p-6 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <PageHeader
        title="MQTT Settings"
        subtitle="Konfigurasi koneksi ke MQTT Broker"
        icon={Wifi}
        iconColor="text-primary-600"
        iconBg="bg-primary-50"
      />

      <div className="glass-card rounded-2xl p-6">
        <Alert {...alert} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Broker & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Broker IP / Hostname" id="mqtt_broker" hint="Contoh: 192.168.1.100 atau broker.emqx.io">
                <input id="mqtt_broker" name="mqtt_broker" type="text"
                  value={form.mqtt_broker} onChange={handleChange}
                  placeholder="192.168.1.100" className={inputClass} required />
              </FormField>
            </div>
            <FormField label="Port" id="mqtt_port">
              <input id="mqtt_port" name="mqtt_port" type="number"
                value={form.mqtt_port} onChange={handleChange}
                placeholder="1883" min="1" max="65535" className={inputClass} required />
            </FormField>
          </div>

          {/* Topic */}
          <FormField label="Topic" id="mqtt_topic" hint="Contoh: sensor/power_meter">
            <input id="mqtt_topic" name="mqtt_topic" type="text"
              value={form.mqtt_topic} onChange={handleChange}
              placeholder="sensor/power_meter" className={inputClass} required />
          </FormField>

          {/* Divider */}
          <div className="border-t border-border" />
          <p className="text-sm font-semibold text-text-secondary -mb-1">Kredensial (Opsional)</p>

          {/* Username */}
          <FormField label="Username" id="mqtt_username">
            <input id="mqtt_username" name="mqtt_username" type="text"
              value={form.mqtt_username} onChange={handleChange}
              placeholder="Kosongkan jika tidak ada" className={inputClass} />
          </FormField>

          {/* Password */}
          <FormField
            label="Password"
            id="mqtt_password"
            hint={hasPass ? '● Password sudah tersimpan. Isi untuk menggantinya.' : 'Kosongkan jika tidak ada.'}
          >
            <div className="relative">
              <input id="mqtt_password" name="mqtt_password"
                type={showPass ? 'text' : 'password'}
                value={form.mqtt_password} onChange={handleChange}
                placeholder={hasPass ? 'Isi untuk ganti password...' : 'Password MQTT'}
                className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* Info box */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Perubahan konfigurasi MQTT akan langsung aktif di runtime. Restart backend hanya diperlukan jika server mengalami masalah koneksi.</span>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700
                         text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-md shadow-primary-200">
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
