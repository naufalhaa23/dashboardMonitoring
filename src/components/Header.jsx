/**
 * Header.jsx — Top bar dengan page title, jam digital, tanggal, dan status koneksi.
 * Update: Force padding agar lega dan simetris.
 */

import { useState, useEffect, memo } from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTime(date) {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

function formatDate(date) {
  const hari = HARI[date.getDay()];
  const tgl = date.getDate();
  const bln = BULAN[date.getMonth()];
  const thn = date.getFullYear();
  return `${hari}, ${tgl} ${bln} ${thn}`;
}

const Header = memo(function Header({ title, connectionStatus = 'mock' }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusConfig = {
    connected: { dot: '#22c55e', label: 'Connected', icon: Wifi, bg: '#f0fdf4', text: '#16a34a' },
    mock: { dot: '#6366f1', label: 'Connected', icon: Wifi, bg: '#eef2ff', text: '#4f46e5' },
    connecting: { dot: '#f59e0b', label: 'Connecting…', icon: Wifi, bg: '#fffbeb', text: '#b45309' },
    disconnected: { dot: '#ef4444', label: 'Disconnected', icon: WifiOff, bg: '#fef2f2', text: '#dc2626' },
    error: { dot: '#ef4444', label: 'Error', icon: WifiOff, bg: '#fef2f2', text: '#dc2626' },
  };

  const st = statusConfig[connectionStatus] || statusConfig.connecting;
  const Icon = st.icon;

  return (
    <header
      className="flex items-center justify-between w-full bg-white border-b border-slate-200"
      style={{
        height: '72px',      /* Tambah tinggi sedikit agar lebih lega */
        paddingLeft: '32px',  /* Paksa jarak kiri */
        paddingRight: '32px'  /* Paksa jarak kanan */
      }}
    >
      {/* Left: Page Title */}
      <div>
        {title && (
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
        )}
      </div>

      {/* Right: Date · Time · Status */}
      <div className="flex items-center" style={{ gap: '24px' }}>

        {/* Date */}
        <span className="text-[13px] font-medium text-slate-500 hidden sm:block">
          {formatDate(now)}
        </span>

        {/* Divider */}
        <span className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* Clock */}
        <div className="flex items-center text-slate-700" style={{ gap: '8px' }}>
          <Clock className="w-4.5 h-4.5 text-slate-400" strokeWidth={2} />
          <span className="font-mono text-[14px] font-semibold tabular-nums tracking-tight">
            {formatTime(now)}
          </span>
        </div>

        {/* Divider */}
        <span className="w-px h-5 bg-slate-200" />

        {/* Connection Status Pill */}
        <div
          className="flex items-center rounded-full"
          style={{
            background: st.bg,
            padding: '6px 14px',
            gap: '8px'
          }}
          id="header-connection-status"
        >
          {/* Animated dot */}
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
              style={{ background: st.dot }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: st.dot }}
            />
          </span>
          <Icon className="w-3.5 h-3.5" style={{ color: st.text }} strokeWidth={2.5} />
          <span className="text-[12px] font-bold" style={{ color: st.text }}>
            {st.label}
          </span>
        </div>
      </div>
    </header>
  );
});

export default Header;