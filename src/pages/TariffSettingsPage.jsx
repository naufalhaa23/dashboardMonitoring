import { useState, useEffect } from 'react';
import { getTariffs, updateTariff } from '../services/tariffService';

export default function TariffSettingsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = () => {
    getTariffs().then(data => {
      setTariffs(data);
      setLoading(false);
    });
  };

  const handleUpdate = (id, currentPrice) => {
    const newPrice = window.prompt("Masukkan harga baru (Rp/kWh):", currentPrice);
    if (newPrice !== null && !isNaN(newPrice)) {
      updateTariff(id, { price_per_kwh: newPrice }).then(() => {
        fetchTariffs();
      });
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Pengaturan Tarif Listrik Dasar</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Tarif ini akan digunakan untuk menghitung estimasi biaya harian secara real-time.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {tariffs.map(tariff => (
          <div key={tariff.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: '4px solid #3b82f6' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>Tarif {tariff.name}</h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>
              Rp {tariff.price_per_kwh.toLocaleString('id-ID')} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>/ kWh</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              Diperbarui: {new Date(tariff.updated_at).toLocaleString('id-ID')}
            </div>
            <button 
              onClick={() => handleUpdate(tariff.id, tariff.price_per_kwh)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
              Ubah Harga
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
