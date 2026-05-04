import { useState, useEffect } from 'react';
import { getDevices, createDevice, updateDevice, deleteDevice } from '../services/deviceService';

export default function DeviceManagementPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newDeviceId, setNewDeviceId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newMaxAmpere, setNewMaxAmpere] = useState(100);

  // State untuk mode edit
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = () => {
    setLoading(true);
    getDevices().then(data => {
      setDevices(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleAddDevice = (e) => {
    e.preventDefault();
    createDevice({
      device_id: newDeviceId,
      name: newName,
      location: newLocation,
      max_ampere: newMaxAmpere,
      is_active: true
    }).then(() => {
      fetchDevices();
      setNewDeviceId('');
      setNewName('');
      setNewLocation('');
      setNewMaxAmpere(100);
    }).catch(err => alert("Gagal menambah alat"));
  };

  const handleDelete = (id) => {
    if (window.confirm("Hapus alat ini?")) {
      deleteDevice(id).then(() => fetchDevices());
    }
  };

  const handleEditClick = (device) => {
    setEditingId(device.id);
    setEditFormData({
      name: device.name,
      location: device.location,
      max_ampere: device.max_ampere,
    });
  };

  const handleSaveEdit = (id) => {
    updateDevice(id, editFormData).then(() => {
      setEditingId(null);
      fetchDevices();
    }).catch(err => alert("Gagal menyimpan perubahan"));
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Manajemen Alat (Devices)</h1>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Tambah Alat Baru</h2>
        <form onSubmit={handleAddDevice} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '14px', marginBottom: '4px' }}>Device ID (MQTT Topic)</label>
            <input required value={newDeviceId} onChange={e=>setNewDeviceId(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '14px', marginBottom: '4px' }}>Nama Alat</label>
            <input required value={newName} onChange={e=>setNewName(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '14px', marginBottom: '4px' }}>Lokasi</label>
            <input value={newLocation} onChange={e=>setNewLocation(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '14px', marginBottom: '4px' }}>Kapasitas Trafo (A)</label>
            <input type="number" required value={newMaxAmpere} onChange={e=>setNewMaxAmpere(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '120px' }} />
          </div>
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Tambah</button>
        </form>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Device ID</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Nama</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Lokasi</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Max Ampere</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(device => (
              <tr key={device.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px' }}>{device.device_id}</td>
                {editingId === device.id ? (
                  <>
                    <td style={{ padding: '12px 16px' }}>
                      <input value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} style={{ padding: '4px', width: '100%' }} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <input value={editFormData.location} onChange={e => setEditFormData({...editFormData, location: e.target.value})} style={{ padding: '4px', width: '100%' }} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <input type="number" value={editFormData.max_ampere} onChange={e => setEditFormData({...editFormData, max_ampere: e.target.value})} style={{ padding: '4px', width: '80px' }} /> A
                    </td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleSaveEdit(device.id)} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Simpan</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Batal</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '12px 16px' }}>{device.name}</td>
                    <td style={{ padding: '12px 16px' }}>{device.location}</td>
                    <td style={{ padding: '12px 16px' }}>{device.max_ampere} A</td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditClick(device)} style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                      <button onClick={() => handleDelete(device.id)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Hapus</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {devices.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Belum ada alat yang terdaftar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
