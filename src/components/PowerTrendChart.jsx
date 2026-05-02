import { memo, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { WBP_START_HOUR, WBP_END_HOUR } from '../utils/constants';

function formatTrendTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

const PowerTrendChart = memo(function PowerTrendChart({ trendData = [] }) {
  const chartRef = useRef(null);

  const markAreas = useMemo(() => {
    if (trendData.length < 2) return [];
    const areas = [];
    let wbpStart = null;

    trendData.forEach((point, i) => {
      const hour = new Date(point.time).getHours();
      const isWBP = hour >= WBP_START_HOUR && hour < WBP_END_HOUR;

      if (isWBP && wbpStart === null) {
        wbpStart = formatTrendTime(point.time);
      } else if (!isWBP && wbpStart !== null) {
        areas.push([{ xAxis: wbpStart, name: 'WBP' }, { xAxis: formatTrendTime(trendData[i - 1].time) }]);
        wbpStart = null;
      }
    });

    if (wbpStart !== null) {
      areas.push([{ xAxis: wbpStart, name: 'WBP' }, { xAxis: formatTrendTime(trendData[trendData.length - 1].time) }]);
    }
    return areas;
  }, [trendData]);

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
      formatter: function (params) {
        let result = `<div style="margin-bottom:6px;font-weight:700;color:#64748b;font-family:Inter, sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${params[0].axisValue}</div>`;
        params.forEach((p) => {
          result += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span style="color:#475569">${p.seriesName}:</span>
            <span style="font-weight:700;color:#0f172a">${p.value != null ? p.value.toFixed(1) : '—'}</span>
          </div>`;
        });
        return result;
      },
    },
    legend: {
      data: ['Power (W)', 'Avg Voltage (V)', 'Total Ampere (A)'],
      bottom: -5,
      textStyle: { color: '#64748b', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500 },
      itemWidth: 12, itemHeight: 4, itemGap: 24, icon: 'roundRect'
    },
    grid: { top: 20, right: 56, bottom: 40, left: 50, containLabel: false },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => formatTrendTime(d.time)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', interval: Math.max(Math.floor(trendData.length / 6), 0) },
    },
    yAxis: [
      {
        type: 'value', name: 'Watt',
        nameTextStyle: { color: '#d97706', fontSize: 11, fontWeight: 600, padding: [0, 0, 0, -20] },
        position: 'left', axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#d97706', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v },
      },
      {
        type: 'value', name: 'V / A',
        nameTextStyle: { color: '#94a3b8', fontSize: 11, padding: [0, -20, 0, 0] },
        position: 'right', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
      },
    ],
    series: [
      {
        name: 'Power (W)', type: 'line', yAxisIndex: 0,
        data: trendData.map((d) => d.watt), smooth: true, symbol: 'none',
        lineStyle: { width: 2.5, color: '#d97706' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(217,119,6,0.15)' }, { offset: 1, color: 'rgba(217,119,6,0.01)' }],
          },
        },
        markArea: {
          silent: true, itemStyle: { color: 'rgba(220,38,38,0.04)' },
          label: { show: true, position: 'insideTopLeft', color: '#dc2626', fontSize: 11, fontWeight: 600, opacity: 0.6 },
          data: markAreas,
        },
      },
      {
        name: 'Avg Voltage (V)', type: 'line', yAxisIndex: 1,
        data: trendData.map((d) => d.voltage), smooth: true, symbol: 'none',
        lineStyle: { width: 2, color: '#0891b2' },
      },
      {
        name: 'Total Ampere (A)', type: 'line', yAxisIndex: 1,
        data: trendData.map((d) => d.ampere), smooth: true, symbol: 'none',
        lineStyle: { width: 2, color: '#059669', type: 'dashed' },
      },
    ],
    animationDuration: 300, animationEasing: 'cubicOut',
  };

  const hasData = trendData.length > 1;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-[16px] font-bold text-slate-800">Power Trend</h2>
          <p className="text-[14px] font-medium text-slate-500 mt-1">
            Tren penggunaan daya real-time • Area merah = zona WBP
          </p>
        </div>
        {hasData && (
          <span className="text-[12px] font-mono font-medium text-slate-500 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            {trendData.length} titik data
          </span>
        )}
      </div>

      {hasData ? (
        <ReactECharts ref={chartRef} option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge={false} lazyUpdate={true} />
      ) : (
        <div className="flex flex-col items-center justify-center h-[320px] gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-slate-700">Mengumpulkan data...</p>
            <p className="text-[13px] text-slate-500 mt-1">Chart akan muncul sesaat lagi</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default PowerTrendChart;