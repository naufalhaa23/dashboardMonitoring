import { memo, useState, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';
import { Calendar, Search, Loader2, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useHistoricalData } from '../hooks/useHistoricalData';
import { formatRupiah, formatDateShort, formatDate } from '../utils/formatters';
import { DATE_PRESETS } from '../utils/constants';

// ── Helpers ──────────────────────────────────────────────────────

/** Format month label: "Apr 2026" */
function formatMonthLabel(dateStr) {
  const [year, month] = dateStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

/** Get x-axis label based on aggregation mode */
function getXLabel(dateStr, isMonthly) {
  if (isMonthly) return formatMonthLabel(dateStr);
  return formatDateShort(dateStr);
}

// ── Shared chart config builder ─────────────────────────────────

function buildChartOption({
  data,
  isMonthly,
  seriesName,
  seriesType,
  color,
  colorGradientEnd,
  yAxisFormatter,
  tooltipFormatter,
  showArea = false,
}) {
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: {
        color: '#f1f5f9',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      formatter: function (params) {
        const p = params[0];
        return `<div style="margin-bottom:4px;font-weight:600;color:#94a3b8">${p.axisValue}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
            <span>${seriesName}:</span>
            <span style="font-weight:700">${tooltipFormatter(p.value)}</span>
          </div>`;
      },
    },
    grid: {
      top: 12,
      right: 16,
      bottom: 24,
      left: 52,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => getXLabel(d.date, isMonthly)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 9,
        fontFamily: 'JetBrains Mono, monospace',
        interval: data.length > 15 ? Math.floor(data.length / 10) : 0,
        rotate: data.length > 20 && !isMonthly ? 45 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: {
        color: color,
        fontSize: 9,
        fontFamily: 'JetBrains Mono, monospace',
        formatter: yAxisFormatter,
      },
    },
    series: [
      {
        name: seriesName,
        type: seriesType,
        data: data.map((d) => {
          if (seriesName.includes('Biaya')) return d.totalRupiah;
          if (seriesName.includes('WBP') && !seriesName.includes('LWBP')) return d.kwhWBP;
          return d.kwhLWBP;
        }),
        smooth: seriesType === 'line',
        symbol: seriesType === 'line' ? (data.length > 30 ? 'none' : 'circle') : undefined,
        symbolSize: 5,
        barWidth: seriesType === 'bar' ? (data.length > 20 ? '65%' : '50%') : undefined,
        barMaxWidth: 32,
        lineStyle: seriesType === 'line' ? { width: 2.5, color } : undefined,
        itemStyle: {
          color: seriesType === 'bar'
            ? {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color },
                  { offset: 1, color: colorGradientEnd || color + '99' },
                ],
              }
            : color,
          borderRadius: seriesType === 'bar' ? [4, 4, 0, 0] : undefined,
        },
        areaStyle: showArea
          ? {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: color + '25' },
                  { offset: 1, color: color + '03' },
                ],
              },
            }
          : undefined,
      },
    ],
    animationDuration: 500,
    animationEasing: 'cubicOut',
  };
}

// ── Main Component ──────────────────────────────────────────────

