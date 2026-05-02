/**
 * GaugeCard.jsx — Gauge setengah lingkaran dengan jarum indikator (ECharts).
 *
 * CATATAN: Komponen ini sekarang "bare" — tidak memiliki wrapper card sendiri.
 * Container/card-nya dikelola oleh parent (DashboardPage).
 * Logic gauge (ECharts semicircle + jarum) TIDAK DIUBAH.
 */

import { memo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

const GaugeCard = memo(function GaugeCard({
  value = 0,
  min = 0,
  max = 300,
  unit = 'V',
  label = 'Voltage',
  color = '#dc2626',
  warningMin,
  warningMax,
  dangerMin,
  dangerMax
}) {
  const chartRef = useRef(null);

  // Determine active color based on thresholds
  let activeColor = color;
  if (
    (dangerMax !== undefined && value >= dangerMax) ||
    (dangerMin !== undefined && value <= dangerMin)
  ) {
    activeColor = '#ef4444'; // red-500
  } else if (
    (warningMax !== undefined && value >= warningMax) ||
    (warningMin !== undefined && value <= warningMin)
  ) {
    activeColor = '#f59e0b'; // amber-500
  }

  // Smoothly update value and color without full re-render
  useEffect(() => {
    if (chartRef.current) {
      const instance = chartRef.current.getEchartsInstance();
      instance.setOption({
        series: [{
          data: [{ value: value }],
          progress: {
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: activeColor + '88' },
                  { offset: 1, color: activeColor },
                ],
              },
            }
          },
          pointer: {
            itemStyle: {
              color: activeColor,
              shadowColor: activeColor + '44',
            }
          },
          anchor: {
            itemStyle: {
              borderColor: activeColor,
              shadowColor: activeColor + '33',
            }
          },
          detail: {
            color: activeColor,
          }
        }]
      });
    }
  }, [value, activeColor]);

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: min,
        max: max,
        center: ['50%', '60%'],
        radius: '90%',
        progress: {
          show: true,
          width: 12,
          roundCap: true,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: activeColor + '88' },
                { offset: 1, color: activeColor },
              ],
            },
          },
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, '#f1f5f9']],
          },
          roundCap: true,
        },
        axisTick: {
          show: true,
          distance: -20,
          length: 4,
          lineStyle: {
            color: '#cbd5e1',
            width: 1,
          },
          splitNumber: 5,
        },
        splitLine: {
          distance: -24,
          length: 8,
          lineStyle: {
            color: '#94a3b8',
            width: 1.5,
          },
        },
        axisLabel: {
          distance: -12,
          color: '#94a3b8',
          fontSize: 9,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: function (val) {
            if (val === min || val === max || val === (min + max) / 2) return val;
            return '';
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '52%',
          width: 6,
          offsetCenter: [0, '-8%'],
          itemStyle: {
            color: activeColor,
            shadowColor: activeColor + '44',
            shadowBlur: 8,
            shadowOffsetY: 2,
          },
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 12,
          itemStyle: {
            borderWidth: 3,
            borderColor: activeColor,
            color: '#ffffff',
            shadowColor: activeColor + '33',
            shadowBlur: 6,
          },
        },
        title: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          fontSize: 26,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700,
          color: activeColor,
          offsetCenter: [0, '34%'],
          formatter: function (val) {
            return val.toFixed(unit === 'V' ? 1 : 2);
          },
        },
        data: [{ value: value }],
        animationDuration: 600,
        animationEasingUpdate: 'cubicOut',
      },
    ],
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Gauge chart */}
      <div className="w-full" style={{ height: 180 }}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
      {/* Label + unit badge */}
      <div className="flex items-center gap-6 -mt-3 pb-3">
        <span className="text-[13px] font-semibold text-text-primary">{label}</span>
        <span
          className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full"
          style={{ background: activeColor + '18', color: activeColor }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
});

export default GaugeCard;
