"""
routes/settings.py — Endpoint untuk membaca & menyimpan konfigurasi MQTT dan InfluxDB.

Semua endpoint hanya bisa diakses oleh Admin.

Endpoints:
  GET /api/settings/mqtt    — baca konfigurasi MQTT saat ini
  PUT /api/settings/mqtt    — update konfigurasi MQTT
  GET /api/settings/influx  — baca konfigurasi InfluxDB saat ini
  PUT /api/settings/influx  — update konfigurasi InfluxDB
"""

import logging
from flask import Blueprint, request, jsonify
from database import db, Setting, get_setting, set_setting
from auth import require_admin

logger = logging.getLogger(__name__)

settings_bp = Blueprint("settings", __name__)

# ── Kunci setting yang tersimpan di DB ────────────────────────────────────────
MQTT_KEYS   = ["mqtt_broker", "mqtt_port", "mqtt_topic", "mqtt_username", "mqtt_password"]
INFLUX_KEYS = ["influx_url", "influx_token", "influx_org", "influx_bucket"]


def _read_settings(keys: list[str]) -> dict:
    """Baca sekumpulan keys dari tabel settings."""
    return {k: get_setting(k) for k in keys}


# ── MQTT Settings ─────────────────────────────────────────────────────────────

@settings_bp.route("/api/settings/mqtt", methods=["GET"])
@require_admin
def get_mqtt():
    """GET /api/settings/mqtt — return konfigurasi MQTT saat ini."""
    data = _read_settings(MQTT_KEYS)
    # Sembunyikan password dari response (kirim flag saja)
    has_password = bool(data.get("mqtt_password"))
    data["mqtt_password_set"] = has_password
    # Jangan kirim password asli ke frontend
    data["mqtt_password"] = ""
    return jsonify(data)


@settings_bp.route("/api/settings/mqtt", methods=["PUT"])
@require_admin
def update_mqtt():
    """
    PUT /api/settings/mqtt
    Body: { mqtt_broker, mqtt_port, mqtt_topic, mqtt_username, mqtt_password }
    Jika mqtt_password kosong → password tidak diubah (tetap yang lama).
    """
    data = request.get_json(silent=True) or {}

    # Validasi dasar
    broker = data.get("mqtt_broker", "").strip()
    port   = data.get("mqtt_port", "").strip()
    topic  = data.get("mqtt_topic", "").strip()

    if not broker or not port or not topic:
        return jsonify({"error": "Broker, Port, dan Topic wajib diisi."}), 400

    try:
        port_int = int(port)
        if not (1 <= port_int <= 65535):
            raise ValueError
    except ValueError:
        return jsonify({"error": "Port harus berupa angka 1–65535."}), 400

    # Simpan ke DB
    set_setting("mqtt_broker",   broker)
    set_setting("mqtt_port",     str(port_int))
    set_setting("mqtt_topic",    topic)
    set_setting("mqtt_username", data.get("mqtt_username", "").strip())

    # Hanya update password jika diisi (tidak kosong)
    new_password = data.get("mqtt_password", "")
    if new_password:
        set_setting("mqtt_password", new_password)

    logger.info("MQTT settings diperbarui oleh %s", request.current_user["username"])

    # Sync ke config module (runtime) agar efektif tanpa restart
    try:
        import config
        config.MQTT_BROKER   = broker
        config.MQTT_PORT     = port_int
        config.MQTT_TOPIC    = topic
        config.MQTT_USERNAME = data.get("mqtt_username", "").strip()
        if new_password:
            config.MQTT_PASSWORD = new_password
    except Exception as e:
        logger.warning("Gagal sync MQTT config ke runtime: %s", e)

    return jsonify({"message": "Konfigurasi MQTT berhasil disimpan."})


# ── InfluxDB Settings ─────────────────────────────────────────────────────────

@settings_bp.route("/api/settings/influx", methods=["GET"])
@require_admin
def get_influx():
    """GET /api/settings/influx — return konfigurasi InfluxDB saat ini."""
    data = _read_settings(INFLUX_KEYS)
    # Sembunyikan token penuh, kirim masked version
    token = data.get("influx_token", "")
    if len(token) > 8:
        data["influx_token_masked"] = token[:4] + "****" + token[-4:]
    else:
        data["influx_token_masked"] = "****"
    data["influx_token"] = ""  # Jangan kirim token asli
    return jsonify(data)


@settings_bp.route("/api/settings/influx", methods=["PUT"])
@require_admin
def update_influx():
    """
    PUT /api/settings/influx
    Body: { influx_url, influx_token, influx_org, influx_bucket }
    Jika influx_token kosong → token tidak diubah.
    """
    data = request.get_json(silent=True) or {}

    url    = data.get("influx_url", "").strip()
    org    = data.get("influx_org", "").strip()
    bucket = data.get("influx_bucket", "").strip()

    if not url or not org or not bucket:
        return jsonify({"error": "URL, Org, dan Bucket wajib diisi."}), 400

    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "URL harus diawali dengan http:// atau https://"}), 400

    set_setting("influx_url",    url)
    set_setting("influx_org",    org)
    set_setting("influx_bucket", bucket)

    new_token = data.get("influx_token", "")
    if new_token:
        set_setting("influx_token", new_token)

    logger.info("InfluxDB settings diperbarui oleh %s", request.current_user["username"])

    # Sync ke config module (runtime)
    try:
        import config
        config.INFLUX_URL    = url
        config.INFLUX_ORG    = org
        config.INFLUX_BUCKET = bucket
        if new_token:
            config.INFLUX_TOKEN = new_token
    except Exception as e:
        logger.warning("Gagal sync InfluxDB config ke runtime: %s", e)

    return jsonify({"message": "Konfigurasi InfluxDB berhasil disimpan."})
