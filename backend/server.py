"""
server.py — Flask-SocketIO server dengan REST API untuk data historis.

Endpoints:
  - Socket.io event 'sensor-data': real-time data (di-emit oleh worker)
  - GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD: data historis harian
  - GET /api/health: health check
"""

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

import config

logger = logging.getLogger(__name__)

# ── Flask App ───────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Socket.io ───────────────────────────────────────────────────
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False,
)

# ── Lazy InfluxDB client (hanya dibuat saat dibutuhkan) ─────────
_influx = None


def _get_influx():
    """Lazy-init InfluxDB client — hanya dibuat saat ada request historis."""
    global _influx
    if _influx is None:
        from influx_client import InfluxWriter
        _influx = InfluxWriter()
    return _influx


# ── Socket.io Events ───────────────────────────────────────────

@socketio.on("connect")
def handle_connect():
    logger.info("🔌 Client terhubung: %s", request.sid)


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("🔌 Client terputus: %s", request.sid)


# ── REST API ────────────────────────────────────────────────────

@app.route("/api/history", methods=["GET"])
def get_history():
    """
    GET /api/history?from=2026-04-01&to=2026-04-07

    Returns JSON array sesuai format frontend useHistoricalData.js:
    [
      {
        "date": "2026-04-01",
        "totalRupiah": 245000,
        "kwhWBP": 45.23,
        "kwhLWBP": 132.87,
        "totalKwh": 178.10,
        "totalWatt": 7420
      },
      ...
    ]
    """
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if not from_date or not to_date:
        return jsonify({"error": "Parameter 'from' dan 'to' diperlukan"}), 400

    try:
        influx = _get_influx()
        data = influx.query_daily_history(from_date, to_date)
        return jsonify(data)
    except Exception as e:
        logger.error("Error pada /api/history: %s", e)
        return jsonify({"error": "Gagal mengambil data historis"}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint — ringan, tanpa query InfluxDB."""
    return jsonify({
        "status": "ok",
        "influxdb_configured": bool(config.INFLUX_URL),
        "mock_modbus": config.MOCK_MODBUS,
        "server_port": config.SERVER_PORT,
    })


# ── Accessor ────────────────────────────────────────────────────

def get_socketio():
    """Return socketio instance untuk digunakan oleh worker."""
    return socketio


def get_app():
    """Return Flask app instance."""
    return app
