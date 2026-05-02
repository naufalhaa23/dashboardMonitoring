"""
config.py — Konfigurasi backend dari environment variables.
Salin .env.example → .env dan sesuaikan nilainya.
"""

import os
from dotenv import load_dotenv

load_dotenv()


def _float(key: str, default: float) -> float:
    return float(os.getenv(key, default))


def _int(key: str, default: int) -> int:
    return int(os.getenv(key, default))


def _bool(key: str, default: bool) -> bool:
    val = os.getenv(key, str(default)).lower()
    return val in ("true", "1", "yes")


# ── MQTT Broker (IoT Device) ──────────────────────────────
MQTT_BROKER = os.getenv("MQTT_BROKER", "127.0.0.1")
MQTT_PORT = _int("MQTT_PORT", 1883)
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "sensor/power_meter")
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# Mock mode — simulate MQTT payload when no real broker is available
MOCK_MQTT = _bool("MOCK_MQTT", True)

# ── InfluxDB v2 ─────────────────────────────────────────────────
INFLUX_URL = os.getenv("INFLUX_URL", "http://localhost:8086")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN", "my-token")
INFLUX_ORG = os.getenv("INFLUX_ORG", "my-org")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "power_monitor")

# ── Tarif Listrik ───────────────────────────────────────────────
TARIFF_WBP = _float("TARIFF_WBP", 1444.70)    # Rp/kWh WBP
TARIFF_LWBP = _float("TARIFF_LWBP", 1114.74)  # Rp/kWh LWBP
WBP_START_HOUR = _int("WBP_START_HOUR", 18)    # 18:00
WBP_END_HOUR = _int("WBP_END_HOUR", 22)        # 22:00

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = _int("SERVER_PORT", 3001)

# ── Auth ────────────────────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "GANTI-INI-DENGAN-SECRET-YANG-AMAN")
