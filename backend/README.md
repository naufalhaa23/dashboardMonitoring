# Backend Worker — IoT Power Monitor

Python backend yang polling data dari PLC via Modbus TCP, menghitung biaya WBP/LWBP, menyimpan ke InfluxDB v2, dan mengirimkan data real-time ke frontend React via Socket.io.

## Arsitektur

```
PLC (Modbus TCP) → Python Worker → InfluxDB v2
                                 → Socket.io → React Frontend
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Konfigurasi

Salin dan sesuaikan file `.env`:

```bash
copy .env.example .env
```

Edit `.env` — yang **wajib diubah**:

| Variable       | Deskripsi                          | Default           |
|---------------|------------------------------------|--------------------|
| `MODBUS_HOST`  | IP PLC / Power Meter               | `192.168.0.111`    |
| `INFLUX_TOKEN` | Token InfluxDB v2                  | `my-token`         |
| `INFLUX_ORG`   | Organization InfluxDB              | `my-org`           |
| `INFLUX_BUCKET`| Bucket InfluxDB                    | `power_monitor`    |
| `MOCK_MODBUS`  | `true` untuk simulasi tanpa PLC    | `true`             |

### 3. Jalankan

```bash
python main.py
```

Output:
```
============================================================
  ⚡ IoT Power Monitor — Backend Worker
============================================================
  Mode     : MOCK (simulasi)
  PLC      : 192.168.0.111:502
  InfluxDB : http://localhost:8086
  Server   : http://0.0.0.0:3001
  Tarif WBP: Rp 1,444.70/kWh
  Tarif LWBP: Rp 1,114.74/kWh
  WBP      : 18:00 — 22:00 WIB
============================================================
```

### 4. Hubungkan Frontend

Di frontend React, ubah `useSocket(true)` → `useSocket(false)` di `App.jsx` agar menggunakan koneksi Socket.io ke backend.

## Register Modbus

| Register | Alamat | Tipe    | Deskripsi              |
|----------|--------|---------|------------------------|
| Voltage  | 0      | Float32 | Tegangan (V)           |
| Ampere   | 10     | Float32 | Arus (A)               |
| kWh      | 20     | Float32 | Total kWh (kumulatif)  |

> ⚠️ Alamat kWh Total (20) adalah placeholder — sesuaikan dengan datasheet Power Meter Anda.

## API Endpoints

### Socket.io — Real-time

Event: `sensor-data` (emitted setiap 1 detik)

```json
{
  "voltage": 220.5,
  "ampere": 12.34,
  "watt": 2720.97,
  "status": "LWBP",
  "tariff": 1114.74,
  "totalRupiah": 156000,
  "kwhWBP": 45.23,
  "kwhLWBP": 132.87,
  "timestamp": "2026-04-09T13:30:00.000000"
}
```

### REST — Historical

`GET /api/history?from=2026-04-01&to=2026-04-07`

```json
[
  {
    "date": "2026-04-01",
    "totalRupiah": 245000,
    "kwhWBP": 45.23,
    "kwhLWBP": 132.87,
    "totalKwh": 178.10,
    "totalWatt": 7420
  }
]
```

### Health Check

`GET /api/health`

```json
{
  "status": "ok",
  "influxdb": true,
  "mock_modbus": true
}
```

## Struktur File

```
backend/
├── main.py              # Entrypoint
├── config.py            # Konfigurasi dari .env
├── modbus_client.py     # Pembacaan PLC via Modbus TCP
├── influx_client.py     # Write/query InfluxDB v2
├── worker.py            # Polling loop + logika bisnis
├── server.py            # Flask-SocketIO + REST API
├── requirements.txt     # Dependencies
├── .env                 # Konfigurasi lokal (jangan commit)
└── .env.example         # Template konfigurasi
```
