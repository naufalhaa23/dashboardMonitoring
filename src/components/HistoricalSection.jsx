import { memo, useState, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';
import { Calendar, Search, Loader2, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useHistoricalData } from '../hooks/useHistoricalData';
import { formatRupiah, formatDateShort, formatDate } from '../utils/formatters';
import { DATE_PRESETS } from '../utils/constants';

function formatMonthLabel(dateStr) {
  const [year, month] = dateStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

function getXLabel(dateStr, isMonthly) {
  if (isMonthly) return formatMonthLabel(dateStr);
  return formatDateShort(dateStr);
}

function buildChartOption({ data, isMonthly, seriesName, seriesType, color, colorGradientEnd, yAxisFormatter, tooltipFormatter, showArea = false }) {
  return {
    tooltip: {
      trigger: 'axis', backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, padding: [8, 12],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
      formatter: function (params) {
        const p = params[0];
        return `<div style="margin-bottom:6px;font-weight:700;color:#64748b;font-family:Inter, sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${p.axisValue}</div>
          <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
            <span style="color:#475569">${seriesName}:</span>
            <span style="font-weight:700;color:#0f172a">${tooltipFormatter(p.value)}</span>
          </div>`;
      },
    },
    grid: { top: 12, right: 16, bottom: 24, left: 52, containLabel: false },
    xAxis: {
      type: 'category', data: data.map((d) => getXLabel(d.date, isMonthly)),
      axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', interval: data.length > 15 ? Math.floor(data.length / 10) : 0, rotate: data.length > 20 && !isMonthly ? 45 : 0 },
    },
    yAxis: {
      type: 'value', axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: color, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', formatter: yAxisFormatter },
    },
    series: [
      {
        name: seriesName, type: seriesType,
        data: data.map((d) => {
          if (seriesName.includes('Biaya')) return d.totalRupiah;
          if (seriesName.includes('WBP') && !seriesName.includes('LWBP')) return d.kwhWBP;
          return d.kwhLWBP;
        }),
        smooth: seriesType === 'line', symbol: seriesType === 'line' ? (data.length > 30 ? 'none' : 'circle') : undefined, symbolSize: 5,
        barWidth: seriesType === 'bar' ? (data.length > 20 ? '65%' : '50%') : undefined, barMaxWidth: 32,
        lineStyle: seriesType === 'line' ? { width: 2.5, color } : undefined,
        itemStyle: {
          color: seriesType === 'bar' ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color }, { offset: 1, color: colorGradientEnd || color + '99' }] } : color,
          borderRadius: seriesType === 'bar' ? [4, 4, 0, 0] : undefined,
        },
        areaStyle: showArea ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '15' }, { offset: 1, color: color + '01' }] } } : undefined,
      },
    ],
    animationDuration: 500, animationEasing: 'cubicOut',
  };
}

