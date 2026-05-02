import { memo, useRef, useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

function useAnimatedValue(targetValue, duration = 500) {
  const [displayValue, setDisplayValue] = useState(targetValue || 0);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const startValueRef = useRef(0);

  useEffect(() => {
    if (targetValue == null) return;
    startValueRef.current = displayValue;
    startRef.current = performance.now();

    const animate = (timestamp) => {
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetValue - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [targetValue, duration]);

  return displayValue;
}

const SummaryCard = memo(function SummaryCard({ title, value, formattedValue, subtitle, icon: Icon = DollarSign, color = '#4f46e5', trend, trendText, isNegativeTrendGood = false }) {
  const animatedValue = useAnimatedValue(value);
  const display = formattedValue ? formattedValue(animatedValue) : animatedValue.toFixed(2);

  let trendColor = 'text-slate-500';
  let TrendIcon = TrendingUp;
  if (trend != null) {
    if (trend > 0) { trendColor = isNegativeTrendGood ? 'text-red-600' : 'text-emerald-600'; TrendIcon = TrendingUp; }
    else if (trend < 0) { trendColor = isNegativeTrendGood ? 'text-emerald-600' : 'text-red-600'; TrendIcon = TrendingDown; }
  }

  return (
    <div
      className="glass-card bg-white border border-slate-100 rounded-2xl flex flex-col justify-between h-full shadow-sm"
      style={{ padding: '24px', minHeight: '150px' }}
    >
      {/* BUNGKUSAN LUAR: Pakai inline padding 24px agar dijamin lega */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-tight max-w-[70%] mt-1">
          {title}
        </p>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: color + '15' }}>
          <Icon className="w-[18px] h-[18px]" style={{ color }} strokeWidth={2.5} />
        </div>
      </div>

      <p className="text-[32px] font-bold tracking-tight text-slate-900 leading-none mb-4">
        {display}
      </p>

      <div className="flex items-center gap-1.5 mt-auto">
        {trend != null ? (
          <>
            <TrendIcon className={`w-4 h-4 ${trendColor}`} strokeWidth={2.5} />
            <span className={`text-[13px] font-bold ${trendColor}`}>{trend > 0 ? '+' : ''}{trend}%</span>
            {trendText && <span className="text-[12px] font-medium text-slate-500 ml-1">{trendText}</span>}
          </>
        ) : (
          subtitle && <span className="text-[12px] font-medium text-slate-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
});

export default SummaryCard;