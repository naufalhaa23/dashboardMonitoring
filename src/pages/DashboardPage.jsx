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

export default function DashboardPage() {
  const { displayData, isConnected, connectionStatus } = useSocket(false);
  const trendData = useTrendData(displayData, 5000, 300);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="Dashboard Reporting" connectionStatus={connectionStatus} />

      {/* Gunakan gap-6 untuk jarak antar baris utama */}
      <div className="p-6 w-full max-w-[1600px] mx-auto flex-1 flex flex-col gap-6">

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