/**
 * MainLayout.jsx — Layout utama yang menyatukan Sidebar + konten halaman.
 * Digunakan oleh semua halaman yang memerlukan autentikasi.
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar navigasi */}
      <Sidebar />

      {/* Konten halaman — berubah sesuai route aktif */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}