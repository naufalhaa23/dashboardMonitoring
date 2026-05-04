import { useState, useEffect } from 'react';
import { Banknote, Zap, ZapOff } from 'lucide-react';
import Header from '../components/Header';
import GaugeCard from '../components/GaugeCard';
import StatusIndicator from '../components/StatusIndicator';
import SummaryCard from '../components/SummaryCard';
import PowerTrendChart from '../components/PowerTrendChart';
import HistoricalSection from '../components/HistoricalSection';
import Footer from '../components/Footer';
import { useSocket, useTrendData } from '../hooks/useSocket';
import { GAUGE_CONFIG } from '../utils/constants';
import { formatRupiah, formatWatt } from '../utils/formatters';
import { getDevices } from '../services/deviceService';

export default function DashboardPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("default_sensor");

  useEffect(() => {
    getDevices().then(data => {
      setDevices(data);
      if (data.length > 0 && !data.some(d => d.device_id === selectedDeviceId)) {
        setSelectedDeviceId(data[0].device_id);
      }
    }).catch(err => console.error("Gagal load devices", err));
  }, []);

  const { displayData, isConnected, connectionStatus } = useSocket(false, selectedDeviceId);
  const trendData = useTrendData(displayData, 5000, 300);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="Dashboard Reporting" connectionStatus={connectionStatus} />

      {/* Gunakan gap-6 untuk jarak antar baris utama */}
      <div className="p-6 w-full max-w-[1600px] mx-auto flex-1 flex flex-col gap-6">

        {/* ── Device Selector ─────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '-10px' }}>
          <span style={{ marginRight: '12px', fontWeight: '600', color: '#64748b', fontSize: '14px' }}>Pilih Alat:</span>
          <select 
            value={selectedDeviceId} 
            onChange={e => setSelectedDeviceId(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 'bold', color: '#1e293b', outline: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', minWidth: '200px' }}
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>{d.name} ({d.device_id})</option>
            ))}
            {devices.length === 0 && <option value="default_sensor">Default Sensor</option>}
          </select>
        </div>

        {/* ── Gauge Section ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ marginTop: '10px' }}>
          {/* Baris 1: Voltage */}
          {[
            { value: displayData?.voltage1 || 0, label: 'Voltage (R)', config: GAUGE_CONFIG.voltage, color: '#dc2626' },
            { value: displayData?.voltage2 || 0, label: 'Voltage (S)', config: GAUGE_CONFIG.voltage, color: '#dc2626' },
            { value: displayData?.voltage3 || 0, label: 'Voltage (T)', config: GAUGE_CONFIG.voltage, color: '#dc2626' },
          ].map(({ value, label, config, color }) => (
            <div key={label} className="glass-card bg-white rounded-2xl p-4 flex justify-center items-center shadow-sm">
              <GaugeCard value={value} {...config} color={color} label={label} />
            </div>
          ))}

          {/* Baris 2: Ampere */}
          {[
            { value: displayData?.ampere1 || 0, label: 'Ampere (R)', config: GAUGE_CONFIG.ampere, color: '#059669' },
            { value: displayData?.ampere2 || 0, label: 'Ampere (S)', config: GAUGE_CONFIG.ampere, color: '#059669' },
            { value: displayData?.ampere3 || 0, label: 'Ampere (T)', config: GAUGE_CONFIG.ampere, color: '#059669' },
          ].map(({ value, label, config, color }) => (
            <div key={label} className="glass-card bg-white rounded-2xl p-4 flex justify-center items-center shadow-sm">
              <GaugeCard value={value} {...config} color={color} label={label} />
            </div>
          ))}
        </div>

        {/* ── Real-time Power Info Bar ──────────────────────────── */}
        <div
          className="glass-card bg-white border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in-up shadow-sm"
          style={{ padding: '20px 24px' }} /* <-- INI KUNCINYA, dipaksa lega */
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff7ed' }}>
              <Zap className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[14px] text-slate-500 font-semibold">Daya Saat Ini</span>
              <span className="font-mono text-[22px] font-bold text-orange-600">{formatWatt(displayData?.watt || 0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[13px] font-semibold">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /><span className="text-slate-400">V_AVG: <span className="text-slate-700">{displayData?.avgVoltage?.toFixed(1) || '0.0'}V</span></span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /><span className="text-slate-400">A_TOT: <span className="text-slate-700">{displayData?.totalAmpere?.toFixed(2) || '0.00'}A</span></span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-600" /><span className="text-slate-700">{displayData?.watt?.toFixed(0) || '0'}W</span></div>
          </div>
        </div>

        {/* ── Charts ─────────────────────────────────── */}
        <div
          className="glass-card bg-white border border-slate-100 rounded-2xl animate-fade-in-up shadow-sm"
          style={{ padding: '24px' }} /* <-- INI KUNCINYA, dipaksa lega */
        >
          <PowerTrendChart trendData={trendData} />
        </div>

        <div
          className="glass-card bg-white border border-slate-100 rounded-2xl animate-fade-in-up shadow-sm"
          style={{ padding: '24px' }} /* <-- INI KUNCINYA, dipaksa lega */
        >
          <HistoricalSection />
        </div>

        <Footer lastUpdate={displayData?.timestamp} connectionStatus={connectionStatus} />
      </div>
    </div>
  );
}