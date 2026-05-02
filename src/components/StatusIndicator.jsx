import { memo, useState, useEffect } from 'react';

const StatusIndicator = memo(function StatusIndicator({ status }) {
  const isWBP = status === 'WBP';
  const [nextShift, setNextShift] = useState('');

  useEffect(() => {
    const calcNextShift = () => {
      const now = new Date();
      const hours = now.getHours();
      let targetHour = 18;
      const futureNow = new Date(now);
      if (hours >= 18 && hours < 22) { targetHour = 22; } else if (hours >= 22) { targetHour = 18; futureNow.setDate(futureNow.getDate() + 1); }
      const target = new Date(futureNow); target.setHours(targetHour, 0, 0, 0);
      const diffMs = target - new Date();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setNextShift(`Next shift in ${diffHrs}h ${diffMins}m`);
    };

    calcNextShift();
    const timer = setInterval(calcNextShift, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="glass-card bg-white border border-slate-100 rounded-2xl flex flex-col justify-between h-full shadow-sm"
      style={{ padding: '24px', minHeight: '150px' }}
    >
      {/* BUNGKUSAN LUAR: Pakai inline padding 24px agar dijamin lega */}
      <div className="mb-4">
        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
          Tariff Status
        </p>
      </div>

      <div className="flex gap-3 flex-1 items-center mb-4">
        <div className={`flex-1 flex flex-col items-center justify-center rounded-xl py-2.5 transition-colors ${isWBP ? 'bg-red-50' : 'bg-slate-50'}`}>
          <span className={`text-[12px] font-bold tracking-widest ${isWBP ? 'text-red-700' : 'text-slate-400'}`}>WBP</span>
          <span className={`text-[13px] font-semibold mt-0.5 ${isWBP ? 'text-red-600' : 'text-slate-400'}`}>{isWBP ? 'Active' : 'Inactive'}</span>
        </div>
        <div className={`flex-1 flex flex-col items-center justify-center rounded-xl py-2.5 transition-colors ${!isWBP ? 'bg-slate-50' : 'bg-slate-50'}`}>
          <span className={`text-[12px] font-bold tracking-widest ${!isWBP ? 'text-slate-700' : 'text-slate-400'}`}>LWBP</span>
          <span className={`text-[13px] font-semibold mt-0.5 ${!isWBP ? 'text-slate-600' : 'text-slate-400'}`}>{!isWBP ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      <div className="mt-auto">
        <span className="text-[13px] font-medium text-slate-500">{nextShift}</span>
      </div>
    </div>
  );
});

export default StatusIndicator;