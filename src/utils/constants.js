// Socket.io server URL — change this when backend is ready
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// REST API base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tarif listrik (Rp/kWh) — sesuaikan dengan tarif PLN terbaru
export const TARIFF = {
  WBP: 1553.67,
  LWBP: 1035.78,
};

// WBP time range (18:00 - 22:00 WIB)
export const WBP_START_HOUR = 18;
export const WBP_END_HOUR = 22;

// Gauge thresholds
export const GAUGE_CONFIG = {
  voltage: {
    min: 0,
    max: 300,
    unit: 'V',
    label: 'Voltage',
    warningMin: 198,
    warningMax: 242,
    dangerMin: 180,
    dangerMax: 260,
    color: '#0891b2',
  },
  ampere: {
    min: 0,
    max: 400,
    unit: 'A',
    label: 'Ampere',
    warningMax: 500,
    dangerMax: 700,
    color: '#059669',
  },
};

// Chart colors
export const CHART_COLORS = {
  power: '#d97706',
  powerGradientStart: 'rgba(217, 119, 6, 0.25)',
  powerGradientEnd: 'rgba(217, 119, 6, 0.02)',
  wbpZone: 'rgba(220, 38, 38, 0.08)',
  grid: '#f1f5f9',
  axis: '#94a3b8',
  tooltip: '#0f172a',
};

// Update intervals
export const UI_SYNC_INTERVAL = 200; // ms — sync ref to state
export const TREND_SAMPLE_INTERVAL = 60000; // ms — 1 point per minute for chart
export const MAX_TREND_POINTS = 1440; // 24 hours at 1 per minute
export const CLOCK_INTERVAL = 1000; // ms

// Historical filter presets
// mode: 'daily' = DD/MM x-axis, 'monthly' = MMM YYYY x-axis
export const DATE_PRESETS = [
  { label: '7 Hari', days: 7, mode: 'daily' },
  { label: '30 Hari', days: 30, mode: 'daily' },
  { label: 'Per Bulan', days: 180, mode: 'monthly' },
];