const HistoricalSection = memo(function HistoricalSection() {
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; });
  const [endDate, setEndDate] = useState(new Date());
  const [activePreset, setActivePreset] = useState(0);
  const [currentMode, setCurrentMode] = useState('daily');
  const { data, loading, error, fetchHistory, summary, isMonthly } = useHistoricalData();

  const handlePreset = useCallback((presetIndex) => {
    const preset = DATE_PRESETS[presetIndex];
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - preset.days);
    setStartDate(start); setEndDate(end); setActivePreset(presetIndex); setCurrentMode(preset.mode);
    const from = start.toISOString().split('T')[0]; const to = end.toISOString().split('T')[0];
    fetchHistory(from, to, preset.mode === 'monthly');
  }, [fetchHistory]);

  const handleSearch = useCallback(() => {
    const from = startDate.toISOString().split('T')[0]; const to = endDate.toISOString().split('T')[0];
    fetchHistory(from, to, currentMode === 'monthly');
  }, [startDate, endDate, fetchHistory, currentMode]);

  const handleExport = useCallback(() => {
    if (!data || data.length === 0) return;
    const rows = data.map((d) => {
      if (isMonthly) return { 'Periode': formatMonthLabel(d.date), 'Total kWh WBP': d.kwhWBP, 'Total kWh LWBP': d.kwhLWBP, 'Total kWh': d.totalKwh, 'Total Biaya (Rp)': d.totalRupiah };
      return { 'Tanggal': d.date, 'Total kWh WBP': d.kwhWBP, 'Total kWh LWBP': d.kwhLWBP, 'Total kWh': d.totalKwh, 'Rata-rata Watt': d.totalWatt || Math.round((d.totalKwh * 1000) / 24), 'Total Biaya (Rp)': d.totalRupiah };
    });
    if (summary) {
      rows.push({});
      const totalRow = { 'Total kWh WBP': summary.totalKwhWBP, 'Total kWh LWBP': summary.totalKwhLWBP, 'Total kWh': summary.totalKwh, 'Total Biaya (Rp)': summary.totalRupiah };
      if (isMonthly) totalRow['Periode'] = 'TOTAL'; else { totalRow['Tanggal'] = 'TOTAL'; totalRow['Rata-rata Watt'] = ''; }
      rows.push(totalRow);
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = isMonthly ? [{ wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 }] : [{ wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    const sheetName = isMonthly ? 'Riwayat Per Bulan' : 'Riwayat Harian';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const fromStr = startDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const toStr = endDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const suffix = isMonthly ? 'Bulanan' : 'Harian';
    XLSX.writeFile(workbook, `Riwayat_Biaya_${suffix}_${fromStr}_${toStr}.xlsx`);
  }, [data, isMonthly, summary, startDate, endDate]);

  const biayaChartOption = useMemo(() => {
    if (data.length === 0) return null;
    return buildChartOption({ data, isMonthly, seriesName: 'Total Biaya (Rp)', seriesType: 'bar', color: '#7c3aed', colorGradientEnd: '#a78bfa', yAxisFormatter: (v) => { if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`; if (v >= 1000) return `${(v / 1000).toFixed(0)}k`; return v; }, tooltipFormatter: (v) => formatRupiah(v) });
  }, [data, isMonthly]);

  const wbpChartOption = useMemo(() => {
    if (data.length === 0) return null;
    return buildChartOption({ data, isMonthly, seriesName: 'kWh WBP', seriesType: 'line', color: '#dc2626', yAxisFormatter: (v) => `${v}`, tooltipFormatter: (v) => `${v} kWh`, showArea: true });
  }, [data, isMonthly]);

  const lwbpChartOption = useMemo(() => {
    if (data.length === 0) return null;
    return buildChartOption({ data, isMonthly, seriesName: 'kWh LWBP', seriesType: 'line', color: '#16a34a', yAxisFormatter: (v) => `${v}`, tooltipFormatter: (v) => `${v} kWh`, showArea: true });
  }, [data, isMonthly]);

  const modeLabel = isMonthly ? 'per bulan' : 'per hari';

  // ... (biarkan kode logic, useEffect, dll di atasnya tetap sama)

  return (
    <div className="w-full">
      {/* ── Header + Export ── */}
      {/* Paksa margin bawah 32px */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8" style={{ gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 className="text-[16px] font-bold text-slate-800 flex items-center" style={{ gap: '8px' }}>
            <BarChart3 className="w-5 h-5 text-violet-600" />
            Riwayat Biaya Listrik
          </h2>
          <p className="text-[14px] font-medium text-slate-500 mt-1 flex items-center flex-wrap" style={{ gap: '8px' }}>
            Analisis histori pengeluaran berdasarkan rentang waktu
            {isMonthly && data.length > 0 && (
              <span className="bg-indigo-50 text-indigo-600 rounded text-[11px] border border-indigo-100 font-bold tracking-wide uppercase" style={{ padding: '2px 8px', marginLeft: '4px' }}>
                Agregasi Bulanan
              </span>
            )}
          </p>
        </div>

        {data.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors duration-200 cursor-pointer"
            style={{ gap: '8px', padding: '10px 20px', fontSize: '14px' }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      {/* Paksa gap 16px dan margin bawah 32px */}
      <div className="flex flex-col sm:flex-row" style={{ gap: '16px', marginBottom: '32px' }}>

        {/* Preset Buttons */}
        <div className="flex" style={{ gap: '8px' }}>
          {DATE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(i)}
              className={`font-semibold rounded-xl transition-all duration-200 cursor-pointer border ${activePreset === i ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center flex-1" style={{ gap: '12px' }}>

          {/* Start Date */}
          <div className="relative flex-1">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <DatePicker
              selected={startDate}
              onChange={(date) => { setStartDate(date); setActivePreset(-1); }}
              dateFormat="dd/MM/yyyy"
              maxDate={endDate}
              /* PAKAI CUSTOM INPUT BIAR STYLE-NYA MASUK KE DALAM INPUT */
              customInput={
                <input
                  className="w-full text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  style={{ padding: '10px 16px 10px 40px' }}
                />
              }
            />
          </div>

          <span className="text-sm text-slate-400 font-medium">—</span>

          {/* End Date */}
          <div className="relative flex-1">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <DatePicker
              selected={endDate}
              onChange={(date) => { setEndDate(date); setActivePreset(-1); }}
              dateFormat="dd/MM/yyyy"
              minDate={startDate}
              maxDate={new Date()}
              /* PAKAI CUSTOM INPUT BIAR STYLE-NYA MASUK KE DALAM INPUT */
              customInput={
                <input
                  className="w-full text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  style={{ padding: '10px 16px 10px 40px' }}
                />
              }
            />
          </div>

        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch} disabled={loading}
          className="flex items-center justify-center bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 cursor-pointer"
          style={{ gap: '8px', padding: '10px 24px', fontSize: '13px' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Cari Data
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium" style={{ padding: '16px', marginBottom: '24px' }}>{error}</div>}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100" style={{ height: '280px', gap: '12px' }}>
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
          <div className="text-center">
            <p className="text-[15px] text-slate-700 font-semibold">Memuat data historis...</p>
            <p className="text-[13px] text-slate-500 mt-1">Mengambil data dari {formatDate(startDate)} — {formatDate(endDate)}</p>
          </div>
        </div>
      )}

      {/* Data Loaded */}
      {!loading && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}> {/* Paksa gap antar row */}

          {/* Summary Cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              <div className="bg-violet-50/50 border border-violet-100" style={{ padding: '24px', borderRadius: '20px' }}>
                <p className="text-[12px] font-bold tracking-widest uppercase text-violet-600/70 mb-2">Total Biaya</p>
                <p className="font-sans text-[28px] font-bold text-violet-700 tracking-tight">{formatRupiah(summary.totalRupiah)}</p>
                <p className="text-[13px] text-violet-500 font-medium mt-1">{summary.days} hari</p>
              </div>
              <div className="bg-red-50/50 border border-red-100" style={{ padding: '24px', borderRadius: '20px' }}>
                <p className="text-[12px] font-bold tracking-widest uppercase text-red-600/70 mb-2">Total kWh WBP</p>
                <p className="font-sans text-[28px] font-bold text-red-700 tracking-tight">{summary.totalKwhWBP} <span className="text-[18px]">kWh</span></p>
                <p className="text-[13px] text-red-500 font-medium mt-1">Waktu Beban Puncak</p>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100" style={{ padding: '24px', borderRadius: '20px' }}>
                <p className="text-[12px] font-bold tracking-widest uppercase text-emerald-600/70 mb-2">Total kWh LWBP</p>
                <p className="font-sans text-[28px] font-bold text-emerald-700 tracking-tight">{summary.totalKwhLWBP} <span className="text-[18px]">kWh</span></p>
                <p className="text-[13px] text-emerald-500 font-medium mt-1">Luar Waktu Beban Puncak</p>
              </div>
            </div>
          )}

          {/* Chart 1: Total Biaya */}
          <div className="bg-white border border-slate-200" style={{ padding: '24px', borderRadius: '20px' }}>
            <h3 className="text-[13px] font-bold text-violet-700 flex items-center" style={{ gap: '8px', marginBottom: '20px' }}>
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-600" />
              RIWAYAT TOTAL BIAYA (RP)
              <span className="text-slate-400 font-medium normal-case ml-1">— {modeLabel}</span>
            </h3>
            {biayaChartOption && <ReactECharts option={biayaChartOption} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge={true} lazyUpdate={true} />}
          </div>

          {/* Chart 2 & 3: kWh WBP & LWBP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div className="bg-white border border-slate-200" style={{ padding: '24px', borderRadius: '20px' }}>
              <h3 className="text-[13px] font-bold text-red-700 flex items-center" style={{ gap: '8px', marginBottom: '20px' }}>
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600" />
                RIWAYAT KWH WBP
                <span className="text-slate-400 font-medium normal-case ml-1">— {modeLabel}</span>
              </h3>
              {wbpChartOption && <ReactECharts option={wbpChartOption} style={{ height: 240, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge={true} lazyUpdate={true} />}
            </div>

            <div className="bg-white border border-slate-200" style={{ padding: '24px', borderRadius: '20px' }}>
              <h3 className="text-[13px] font-bold text-emerald-700 flex items-center" style={{ gap: '8px', marginBottom: '20px' }}>
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                RIWAYAT KWH LWBP
                <span className="text-slate-400 font-medium normal-case ml-1">— {modeLabel}</span>
              </h3>
              {lwbpChartOption && <ReactECharts option={lwbpChartOption} style={{ height: 240, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge={true} lazyUpdate={true} />}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100" style={{ height: '280px', gap: '16px' }}>
          <div className="w-14 h-14 rounded-[16px] bg-white flex items-center justify-center border border-slate-200 shadow-sm">
            <BarChart3 className="w-7 h-7 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-[15px] text-slate-700 font-semibold">Belum ada data</p>
            <p className="text-[13px] text-slate-500 mt-1">Pilih rentang tanggal dan klik "Cari Data" untuk melihat riwayat</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default HistoricalSection;