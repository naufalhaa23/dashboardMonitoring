import { memo, useRef, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { WBP_START_HOUR, WBP_END_HOUR } from '../utils/constants';

/**
 * Format time with seconds for chart axis (HH:mm:ss)
 */
function formatTrendTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const PowerTrendChart = memo(function PowerTrendChart({ trendData = [] }) {
  const chartRef = useRef(null);

  // Build WBP mark areas
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
        areas.push([
          { xAxis: wbpStart, name: 'WBP' },
          { xAxis: formatTrendTime(trendData[i - 1].time) },
        ]);
        wbpStart = null;
      }
    });

    if (wbpStart !== null) {
      areas.push([
        { xAxis: wbpStart, name: 'WBP' },
        { xAxis: formatTrendTime(trendData[trendData.length - 1].time) },
      ]);
    }

    return areas;
  }, [trendData]);

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      borderWidth: 1,
      textStyle: {
        color: '#f1f5f9',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      formatter: function (params) {
        let result = `<div style="margin-bottom:4px;font-weight:600;color:#94a3b8">${params[0].axisValue}</div>`;
        params.forEach((p) => {
          result += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span>${p.seriesName}:</span>
            <span style="font-weight:600">${p.value != null ? p.value.toFixed(1) : '—'}</span>
          </div>`;
        });
        return result;
      },
    },
    legend: {
      data: ['Power (W)', 'Avg Voltage (V)', 'Total Ampere (A)'],
      bottom: 0,
      textStyle: {
        color: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
      },
      itemWidth: 12,
      itemHeight: 3,
      itemGap: 20,
    },
    grid: {
      top: 20,
      right: 56,
      bottom: 40,
      left: 50,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: trendData.map((d) => formatTrendTime(d.time)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        interval: Math.max(Math.floor(trendData.length / 6), 0),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Watt',
        nameTextStyle: { color: '#d97706', fontSize: 10, fontWeight: 600 },
        position: 'left',
        axisLine: { show: true, lineStyle: { color: '#d9770633' } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#d97706',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v,
        },
      },
      {
        type: 'value',
        name: 'V / A',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#0891b233' } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
      },
    ],
    series: [
      {
        name: 'Power (W)',
        type: 'line',
        yAxisIndex: 0,
        data: trendData.map((d) => d.watt),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.5, color: '#d97706' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(217,119,6,0.2)' },
              { offset: 1, color: 'rgba(217,119,6,0.02)' },
            ],
          },
        },
        markArea: {
          silent: true,
          itemStyle: {
            color: 'rgba(220,38,38,0.06)',
          },
          label: {
            show: true,
            position: 'insideTopLeft',
            color: '#dc2626',
            fontSize: 10,
            fontWeight: 600,
            opacity: 0.6,
          },
          data: markAreas,
        },
      },
      {
        name: 'Avg Voltage (V)',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map((d) => d.voltage),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#0891b2' },
      },
      {
        name: 'Total Ampere (A)',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map((d) => d.ampere),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#059669', type: 'dashed' },
      },
    ],
    animationDuration: 300,
    animationEasing: 'cubicOut',
  };

  const hasData = trendData.length > 1;

  return (
    <div className="glass-card rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Power Trend</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Tren penggunaan daya real-time • Area merah = zona WBP
          </p>
        </div>
        {hasData && (
          <span className="text-xs font-mono text-text-muted px-2 py-1 bg-surface-tertiary rounded-md">
            {trendData.length} titik data
          </span>
        )}
      </div>

      {hasData ? (
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: 280, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-[280px] gap-2">
          <div className="w-8 h-8 rounded-lg bg-surface-tertiary flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-text-muted border-t-primary-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-text-muted">Mengumpulkan data...</p>
          <p className="text-xs text-text-muted/60">Chart akan muncul setelah beberapa data point terkumpul</p>
        </div>
      )}
    </div>
  );
});

export default PowerTrendChart;
