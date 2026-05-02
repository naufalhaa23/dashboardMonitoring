/**
 * Sidebar.jsx — Navigasi utama dengan role-based menu visibility.
 *
 * Menu untuk SEMUA user: Dashboard
 * Menu khusus ADMIN: MQTT Settings, InfluxDB Settings, User Management
 */

import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wifi, Database, Users,
  LogOut, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const NAV_ALL = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const NAV_ADMIN = [
  { to: '/settings/mqtt',   label: 'MQTT Settings',   icon: Wifi },
  { to: '/settings/influx', label: 'InfluxDB Settings', icon: Database },
  { to: '/users',           label: 'User Management', icon: Users },
];

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
     ${isActive
       ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
       : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
     }`;

  return (
    <aside
      className={`flex flex-col bg-surface border-r border-border transition-all duration-300 ease-in-out
                  ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
      style={{ minHeight: '100vh' }}
    >
      {/* Logo & Toggle */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary leading-tight">PowerMeter</p>
              <p className="text-[10px] text-text-muted leading-tight">IoT Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center mx-auto">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-6 h-6 rounded-lg bg-surface-secondary hover:bg-border flex items-center justify-center
                      transition-colors flex-shrink-0 ${collapsed ? 'mx-auto mt-3' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            : <ChevronLeft className="w-3.5 h-3.5 text-text-muted" />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-hidden">

        {/* Menu untuk semua role */}
        {NAV_ALL.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navClass} title={collapsed ? label : ''}>
            <Icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={2} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        {/* Divider & label Admin (hanya jika Admin) */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-border" />
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                Admin
              </p>
            )}
            {NAV_ADMIN.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={navClass} title={collapsed ? label : ''}>
                <Icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={2} />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-border px-3 py-4">
        {!collapsed ? (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-700 uppercase">
                {user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.username}</p>
              <p className="text-[10px] text-text-muted capitalize">{user?.role}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-700 uppercase">
                {user?.username?.[0] || 'U'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-danger
                      hover:bg-danger-light transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={2} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
