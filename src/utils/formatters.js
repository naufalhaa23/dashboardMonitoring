/**
 * Format angka ke Rupiah
 * @param {number} value
 * @param {boolean} compact — use compact notation for large numbers
 * @returns {string}
 */
export function formatRupiah(value, compact = false) {
  if (value == null || isNaN(value)) return 'Rp 0';
  
  if (compact && value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format kWh value
 * @param {number} value
 * @returns {string}
 */
export function formatKWh(value) {
  if (value == null || isNaN(value)) return '0.00';
  return value.toFixed(2);
}

/**
 * Format voltage value
 * @param {number} value
 * @returns {string}
 */
export function formatVoltage(value) {
  if (value == null || isNaN(value)) return '0.0';
  return value.toFixed(1);
}

/**
 * Format ampere value
 * @param {number} value
 * @returns {string}
 */
export function formatAmpere(value) {
  if (value == null || isNaN(value)) return '0.00';
  return value.toFixed(2);
}

/**
 * Format watt value
 * @param {number} value
 * @returns {string}
 */
export function formatWatt(value) {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kW`;
  }
  return `${value.toFixed(0)} W`;
}

/**
 * Format time (HH:mm:ss) dalam WIB
 * @param {Date|string} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format date (DD MMM YYYY)
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date short (DD/MM)
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Format chart time axis (HH:mm)
 * @param {string} timestamp
 * @returns {string}
 */
export function formatChartTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
