import { useEffect, useRef, useState, useCallback } from 'react';
import { UI_SYNC_INTERVAL, WBP_START_HOUR, WBP_END_HOUR, TARIFF } from '../utils/constants';

/**
 * Generate realistic mock sensor data
 */
function generateMockData() {
  const now = new Date();
  const hour = now.getHours();
  const isWBP = hour >= WBP_START_HOUR && hour < WBP_END_HOUR;

  // Simulate realistic voltage fluctuation (215-225V) for 3 phases
  const baseVoltage = 220;
  const voltage1 = baseVoltage + (Math.random() - 0.5) * 10;
  const voltage2 = baseVoltage + 1 + (Math.random() - 0.5) * 10;
  const voltage3 = baseVoltage - 1 + (Math.random() - 0.5) * 10;

  // Simulate ampere based on time of day (higher during work hours)
  let baseAmpere = 8;
  if (hour >= 8 && hour < 17) baseAmpere = 25 + Math.random() * 15; // Work hours
  else if (isWBP) baseAmpere = 18 + Math.random() * 10; // WBP evening
  else baseAmpere = 5 + Math.random() * 8; // Night/early morning

  const ampere1 = Math.max(0, baseAmpere + (Math.random() - 0.5) * 3);
  const ampere2 = Math.max(0, baseAmpere + (Math.random() - 0.5) * 3);
  const ampere3 = Math.max(0, baseAmpere + (Math.random() - 0.5) * 3);

  const avgVoltage = (voltage1 + voltage2 + voltage3) / 3.0;
  const totalAmpere = ampere1 + ampere2 + ampere3;
  const watt = (voltage1 * ampere1) + (voltage2 * ampere2) + (voltage3 * ampere3);
  const tariff = isWBP ? TARIFF.WBP : TARIFF.LWBP;

  // Simulate accumulated values (increases throughout the day)
  const minutesSinceMidnight = hour * 60 + now.getMinutes();
  const kwhBase = (minutesSinceMidnight / 60) * watt / 1000;
  const kwhWBP = isWBP ? kwhBase * 0.3 + Math.random() * 5 : 45 + Math.random() * 10;
  const kwhLWBP = !isWBP ? kwhBase * 0.7 + Math.random() * 5 : 120 + Math.random() * 15;
  const totalRupiah = (kwhWBP * TARIFF.WBP) + (kwhLWBP * TARIFF.LWBP);

  return {
    voltage1: parseFloat(voltage1.toFixed(1)),
    voltage2: parseFloat(voltage2.toFixed(1)),
    voltage3: parseFloat(voltage3.toFixed(1)),
    ampere1: parseFloat(ampere1.toFixed(2)),
    ampere2: parseFloat(ampere2.toFixed(2)),
    ampere3: parseFloat(ampere3.toFixed(2)),
    avgVoltage: parseFloat(avgVoltage.toFixed(1)),
    totalAmpere: parseFloat(totalAmpere.toFixed(2)),
    watt: parseFloat(watt.toFixed(2)),
    status: isWBP ? 'WBP' : 'LWBP',
    tariff,
    totalRupiah: parseFloat(totalRupiah.toFixed(0)),
    kwhWBP: parseFloat(kwhWBP.toFixed(2)),
    kwhLWBP: parseFloat(kwhLWBP.toFixed(2)),
    timestamp: now.toISOString(),
  };
}

/**
 * Custom hook for Socket.io connection with mock data fallback.
 * Uses useRef buffer to prevent excessive re-renders from 1s data updates.
 *
 * @param {boolean} useMock — force mock data mode
 * @returns {{ displayData, isConnected, connectionStatus }}
 */
export function useSocket(useMock = true) {
  const socketRef = useRef(null);
  const dataBuffer = useRef(null);
  const [displayData, setDisplayData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(useMock ? 'mock' : 'connecting');

  const isConnected = connectionStatus === 'connected' || connectionStatus === 'mock';

  // Initialize — socket or mock
  useEffect(() => {
    if (useMock) {
      // Mock mode: generate data every 1 second
      setConnectionStatus('mock');
      dataBuffer.current = generateMockData();
      setDisplayData(dataBuffer.current);

      const mockInterval = setInterval(() => {
        dataBuffer.current = generateMockData();
      }, 1000);

      return () => clearInterval(mockInterval);
    }

    // Real socket mode (for when backend is ready)
    let isMounted = true;
    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const { SOCKET_URL } = await import('../utils/constants');

        if (!isMounted) return;

        const socket = io(SOCKET_URL, {
          transports: ['polling'], // Paksa pakai polling karena Werkzeug Python tidak support native WebSocket
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setConnectionStatus('connected');
        });

        socket.on('disconnect', () => {
          setConnectionStatus('disconnected');
        });

        socket.on('connect_error', () => {
          setConnectionStatus('error');
        });

        socket.on('sensor-data', (data) => {
          dataBuffer.current = data;
        });
      } catch {
        if (isMounted) setConnectionStatus('error');
      }
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [useMock]);

  // Sync buffer → state at controlled rate (5fps)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (dataBuffer.current) {
        setDisplayData((prev) => {
          // Only update if data actually changed
          if (prev && prev.timestamp === dataBuffer.current.timestamp) return prev;
          return { ...dataBuffer.current };
        });
      }
    }, UI_SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, []);

  return { displayData, isConnected, connectionStatus };
}

/**
 * Hook to accumulate trend data points for the 24h chart.
 * Samples from displayData at defined intervals.
 *
 * @param {object} displayData — current sensor data
 * @param {number} sampleInterval — ms between samples (default 5000 for demo)
 * @param {number} maxPoints — max data points to keep
 * @returns {Array} trendData
 */
export function useTrendData(displayData, sampleInterval = 5000, maxPoints = 300) {
  const [trendData, setTrendData] = useState([]);
  const lastSampleRef = useRef(0);

  useEffect(() => {
    if (!displayData) return;

    const now = Date.now();
    if (now - lastSampleRef.current < sampleInterval) return;
    lastSampleRef.current = now;

    setTrendData((prev) => {
      const newPoint = {
        time: displayData.timestamp,
        watt: displayData.watt,
        voltage: displayData.avgVoltage || displayData.voltage1 || 0,
        ampere: displayData.totalAmpere || (displayData.ampere1 * 3) || 0,
      };

      const updated = [...prev, newPoint];
      if (updated.length > maxPoints) {
        return updated.slice(updated.length - maxPoints);
      }
      return updated;
    });
  }, [displayData, sampleInterval, maxPoints]);

  return trendData;
}
