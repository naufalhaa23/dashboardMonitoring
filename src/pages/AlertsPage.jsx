import { useState, useEffect } from 'react';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '../services/alertService';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = () => {
    getAlerts().then(data => {
      setAlerts(data);
      setLoading(false);
    });
  };

  const handleMarkRead = (id) => {
    markAlertAsRead(id).then(() => {
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
    });
  };

  const handleMarkAllRead = () => {
    markAllAlertsAsRead().then(() => {
      setAlerts(alerts.map(a => ({ ...a, is_read: true })));
    });
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Notifikasi & Peringatan</h1>
        {alerts.some(a => !a.is_read) && (
          <button 
            onClick={handleMarkAllRead} 
            style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'background-color 0.2s' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f1f5f9'}
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{ 
            backgroundColor: alert.is_read ? 'white' : '#fee2e2', 
            padding: '16px', 
            borderRadius: '8px', 
            border: alert.is_read ? '1px solid #e2e8f0' : '1px solid #fca5a5',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{alert.alert_type}</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(alert.created_at).toLocaleString('id-ID')}</span>
                <span style={{ fontSize: '12px', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>Alat: {alert.device_name}</span>
              </div>
              <p style={{ margin: 0, color: '#1e293b', fontWeight: alert.is_read ? 'normal' : '600' }}>{alert.message}</p>
            </div>
            {!alert.is_read && (
              <button onClick={() => handleMarkRead(alert.id)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Tandai Dibaca</button>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tidak ada peringatan.</div>
        )}
      </div>
    </div>
  );
}
