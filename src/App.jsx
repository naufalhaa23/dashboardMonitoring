import { Banknote, Zap, ZapOff } from 'lucide-react';
import Header from './components/Header';
import GaugeCard from './components/GaugeCard';
import StatusIndicator from './components/StatusIndicator';
import SummaryCard from './components/SummaryCard';
import PowerTrendChart from './components/PowerTrendChart';
import HistoricalSection from './components/HistoricalSection';
import Footer from './components/Footer';
import { useSocket, useTrendData } from './hooks/useSocket';
import { GAUGE_CONFIG } from './utils/constants';
import { formatRupiah, formatWatt } from './utils/formatters';

function App() {
  // Use mock data mode — set to false when backend is ready
  const { displayData, isConnected, connectionStatus } = useSocket(false);

  // Accumulate trend data for the 24h chart (sample every 5s in demo)
  const trendData = useTrendData(displayData, 5000, 300);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <Header connectionStatus={connectionStatus} />

        {/* Row 1: Gauges (R, S, T) */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Phase R */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 bg-surface-secondary/30 rounded-2xl p-3">
              <div className="w-full flex-1">
                <GaugeCard value={displayData?.voltage1 || 0} {...GAUGE_CONFIG.voltage} label="Voltage (R)" />
              </div>
              <div className="w-full flex-1">
                <GaugeCard value={displayData?.ampere1 || 0} {...GAUGE_CONFIG.ampere} label="Ampere (R)" />
              </div>
            </div>
            {/* Phase S */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 bg-surface-secondary/30 rounded-2xl p-3">
              <div className="w-full flex-1">
                <GaugeCard value={displayData?.voltage2 || 0} {...GAUGE_CONFIG.voltage} label="Voltage (S)" />
              </div>
              <div className="w-full flex-1">
                <GaugeCard value={displayData?.ampere2 || 0} {...GAUGE_CONFIG.ampere} label="Ampere (S)" />
              </div>
            </div>
            {/* Phase T */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 bg-surface-secondary/30 rounded-2xl p-3">
              <div className="w-full flex-1">
                <GaugeCard value={displayData?.voltage3 || 0} {...GAUGE_CONFIG.voltage} label="Voltage (T)" />
              </div>
              <div className="w-full flex-1">
                <GaugeCard value={displayData?.ampere3 || 0} {...GAUGE_CONFIG.ampere} label="Ampere (T)" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Biaya Hari Ini"
            value={displayData?.totalRupiah || 0}
            formattedValue={(v) => formatRupiah(v)}
            subtitle="Akumulasi sejak 00:00 WIB"
            icon={Banknote}
            color="#7c3aed"
            bgColor="#f5f3ff"
          />
          <SummaryCard
            title="kWh WBP"
            value={displayData?.kwhWBP || 0}
            formattedValue={(v) => `${v.toFixed(2)} kWh`}
            subtitle="Waktu Beban Puncak (18:00–22:00)"
            icon={Zap}
            color="#dc2626"
            bgColor="#fef2f2"
          />
          <SummaryCard
            title="kWh LWBP"
            value={displayData?.kwhLWBP || 0}
            formattedValue={(v) => `${v.toFixed(2)} kWh`}
            subtitle="Luar Waktu Beban Puncak"
            icon={ZapOff}
            color="#16a34a"
            bgColor="#f0fdf4"
          />
          <StatusIndicator
            status={displayData?.status || 'LWBP'}
            tariff={displayData?.tariff}
          />
        </div>


        {/* Row 3: Real-time Power Info Bar */}
        <div className="glass-card rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-power-light flex items-center justify-center">
              <Zap className="w-4 h-4 text-power" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Daya Saat Ini</p>
              <p className="font-mono text-lg font-bold text-power">
                {formatWatt(displayData?.watt || 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-voltage" />
              <span className="font-mono font-medium">V_AVG: {displayData?.avgVoltage?.toFixed(1) || '0.0'}V</span>
            </div>
            <span className="text-text-muted/30">×</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ampere" />
              <span className="font-mono font-medium">A_TOT: {displayData?.totalAmpere?.toFixed(2) || '0.00'}A</span>
            </div>
            <span className="text-text-muted/30">=</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-power" />
              <span className="font-mono font-semibold text-text-primary">{displayData?.watt?.toFixed(0) || '0'}W</span>
            </div>
          </div>
        </div>

        {/* Row 4: Power Trend Chart */}
        <PowerTrendChart trendData={trendData} />

        {/* Row 5: Historical Section */}
        <HistoricalSection />

        {/* Footer */}
        <Footer
          lastUpdate={displayData?.timestamp}
          connectionStatus={connectionStatus}
        />
      </div>
    </div>
  );
}

export default App;
