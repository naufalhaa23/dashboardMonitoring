/**
 * AdminRoute.jsx — Proteksi route agar hanya Admin yang bisa akses.
 * Jika login sebagai Viewer, redirect ke /dashboard.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminRoute() {
  const { isAdmin } = useAuth();

  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
