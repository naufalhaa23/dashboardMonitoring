import { memo } from 'react';
import { Zap, Leaf } from 'lucide-react';
import { TARIFF } from '../utils/constants';
import { formatRupiah } from '../utils/formatters';

const StatusIndicator = memo(function StatusIndicator({ status, tariff }) {
  const isWBP = status === 'WBP';

  return (
    <div className={`glass-card rounded-2xl p-5 flex flex-col justify-center animate-fade-in-up ${isWBP ? 'glow-wbp' : 'glow-lwbp'}`}>
      {/* Status Badge */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isWBP
              ? 'bg-gradient-to-br from-red-500 to-amber-500 shadow-lg shadow-red-500/20'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isWBP ? (
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
          ) : (
            <Leaf className="w-6 h-6 text-white" strokeWidth={2.5} />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                isWBP
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isWBP ? 'bg-red-500 animate-pulse-live' : 'bg-emerald-500'
                }`}
              />
              {isWBP ? 'WBP' : 'LWBP'}
            </span>
          </div>
          <p className="text-sm font-medium text-text-secondary mt-0.5">
            {isWBP ? 'Waktu Beban Puncak' : 'Luar Waktu Beban Puncak'}
          </p>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-tertiary/60">
          <span className="text-xs text-text-muted font-medium">Jadwal WBP</span>
          <span className="text-xs font-mono font-semibold text-text-primary">18:00 — 22:00</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-tertiary/60">
          <span className="text-xs text-text-muted font-medium">Tarif Aktif</span>
          <span className={`text-xs font-mono font-bold ${isWBP ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatRupiah(tariff || (isWBP ? TARIFF.WBP : TARIFF.LWBP))}/kWh
          </span>
        </div>
      </div>
    </div>
  );
});

export default StatusIndicator;
