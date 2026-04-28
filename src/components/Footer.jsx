import { memo } from 'react';
import { formatTime } from '../utils/formatters';
import { Radio } from 'lucide-react';

const Footer = memo(function Footer({ lastUpdate, connectionStatus }) {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 text-xs text-text-muted animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
      <div className="flex items-center gap-2">
        <Radio className="w-3 h-3" />
        <span>Power Meter Acuvim • Modbus TCP</span>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdate && (
          <span className="font-mono">
            Update terakhir: {formatTime(lastUpdate)}
          </span>
        )}
        <span className="hidden sm:inline text-text-muted/50">|</span>
        <span className="hidden sm:inline">
          {connectionStatus === 'mock' ? 'Mode Demo — Data Simulasi' : 'Live Data'}
        </span>
      </div>
    </footer>
  );
});

export default Footer;
