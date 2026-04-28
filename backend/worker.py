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

logger = logging.getLogger(__name__)


class PowerMonitorWorker:
    """Event-driven worker dengan kalkulasi WBP/LWBP dan biaya harian via MQTT."""

    def __init__(self, socketio=None):
        self._mqtt = MQTTReader(on_message_callback=self._on_mqtt_message)
        self._influx = InfluxWriter()
        self._socketio = socketio

        # ── State akumulator harian ─────────────────────────────
        self._last_kwh: float | None = None   # Nilai kWh terakhir dari PLC
        
        # Auto-resume state dari InfluxDB agar tidak reset saat direstart!
        latest_state = self._influx.get_latest_today_state()
        self._last_kwh: float | None = latest_state.get("last_plc_kwh", None)
        self._kwh_wbp_today: float = latest_state.get("wbp", 0.0)
        self._kwh_lwbp_today: float = latest_state.get("lwbp", 0.0)
        
        self._total_cost_today: float = 0.0   # Biaya harian (Rp) - akan dihitung ulang di tiap siklus
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

        # 3. Hitung delta kWh
        if self._last_kwh is not None:
            delta_kwh = kwh_total - self._last_kwh
            # Abaikan delta negatif (bisa terjadi saat PLC reset/overflow)
            if delta_kwh < 0:
                logger.warning("Delta kWh negatif (%.3f) — PLC reset? Abaikan.",
                               delta_kwh)
                delta_kwh = 0.0
        else:
            # Pertama kali — tidak ada delta
            delta_kwh = 0.0
            logger.info("Inisialisasi last_kwh = %.3f", kwh_total)

        self._last_kwh = kwh_total

        # 4. Tentukan WBP vs LWBP dan akumulasi
        is_wbp = config.WBP_START_HOUR <= now.hour < config.WBP_END_HOUR

        if is_wbp:
            self._kwh_wbp_today += delta_kwh
        else:
            self._kwh_lwbp_today += delta_kwh

        # 5. Hitung biaya harian
        self._total_cost_today = (
            (self._kwh_wbp_today * config.TARIFF_WBP) +
            (self._kwh_lwbp_today * config.TARIFF_LWBP)
        )

        # 6. Hitung Total kWh Harian (WBP + LWBP)
        total_kwh_today = self._kwh_wbp_today + self._kwh_lwbp_today

        # 7. Hitung daya sesaat total (3 fasa)
        watt = (voltage_1 * ampere_1) + (voltage_2 * ampere_2) + (voltage_3 * ampere_3)

        # 8. Status tarif
        status = "WBP" if is_wbp else "LWBP"
        tariff = config.TARIFF_WBP if is_wbp else config.TARIFF_LWBP

        # ── Data untuk InfluxDB (snake_case) ────────────────────
        influx_data = {
            "voltage_1": voltage_1,
            "voltage_2": voltage_2,
            "voltage_3": voltage_3,
            "ampere_1": ampere_1,
            "ampere_2": ampere_2,
            "ampere_3": ampere_3,
            "watt": round(watt, 2),
            "plc_absolute_kwh": kwh_total,  # Disimpan KHUSUS untuk acuan Auto-Resume gap fill
            "kwh_wbp_today": round(self._kwh_wbp_today, 4),
            "kwh_lwbp_today": round(self._kwh_lwbp_today, 4),
            "kwh_total_today": round(total_kwh_today, 4), # (Penjumlahan WBP + LWBP hari ini)
            "total_cost_today": round(self._total_cost_today, 2),
            "status_tarif": status,
        }

        # ── Data untuk Socket.io (camelCase, sesuai React frontend) ─
        socket_payload = {
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
            "totalRupiah": round(self._total_cost_today),
            "kwhWBP": round(self._kwh_wbp_today, 2),
            "kwhLWBP": round(self._kwh_lwbp_today, 2),
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
                "📊 V_avg=%.1fV | A_tot=%.2fA | W=%.0fW | kWh_WBP=%.2f | "
                "kWh_LWBP=%.2f | Biaya=Rp%s | %s",
                avg_voltage, total_ampere, watt,
                self._kwh_wbp_today, self._kwh_lwbp_today,
                f"{self._total_cost_today:,.0f}", status,
            )

    # ── Daily Reset ─────────────────────────────────────────────

    def _check_daily_reset(self, now: datetime):
        """Reset akumulator harian saat berganti hari (00:00 WIB)."""
        today = now.date()
        if today > self._last_reset_date:
            logger.info(
                "🔄 Auto-reset harian — "
                "WBP=%.2f kWh, LWBP=%.2f kWh, Biaya=Rp%s",
                self._kwh_wbp_today,
                self._kwh_lwbp_today,
                f"{self._total_cost_today:,.0f}",
            )
            self._kwh_wbp_today = 0.0
            self._kwh_lwbp_today = 0.0
            self._total_cost_today = 0.0
            self._last_reset_date = today
            # last_kwh TIDAK di-reset — tetap tracking counter PLC
