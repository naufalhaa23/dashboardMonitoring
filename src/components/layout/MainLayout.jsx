/**
 * MainLayout.jsx — Layout utama yang menyatukan Sidebar + konten halaman.
 * Digunakan oleh semua halaman yang memerlukan autentikasi.
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)' }}>
      {/* Sidebar navigasi */}
      <Sidebar />

      {/* Konten halaman — berubah sesuai route aktif */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
