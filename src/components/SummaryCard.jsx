import { memo, useRef, useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Animated counter hook — smoothly counts up/down to target value
 */
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

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetValue - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, duration]);

  return displayValue;
}

const SummaryCard = memo(function SummaryCard({
  title,
  value,
  formattedValue,
  subtitle,
  icon: Icon = DollarSign,
  color = '#7c3aed',
  bgColor = '#f5f3ff',
  trend,
}) {
  const animatedValue = useAnimatedValue(value);

  // Determine formatted display — use animated value for numbers
  const display = formattedValue
    ? formattedValue(animatedValue)
    : animatedValue.toFixed(2);

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in-up group">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: bgColor }}
        >
          <Icon className="w-5 h-5" style={{ color }} strokeWidth={2} />
        </div>

        {trend != null && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <p className="text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
        {title}
      </p>

      <p
        className="font-mono text-xl font-bold tracking-tight value-transition"
        style={{ color }}
      >
        {display}
      </p>

      {subtitle && (
        <p className="text-xs text-text-muted mt-1.5 font-medium">{subtitle}</p>
      )}
    </div>
  );
});

export default SummaryCard;