const HistoricalSection = memo(function HistoricalSection() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [activePreset, setActivePreset] = useState(0);
  const [currentMode, setCurrentMode] = useState('daily'); // 'daily' | 'monthly'
  const { data, rawData, loading, error, fetchHistory, summary, isMonthly } = useHistoricalData();

  const handlePreset = useCallback((presetIndex) => {
    const preset = DATE_PRESETS[presetIndex];
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - preset.days);

    setStartDate(start);
    setEndDate(end);
    setActivePreset(presetIndex);
    setCurrentMode(preset.mode);

    // Auto-fetch on preset click
    const from = start.toISOString().split('T')[0];
    const to = end.toISOString().split('T')[0];
    fetchHistory(from, to, preset.mode === 'monthly');
  }, [fetchHistory]);

  const handleSearch = useCallback(() => {
    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];
    fetchHistory(from, to, currentMode === 'monthly');
  }, [startDate, endDate, fetchHistory, currentMode]);

  // ── Export Excel — uses displayed data (daily or aggregated monthly) ──
  const handleExport = useCallback(() => {
    if (!data || data.length === 0) return;

    const rows = data.map((d) => {
      if (isMonthly) {
        return {
          'Periode': formatMonthLabel(d.date),
          'Total kWh WBP': d.kwhWBP,
          'Total kWh LWBP': d.kwhLWBP,
          'Total kWh': d.totalKwh,
          'Total Biaya (Rp)': d.totalRupiah,
        };
      }
      return {
        'Tanggal': d.date,
        'Total kWh WBP': d.kwhWBP,
        'Total kWh LWBP': d.kwhLWBP,
        'Total kWh': d.totalKwh,
        'Rata-rata Watt': d.totalWatt || Math.round((d.totalKwh * 1000) / 24),
        'Total Biaya (Rp)': d.totalRupiah,
      };
    });

    if (summary) {
      rows.push({});
      const totalRow = {
        'Total kWh WBP': summary.totalKwhWBP,
        'Total kWh LWBP': summary.totalKwhLWBP,
        'Total kWh': summary.totalKwh,
        'Total Biaya (Rp)': summary.totalRupiah,
      };
      if (isMonthly) {
        totalRow['Periode'] = 'TOTAL';
      } else {
        totalRow['Tanggal'] = 'TOTAL';
        totalRow['Rata-rata Watt'] = '';
      }
      rows.push(totalRow);
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = isMonthly
      ? [{ wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 }]
      : [{ wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];

    const workbook = XLSX.utils.book_new();
    const sheetName = isMonthly ? 'Riwayat Per Bulan' : 'Riwayat Harian';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fromStr = startDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const toStr = endDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const suffix = isMonthly ? 'Bulanan' : 'Harian';
    XLSX.writeFile(workbook, `Riwayat_Biaya_${suffix}_${fromStr}_${toStr}.xlsx`);
  }, [data, isMonthly, summary, startDate, endDate]);

  // ── Chart options (memoized) ───────────────────────────────
  const biayaChartOption = useMemo(() => {
    if (data.length === 0) return null;
    return buildChartOption({
      data, isMonthly,
      seriesName: 'Total Biaya (Rp)',
      seriesType: 'bar',
      color: '#7c3aed',
      colorGradientEnd: '#a78bfa',
      yAxisFormatter: (v) => {
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
        return v;
      },
      tooltipFormatter: (v) => formatRupiah(v),
    });
  }, [data, isMonthly]);

  const wbpChartOption = useMemo(() => {
    if (data.length === 0) return null;
    return buildChartOption({
      data, isMonthly,
      seriesName: 'kWh WBP',
      seriesType: 'line',
      color: '#dc2626',
      yAxisFormatter: (v) => `${v}`,
      tooltipFormatter: (v) => `${v} kWh`,
      showArea: true,
    });
  }, [data, isMonthly]);

  const lwbpChartOption = useMemo(() => {
    if (data.length === 0) return null;
    return buildChartOption({
      data, isMonthly,
      seriesName: 'kWh LWBP',
      seriesType: 'line',
      color: '#16a34a',
      yAxisFormatter: (v) => `${v}`,
      tooltipFormatter: (v) => `${v} kWh`,
      showArea: true,
    });
  }, [data, isMonthly]);

  // Label for current mode
  const modeLabel = isMonthly ? 'per bulan' : 'per hari';

  return (
    <div className="glass-card rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cost" />
            Riwayat Biaya Listrik
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Analisis histori pengeluaran berdasarkan rentang waktu
            {isMonthly && data.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-semibold">
                Agregasi Bulanan
              </span>
            )}
          </p>
        </div>

        {data.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Preset Buttons: 7 Hari | 30 Hari | Per Bulan */}
        <div className="flex gap-2">
          {DATE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(i)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activePreset === i
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'bg-surface-tertiary text-text-secondary hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <DatePicker
              selected={startDate}
              onChange={(date) => { setStartDate(date); setActivePreset(-1); }}
              dateFormat="dd/MM/yyyy"
              className="!pl-8"
              maxDate={endDate}
            />
          </div>
          <span className="text-xs text-text-muted font-medium">—</span>
          <div className="relative flex-1">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <DatePicker
              selected={endDate}
              onChange={(date) => { setEndDate(date); setActivePreset(-1); }}
              dateFormat="dd/MM/yyyy"
              className="!pl-8"
              minDate={startDate}
              maxDate={new Date()}
            />
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Cari Data
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-[260px] gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-surface-tertiary border-t-primary-500 animate-spin" />
          <p className="text-sm text-text-muted font-medium">Memuat data historis...</p>
          <p className="text-xs text-text-muted/60">
            Mengambil data dari {formatDate(startDate)} — {formatDate(endDate)}
          </p>
        </div>
      )}

      {/* Data Loaded — Summary + 3 Separate Charts */}
      {!loading && data.length > 0 && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-cost-light rounded-xl p-5 border border-cost-soft/30 hover:shadow-md transition-shadow">
                <p className="text-sm text-text-muted mb-2 font-medium">Total Biaya</p>
                <p className="font-mono text-lg font-bold text-cost">{formatRupiah(summary.totalRupiah)}</p>
                <p className="text-xs text-text-muted mt-2">{summary.days} hari</p>
              </div>
              <div className="bg-danger-light rounded-xl p-5 border border-red-100 hover:shadow-md transition-shadow">
                <p className="text-sm text-text-muted mb-2 font-medium">Total kWh WBP</p>
                <p className="font-mono text-lg font-bold text-danger">{summary.totalKwhWBP} kWh</p>
                <p className="text-xs text-text-muted mt-2">Waktu Beban Puncak</p>
              </div>
              <div className="bg-success-light rounded-xl p-5 border border-green-100 hover:shadow-md transition-shadow">
                <p className="text-sm text-text-muted mb-2 font-medium">Total kWh LWBP</p>
                <p className="font-mono text-lg font-bold text-success">{summary.totalKwhLWBP} kWh</p>
                <p className="text-xs text-text-muted mt-2">Luar Waktu Beban Puncak</p>
              </div>
            </div>
          )}

          {/* Chart 1: Total Biaya (Bar) */}
          <div className="bg-surface/80 rounded-xl border border-border-light p-4">
            <h3 className="text-xs font-bold text-cost mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-cost" />
              Riwayat Total Biaya (Rp)
              <span className="text-text-muted font-normal">— {modeLabel}</span>
            </h3>
            {biayaChartOption && (
              <ReactECharts
                option={biayaChartOption}
                style={{ height: 220, width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
                lazyUpdate={true}
              />
            )}
          </div>

          {/* Chart 2 & 3: kWh WBP & LWBP (side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface/80 rounded-xl border border-border-light p-4">
              <h3 className="text-xs font-bold text-danger mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-danger" />
                Riwayat kWh WBP
                <span className="text-text-muted font-normal">— {modeLabel}</span>
              </h3>
              {wbpChartOption && (
                <ReactECharts
                  option={wbpChartOption}
                  style={{ height: 200, width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>

            <div className="bg-surface/80 rounded-xl border border-border-light p-4">
              <h3 className="text-xs font-bold text-success mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                Riwayat kWh LWBP
                <span className="text-text-muted font-normal">— {modeLabel}</span>
              </h3>
              {lwbpChartOption && (
                <ReactECharts
                  option={lwbpChartOption}
                  style={{ height: 200, width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[200px] gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-tertiary flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-text-muted/50" />
          </div>
          <div className="text-center">
            <p className="text-sm text-text-secondary font-medium">Belum ada data</p>
            <p className="text-xs text-text-muted mt-0.5">Pilih rentang tanggal dan klik "Cari Data" untuk memulai</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default HistoricalSection;
