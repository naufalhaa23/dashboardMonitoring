import { useState, useEffect, memo } from 'react';
import { Zap, Wifi, WifiOff, Activity } from 'lucide-react';
import { formatTime } from '../utils/formatters';

const Header = memo(function Header({ connectionStatus }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusConfig = {
    connected: { color: 'bg-green-500', label: 'Connected', icon: Wifi },
    mock: { color: 'bg-blue-500', label: 'Demo Mode', icon: Activity },
    connecting: { color: 'bg-yellow-500', label: 'Connecting...', icon: Wifi },
    disconnected: { color: 'bg-red-500', label: 'Disconnected', icon: WifiOff },
    error: { color: 'bg-red-500', label: 'Error', icon: WifiOff },
  };

  const status = statusConfig[connectionStatus] || statusConfig.connecting;
  const StatusIcon = status.icon;

  return (
    <header className="glass-card rounded-2xl px-6 py-4 flex items-center justify-between animate-fade-in-up">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight">
            Power Monitor
          </h1>
          <p className="text-xs text-text-muted font-medium">
            Industrial IoT Dashboard
          </p>
        </div>
      </div>

      {/* Center: Live Clock */}
      <div className="hidden sm:flex flex-col items-center">
        <span className="font-mono text-2xl font-semibold text-text-primary tracking-wider">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-text-muted font-medium">
          {currentTime.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Right: Connection Status */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-tertiary/80">
        <div className="relative flex items-center">
          <span className={`w-2 h-2 rounded-full ${status.color}`} />
          {(connectionStatus === 'connected' || connectionStatus === 'mock') && (
            <span className={`absolute w-2 h-2 rounded-full ${status.color} animate-pulse-live`} />
          )}
        </div>
        <StatusIcon className="w-3.5 h-3.5 text-text-secondary" />
        <span className="text-xs font-medium text-text-secondary">
          {status.label}
        </span>
      </div>
    </header>
  );
});

export default Header;
