/**
 * App.jsx — Root routing dengan React Router v6.
 *
 * Route structure:
 *   /login               → LoginPage (public)
 *   / [PrivateRoute]
 *     / [MainLayout]     → Sidebar + konten
 *       /dashboard       → DashboardPage (Admin + Viewer)
 *       / [AdminRoute]   → hanya Admin
 *         /settings/mqtt   → MqttSettingsPage
 *         /settings/influx → InfluxSettingsPage
 *         /users           → UserManagementPage
 *   *                    → redirect ke /dashboard
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute        from './components/routing/PrivateRoute';
import AdminRoute          from './components/routing/AdminRoute';
import MainLayout          from './components/layout/MainLayout';
import LoginPage           from './pages/LoginPage';
import DashboardPage       from './pages/DashboardPage';
import MqttSettingsPage    from './pages/MqttSettingsPage';
import InfluxSettingsPage  from './pages/InfluxSettingsPage';
import UserManagementPage  from './pages/UserManagementPage';

export default function App() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Protected (login required) ─────────────────────────── */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>

          {/* Semua role */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Admin only */}
          <Route element={<AdminRoute />}>
            <Route path="/settings/mqtt"   element={<MqttSettingsPage />} />
            <Route path="/settings/influx" element={<InfluxSettingsPage />} />
            <Route path="/users"           element={<UserManagementPage />} />
          </Route>

        </Route>
      </Route>

      {/* ── Fallback ────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
