import { useState, useCallback } from 'react';
import { API_BASE_URL, TARIFF } from '../utils/constants';

/**
 * Generate mock historical data for development (daily granularity)
 */
function generateMockHistory(fromDate, toDate) {
  const data = [];
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const current = new Date(from);

  while (current <= to) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseKwhWBP = isWeekend ? 30 + Math.random() * 15 : 50 + Math.random() * 20;
    const baseKwhLWBP = isWeekend ? 80 + Math.random() * 30 : 130 + Math.random() * 40;
    const totalKwh = baseKwhWBP + baseKwhLWBP;
    const avgWatt = (totalKwh * 1000) / 24;
    const totalRupiah = (baseKwhWBP * TARIFF.WBP) + (baseKwhLWBP * TARIFF.LWBP);

    data.push({
      date: current.toISOString().split('T')[0],
      totalRupiah: Math.round(totalRupiah),
      kwhWBP: parseFloat(baseKwhWBP.toFixed(2)),
      kwhLWBP: parseFloat(baseKwhLWBP.toFixed(2)),
      totalKwh: parseFloat(totalKwh.toFixed(2)),
      totalWatt: parseFloat(avgWatt.toFixed(0)),
    });

    current.setDate(current.getDate() + 1);
  }

  return data;
}

/**
 * Aggregate daily data into monthly buckets
 * @param {Array} dailyData
 * @returns {Array} monthly aggregated data
 */
function aggregateMonthly(dailyData) {
  const monthMap = new Map();

  dailyData.forEach((d) => {
    const date = new Date(d.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        date: key,
        totalRupiah: 0,
        kwhWBP: 0,
        kwhLWBP: 0,
        totalKwh: 0,
        totalWatt: 0,
        dayCount: 0,
      });
    }

    const bucket = monthMap.get(key);
    bucket.totalRupiah += d.totalRupiah;
    bucket.kwhWBP += d.kwhWBP;
    bucket.kwhLWBP += d.kwhLWBP;
    bucket.totalKwh += d.totalKwh;
    bucket.totalWatt += d.totalWatt || 0;
    bucket.dayCount += 1;
  });

  return Array.from(monthMap.values()).map((m) => ({
    date: m.date,
    totalRupiah: Math.round(m.totalRupiah),
    kwhWBP: parseFloat(m.kwhWBP.toFixed(2)),
    kwhLWBP: parseFloat(m.kwhLWBP.toFixed(2)),
    totalKwh: parseFloat(m.totalKwh.toFixed(2)),
    totalWatt: m.dayCount > 0 ? Math.round(m.totalWatt / m.dayCount) : 0,
    dayCount: m.dayCount,
  }));
}

/**
 * Determine if date range spans multiple months
 */
function shouldAggregateMonthly(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));

  // Only aggregate monthly if range > 35 days AND spans multiple months
  const crossesMonths =
    from.getFullYear() !== to.getFullYear() ||
    from.getMonth() !== to.getMonth();

  return diffDays > 35 && crossesMonths;
}

/**
 * Custom hook for fetching historical data from REST API.
 * Falls back to mock data when backend is unavailable.
 *
 * @returns {{ data, rawData, loading, error, fetchHistory, summary, isMonthly }}
 */
export function useHistoricalData() {
  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isMonthly, setIsMonthly] = useState(false);

  const fetchHistory = useCallback(async (fromDate, toDate, monthly = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/history?from=${fromDate}&to=${toDate}`
      );
      if (!response.ok) throw new Error('API error');
      const result = await response.json();
      processData(result, monthly);
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 600));
        const mockData = generateMockHistory(fromDate, toDate);
        processData(mockData, monthly);
      } catch (mockErr) {
        setError('Gagal memuat data historis');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function processData(dailyData, monthly) {
    setRawData(dailyData);
    setIsMonthly(monthly);

    if (monthly) {
      const aggregated = aggregateMonthly(dailyData);
      setData(aggregated);
      setSummary(calculateSummary(dailyData));
    } else {
      setData(dailyData);
      setSummary(calculateSummary(dailyData));
    }
  }

  return { data, rawData, loading, error, fetchHistory, summary, isMonthly };
}

/**
 * Calculate summary statistics from historical data array
 */
function calculateSummary(data) {
  if (!data || data.length === 0) return null;

  const totalRupiah = data.reduce((sum, d) => sum + d.totalRupiah, 0);
  const totalKwhWBP = data.reduce((sum, d) => sum + d.kwhWBP, 0);
  const totalKwhLWBP = data.reduce((sum, d) => sum + d.kwhLWBP, 0);

  return {
    totalRupiah,
    totalKwhWBP: parseFloat(totalKwhWBP.toFixed(2)),
    totalKwhLWBP: parseFloat(totalKwhLWBP.toFixed(2)),
    totalKwh: parseFloat((totalKwhWBP + totalKwhLWBP).toFixed(2)),
    days: data.length,
  };
}
