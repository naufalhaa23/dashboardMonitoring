"""
worker.py — Main polling loop: baca PLC, hitung WBP/LWBP, tulis InfluxDB, emit Socket.io.

Logika bisnis:
  1. Baca Voltage, Ampere, Total kWh dari PLC setiap 1 detik
  2. Hitung Delta kWh = Current - Last
  3. Jika 18:00–22:00 WIB → tambah ke kwh_wbp_today, selain itu → kwh_lwbp_today
  4. Hitung total_cost_today = (WBP × Tarif_WBP) + (LWBP × Tarif_LWBP)
  5. Auto-reset semua akumulator harian pada jam 00:00 WIB
"""

import logging
import time
import threading
from datetime import datetime, date

import config
from mqtt_client import MQTTReader
from influx_client import InfluxWriter
from database import db, Device, Alert, Tariff
from server import app

logger = logging.getLogger(__name__)


class PowerMonitorWorker:
    """Event-driven worker dengan kalkulasi WBP/LWBP dan biaya harian via MQTT."""

    def __init__(self, socketio=None):
        self._mqtt = MQTTReader(on_message_callback=self._on_mqtt_message)
        self._influx = InfluxWriter()
        self._socketio = socketio

        # ── State akumulator harian ─────────────────────────────
        # Bentuk: { "device_id": { "last_plc_kwh": float|None, "wbp": float, "lwbp": float } }
        self._device_states = self._influx.get_latest_today_state()
        
        self._last_reset_date: date = date.today()  # Tanggal terakhir reset

        # ── Control ─────────────────────────────────────────────
        self._running: bool = False
        self._cycle_count: int = 0

    # ── Main Loop ───────────────────────────────────────────────

    def start(self):
        """Mulai MQTT Listener. Tidak blocking krn MQTT paho ada thread tersendiri."""
        self._running = True
        logger.info("🚀 Worker dimulai (Event-Driven MQTT)")
        logger.info("   InfluxDB: %s bucket=%s",
                     config.INFLUX_URL, config.INFLUX_BUCKET)

        self._mqtt.start()

    def stop(self):
        """Hentikan polling loop/MQTT."""
        self._running = False
        self._mqtt.stop()
        self._influx.close()
        logger.info("Worker dihentikan")

    # ── Single Message Emission Cycle ───────────────────────────────────────

    def _on_mqtt_message(self, msg_payload):
        """Satu siklus kalkulasi dipanggil melalui MQTT event."""
        if not self._running:
            return
        now = datetime.now()

        # 1. Auto-reset pada pergantian hari (00:00 WIB)
        self._check_daily_reset(now)

        voltage_1 = msg_payload["voltage_1"]
        voltage_2 = msg_payload["voltage_2"]
        voltage_3 = msg_payload["voltage_3"]
        ampere_1 = msg_payload["ampere_1"]
        ampere_2 = msg_payload["ampere_2"]
        ampere_3 = msg_payload["ampere_3"]
        
        # Calculate average voltage and total current for simple display, 
        # but also send the detailed data.
        avg_voltage = (voltage_1 + voltage_2 + voltage_3) / 3.0
        total_ampere = ampere_1 + ampere_2 + ampere_3
        kwh_total = msg_payload["kwh_total"]

        # 2. Ambil device_id dari payload
        device_id_str = msg_payload.get("device_id", "default_sensor")
        
        # Inisialisasi state untuk device ini jika belum ada
        if device_id_str not in self._device_states:
            self._device_states[device_id_str] = {"last_plc_kwh": None, "wbp": 0.0, "lwbp": 0.0}
            
        state = self._device_states[device_id_str]

        # 3. Hitung delta kWh
        if state["last_plc_kwh"] is not None:
            delta_kwh = kwh_total - state["last_plc_kwh"]
            # Abaikan delta negatif (bisa terjadi saat PLC reset/overflow)
            if delta_kwh < 0:
                logger.warning("[%s] Delta kWh negatif (%.3f) — PLC reset? Abaikan.",
                               device_id_str, delta_kwh)
                delta_kwh = 0.0
        else:
            # Pertama kali — tidak ada delta
            delta_kwh = 0.0
            logger.info("[%s] Inisialisasi last_kwh = %.3f", device_id_str, kwh_total)

        state["last_plc_kwh"] = kwh_total

        # 4. Tentukan WBP vs LWBP dan akumulasi
        is_wbp = config.WBP_START_HOUR <= now.hour < config.WBP_END_HOUR

        if is_wbp:
            state["wbp"] += delta_kwh
        else:
            state["lwbp"] += delta_kwh

        # Dapatkan konteks aplikasi untuk akses database
        with app.app_context():
            device = Device.query.filter_by(device_id=device_id_str).first()
            if not device:
                # Fallback ke sensor default jika ada, atau abaikan pengecekan
                device = Device.query.first()

            # Ambil tarif dari database (jika tidak ada fallback ke config)
            tariff_wbp_record = Tariff.query.filter_by(name="WBP").first()
            tariff_lwbp_record = Tariff.query.filter_by(name="LWBP").first()
            
            val_tariff_wbp = tariff_wbp_record.price_per_kwh if tariff_wbp_record else config.TARIFF_WBP
            val_tariff_lwbp = tariff_lwbp_record.price_per_kwh if tariff_lwbp_record else config.TARIFF_LWBP

            # Cek alert Ampere melebihi kapasitas trafo (max_ampere)
            if device:
                max_amp = device.max_ampere
                if ampere_1 > max_amp or ampere_2 > max_amp or ampere_3 > max_amp:
                    alert_msg = f"Ampere melebihi kapasitas trafo ({max_amp}A) pada alat {device.name}. "
                    alert_msg += f"Terbaca: L1={ampere_1}A, L2={ampere_2}A, L3={ampere_3}A."
                    
                    # Hindari spam alert: cek apakah alert serupa sudah ada dalam 5 menit terakhir
                    recent_alert = Alert.query.filter_by(device_id=device.id, alert_type="OVER_CURRENT", is_read=False).order_by(Alert.created_at.desc()).first()
                    
                    should_alert = True
                    if recent_alert:
                        # hitung selisih waktu
                        diff = (datetime.now(recent_alert.created_at.tzinfo) - recent_alert.created_at).total_seconds()
                        if diff < 300: # 5 menit
                            should_alert = False

                    if should_alert:
                        new_alert = Alert(device_id=device.id, alert_type="OVER_CURRENT", message=alert_msg)
                        db.session.add(new_alert)
                        db.session.commit()
                        logger.warning("🚨 [ALERT] %s", alert_msg)
                        if self._socketio:
                            self._socketio.emit("new-alert", new_alert.to_dict())

        # 5. Hitung biaya harian menggunakan tarif dari database
        total_cost_today = (
            (state["wbp"] * val_tariff_wbp) +
            (state["lwbp"] * val_tariff_lwbp)
        )

        # 6. Hitung Total kWh Harian (WBP + LWBP)
        total_kwh_today = state["wbp"] + state["lwbp"]

        # 7. Hitung daya sesaat total (3 fasa)
        watt = (voltage_1 * ampere_1) + (voltage_2 * ampere_2) + (voltage_3 * ampere_3)

        # 8. Status tarif
        status = "WBP" if is_wbp else "LWBP"
        tariff = val_tariff_wbp if is_wbp else val_tariff_lwbp

        # ── Data untuk InfluxDB (snake_case) ────────────────────
        influx_data = {
            "device_id": device_id_str, # Jika influx juga ingin tracking device_id (perlu modif di influx_client)
            "voltage_1": voltage_1,
            "voltage_2": voltage_2,
            "voltage_3": voltage_3,
            "ampere_1": ampere_1,
            "ampere_2": ampere_2,
            "ampere_3": ampere_3,
            "watt": round(watt, 2),
            "plc_absolute_kwh": kwh_total,  # Disimpan KHUSUS untuk acuan Auto-Resume gap fill
            "kwh_wbp_today": round(state["wbp"], 4),
            "kwh_lwbp_today": round(state["lwbp"], 4),
            "kwh_total_today": round(total_kwh_today, 4), # (Penjumlahan WBP + LWBP hari ini)
            "total_cost_today": round(total_cost_today, 2),
            "status_tarif": status,
        }

        # ── Data untuk Socket.io (camelCase, sesuai React frontend) ─
        socket_payload = {
            "device_id": device_id_str,
            "voltage1": voltage_1,
            "voltage2": voltage_2,
            "voltage3": voltage_3,
            "ampere1": ampere_1,
            "ampere2": ampere_2,
            "ampere3": ampere_3,
            "avgVoltage": round(avg_voltage, 1),
            "totalAmpere": round(total_ampere, 2),
            "watt": round(watt, 2),
            "status": status,
            "tariff": tariff,
            "totalRupiah": round(total_cost_today),
            "kwhWBP": round(state["wbp"], 2),
            "kwhLWBP": round(state["lwbp"], 2),
            "totalKwhToday": round(total_kwh_today, 2),
            "timestamp": now.isoformat(),
        }

        # 8. Emit via Socket.io (fast — done first)
        if self._socketio:
            self._socketio.emit("sensor-data", socket_payload)

        # 9. Tulis ke InfluxDB (pisahkan thread agar tidak memblokir MQTT jika InfluxDB down)
        threading.Thread(
            target=self._influx.write_sensor_data,
            args=(influx_data,),
            daemon=True
        ).start()

        # 10. Log periodik (setiap 10 cycle)
        self._cycle_count += 1
        if self._cycle_count % 10 == 0:
            logger.info(
                "[%s] 📊 V=%.1fV | A=%.2fA | W=%.0fW | WBP=%.2f | "
                "LWBP=%.2f | Rp%s",
                device_id_str, avg_voltage, total_ampere, watt,
                state["wbp"], state["lwbp"], f"{total_cost_today:,.0f}"
            )

    # ── Daily Reset ─────────────────────────────────────────────

    def _check_daily_reset(self, now: datetime):
        """Reset akumulator harian saat berganti hari (00:00 WIB)."""
        today = now.date()
        if today > self._last_reset_date:
            logger.info("🔄 Auto-reset harian untuk semua alat")
            for dev_id, state in self._device_states.items():
                state["wbp"] = 0.0
                state["lwbp"] = 0.0
            self._last_reset_date = today
