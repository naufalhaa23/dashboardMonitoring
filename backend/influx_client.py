"""
influx_client.py — Wrapper InfluxDB v2 untuk write data real-time
dan query data historis harian.
"""

import logging
from datetime import datetime, timezone

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import ASYNCHRONOUS

import config

logger = logging.getLogger(__name__)

# ── Measurement name ────────────────────────────────────────────
MEASUREMENT = "power_monitor"
MEASUREMENT_DAILY = "daily_energy_stats"


class InfluxWriter:
    """Tulis data sensor ke InfluxDB v2."""

    def __init__(self):
        self._client = InfluxDBClient(
            url=config.INFLUX_URL,
            token=config.INFLUX_TOKEN,
            org=config.INFLUX_ORG,
            timeout=30_000,          # 30 detik timeout khusus untuk query startup yang berat
            enable_gzip=False,
        )
        self._write_api = self._client.write_api(write_options=ASYNCHRONOUS)
        self._query_api = self._client.query_api()
        self._healthy = False
        self._last_error_log = 0.0   # throttle error logging
        self._check_health()

    def _check_health(self):
        """Cek koneksi ke InfluxDB saat startup."""
        try:
            health = self._client.health()
            if health.status == "pass":
                logger.info("✅ InfluxDB terhubung: %s", config.INFLUX_URL)
                self._healthy = True
            else:
                logger.warning("⚠️ InfluxDB health check: %s", health.message)
        except Exception as e:
            logger.error("❌ Tidak bisa terhubung ke InfluxDB: %s", e)
            self._healthy = False

    @property
    def is_healthy(self) -> bool:
        return self._healthy

    # ── Write ───────────────────────────────────────────────────

    def write_sensor_data(self, data: dict) -> bool:
        """
        Tulis satu data point ke InfluxDB.

        Expected 'data' keys (snake_case, sesuai InfluxDB fields):
            voltage, ampere, watt, kwh_total,
            kwh_wbp_today, kwh_lwbp_today,
            total_cost_today, status_tarif
        """
        try:
            point_power = (
                Point(MEASUREMENT)
                .field("voltage_1", float(data["voltage_1"]))
                .field("voltage_2", float(data["voltage_2"]))
                .field("voltage_3", float(data["voltage_3"]))
                .field("ampere_1", float(data["ampere_1"]))
                .field("ampere_2", float(data["ampere_2"]))
                .field("ampere_3", float(data["ampere_3"]))
                .field("watt", float(data["watt"]))
                .field("plc_absolute_kwh", float(data["plc_absolute_kwh"]))
            )

            point_daily = (
                Point(MEASUREMENT_DAILY)
                .field("kwh_total_today", float(data["kwh_total_today"]))
                .field("kwh_wbp_today", float(data["kwh_wbp_today"]))
                .field("kwh_lwbp_today", float(data["kwh_lwbp_today"]))
                .field("total_cost_today", float(data["total_cost_today"]))
            )

            self._write_api.write(
                bucket=config.INFLUX_BUCKET,
                org=config.INFLUX_ORG,
                record=[point_power, point_daily],
                write_precision=WritePrecision.S,
            )
            self._healthy = True
            return True

        except Exception as e:
            import time as _time
            now = _time.time()
            if now - self._last_error_log > 30:
                logger.error("Gagal menulis ke InfluxDB: %s", e)
                self._last_error_log = now
            self._healthy = False
            return False

    # ── Query: Historical Daily ─────────────────────────────────

    def get_latest_today_state(self) -> dict:
        """
        Mengambil nilai kwh_wbp_today dan kwh_lwbp_today terakhir
        pada hari ini untuk auto-resume saat server menyala kembali, dikelompokkan per device_id.
        Return: { "device_id": {"wbp": 0.0, "lwbp": 0.0, "last_plc_kwh": None}, ... }
        """
        from datetime import datetime
        try:
            today_start = datetime.now().strftime("%Y-%m-%dT00:00:00Z")
            # Query diperbarui: filter untuk measurement "power_monitor" atau "daily_energy_stats"
            flux = f'''
            from(bucket: "{config.INFLUX_BUCKET}")
              |> range(start: {today_start})
              |> filter(fn: (r) => r._measurement == "{MEASUREMENT}" or r._measurement == "{MEASUREMENT_DAILY}")
              |> last()
            '''
            result = self._query_api.query(query=flux, org=config.INFLUX_ORG)
            
            states = {}
            for table in result:
                for record in table.records:
                    device_id = record.values.get("device_id", "default_sensor")
                    if device_id not in states:
                        states[device_id] = {"wbp": 0.0, "lwbp": 0.0, "last_plc_kwh": None}
                    
                    field = record.get_field()
                    val = record.get_value()
                    if field == "kwh_wbp_today":
                        states[device_id]["wbp"] = float(val) if val is not None else 0.0
                    elif field == "kwh_lwbp_today":
                        states[device_id]["lwbp"] = float(val) if val is not None else 0.0
                    elif field == "plc_absolute_kwh":
                        states[device_id]["last_plc_kwh"] = float(val) if val is not None else None
            
            return states
        except Exception as e:
            logger.error("Gagal mengambil state hari ini: %s", e)
            return {}

    def query_daily_history(self, from_date: str, to_date: str) -> list[dict]:
        """
        Query data historis harian dari InfluxDB.

        Args:
            from_date: "YYYY-MM-DD"
            to_date:   "YYYY-MM-DD"

        Returns list of dicts, format sesuai frontend useHistoricalData.js:
            [{date, totalRupiah, kwhWBP, kwhLWBP, totalKwh, totalWatt}, ...]
        """
        # Simpler approach: separate queries then merge in Python
        try:
            results = self._query_fields_daily(from_date, to_date)
            return results
        except Exception as e:
            logger.error("Gagal query historis: %s", e)
            return []

    def _query_fields_daily(self, from_date: str, to_date: str) -> list[dict]:
        """
        Query setiap field secara terpisah dan gabungkan per hari.
        Lebih robust daripada single complex Flux query.
        """
        day_map: dict[str, dict] = {}

        # --- kWh WBP: last per day ---
        self._query_last_per_day(
            from_date, to_date, MEASUREMENT_DAILY, "kwh_wbp_today", day_map, "kwhWBP"
        )
        # --- kWh LWBP: last per day ---
        self._query_last_per_day(
            from_date, to_date, MEASUREMENT_DAILY, "kwh_lwbp_today", day_map, "kwhLWBP"
        )
        # --- Total Cost: last per day ---
        self._query_last_per_day(
            from_date, to_date, MEASUREMENT_DAILY, "total_cost_today", day_map, "totalRupiah"
        )
        # --- Watt: mean per day ---
        self._query_mean_per_day(
            from_date, to_date, MEASUREMENT, "watt", day_map, "totalWatt"
        )

        # Build sorted list
        result = []
        for date_key in sorted(day_map.keys()):
            entry = day_map[date_key]
            kwh_wbp = entry.get("kwhWBP", 0.0)
            kwh_lwbp = entry.get("kwhLWBP", 0.0)
            result.append({
                "date": date_key,
                "totalRupiah": round(entry.get("totalRupiah", 0.0)),
                "kwhWBP": round(kwh_wbp, 2),
                "kwhLWBP": round(kwh_lwbp, 2),
                "totalKwh": round(kwh_wbp + kwh_lwbp, 2),
                "totalWatt": round(entry.get("totalWatt", 0.0)),
            })

        return result

    def _query_last_per_day(
        self, from_date: str, to_date: str,
        measurement: str, field: str, day_map: dict, out_key: str,
    ):
        """Query 'last()' per hari untuk field tertentu."""
        flux = f'''
        from(bucket: "{config.INFLUX_BUCKET}")
          |> range(start: {from_date}T00:00:00Z, stop: {to_date}T23:59:59Z)
          |> filter(fn: (r) => r._measurement == "{measurement}")
          |> filter(fn: (r) => r._field == "{field}")
          |> aggregateWindow(every: 1d, fn: last, createEmpty: false)
          |> yield(name: "last")
        '''
        try:
            tables = self._query_api.query(flux, org=config.INFLUX_ORG)
            for table in tables:
                for record in table.records:
                    date_key = record.get_time().strftime("%Y-%m-%d")
                    if date_key not in day_map:
                        day_map[date_key] = {}
                    day_map[date_key][out_key] = float(record.get_value())
        except Exception as e:
            logger.error("Query '%s' gagal: %s", field, e)

    def _query_mean_per_day(
        self, from_date: str, to_date: str,
        measurement: str, field: str, day_map: dict, out_key: str,
    ):
        """Query 'mean()' per hari untuk field tertentu."""
        flux = f'''
        from(bucket: "{config.INFLUX_BUCKET}")
          |> range(start: {from_date}T00:00:00Z, stop: {to_date}T23:59:59Z)
          |> filter(fn: (r) => r._measurement == "{measurement}")
          |> filter(fn: (r) => r._field == "{field}")
          |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
          |> yield(name: "mean")
        '''
        try:
            tables = self._query_api.query(flux, org=config.INFLUX_ORG)
            for table in tables:
                for record in table.records:
                    date_key = record.get_time().strftime("%Y-%m-%d")
                    if date_key not in day_map:
                        day_map[date_key] = {}
                    day_map[date_key][out_key] = float(record.get_value())
        except Exception as e:
            logger.error("Query '%s' gagal: %s", field, e)

    # ── Cleanup ─────────────────────────────────────────────────

    def close(self):
        """Tutup koneksi InfluxDB."""
        self._client.close()
        logger.info("Koneksi InfluxDB ditutup")
