import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Wifi, Database, Users,
  LogOut, User as UserIcon, Bell, Monitor, Banknote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ALL = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alerts', label: 'Peringatan', icon: Bell },
];

const NAV_ADMIN = [
  { to: '/devices', label: 'Manajemen Alat', icon: Monitor },
  { to: '/users', label: 'User Management', icon: Users },
  { to: '/settings/tariffs', label: 'Tarif Listrik', icon: Banknote },
  { to: '/settings/mqtt', label: 'MQTT Settings', icon: Wifi },
  { to: '/settings/influx', label: 'InfluxDB Settings', icon: Database },
];

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();

  const getNavStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0 12px 32px',
    marginRight: '24px',
    borderRadius: '0 999px 999px 0',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    textDecoration: 'none',
    backgroundColor: isActive ? '#eef2ff' : 'transparent',
    color: isActive ? '#4f46e5' : '#64748b',
  });

  return (
    <aside
      className="flex flex-col bg-white border-r border-slate-200 flex-shrink-0"
      style={{ width: '260px', minHeight: '100vh' }}
    >
      {/* ── Logo Area ── */}
      <div
        className="flex flex-col justify-center border-b border-slate-100"
        style={{ height: '90px', paddingLeft: '32px' }}
      >
        <h1 className="text-[20px] font-bold text-slate-900 leading-tight tracking-tight">
          PowerMeter
        </h1>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          INDUSTRIAL IOT
        </p>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-6 flex flex-col" style={{ gap: '4px' }}>
        {NAV_ALL.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => getNavStyle(isActive)}>
            {({ isActive }) => (
              <>
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isActive ? '#4f46e5' : '#94a3b8' }}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <div className="flex flex-col mt-4" style={{ gap: '4px' }}>
            {/* Teks Administration dibuat rata tengah (text-center) dan margin kanan sedikit biar seimbang sama menu */}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center" style={{ marginRight: '24px' }}>
              Administration
            </p>
            {NAV_ADMIN.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} style={({ isActive }) => getNavStyle(isActive)}>
                {({ isActive }) => (
                  <>
                    <Icon
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: isActive ? '#4f46e5' : '#94a3b8' }}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* ── User Profile & Logout ── */}
      <div className="border-t border-slate-100 p-6">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
            <UserIcon className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-slate-800 truncate capitalize">
              {user?.username || 'John Doe'}
            </p>
            <p className="text-[12px] font-medium text-slate-400 capitalize truncate mt-0.5">
              {user?.role || 'Admin'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center transition-colors hover:bg-red-50 group cursor-pointer border-none bg-transparent"
          style={{ gap: '12px', padding: '12px', borderRadius: '12px' }}
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" strokeWidth={2} />
          <span className="text-[14px] font-bold text-slate-500 group-hover:text-red-600">
            Keluar
          </span>
        </button>
      </div>
    </aside>
  );
}