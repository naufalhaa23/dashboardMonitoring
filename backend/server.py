"""
server.py — Flask-SocketIO server dengan REST API, Auth, dan Settings.

Endpoints:
  POST /api/auth/login       — login, return JWT
  GET  /api/auth/me          — cek token & return profil user
  GET  /api/users            — daftar user (Admin)
  POST /api/users            — buat user (Admin)
  DELETE /api/users/<id>     — hapus user (Admin)
  PUT  /api/users/<id>/role  — ubah role (Admin)
  GET  /api/settings/mqtt    — baca config MQTT (Admin)
  PUT  /api/settings/mqtt    — update config MQTT (Admin)
  GET  /api/settings/influx  — baca config InfluxDB (Admin)
  PUT  /api/settings/influx  — update config InfluxDB (Admin)
  GET  /api/history          — data historis harian (Auth Required)
  GET  /api/health           — health check (Public)
  Socket.io 'sensor-data'    — real-time data (di-emit oleh worker)
"""

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

import config
from database import db, init_db
from auth import auth_bp, require_auth
from routes.users import users_bp
from routes.settings import settings_bp
from routes.devices import devices_bp
from routes.alerts import alerts_bp
from routes.tariffs import tariffs_bp

logger = logging.getLogger(__name__)

# ── Flask App ────────────────────────────────────────────────────────────────
app = Flask(__name__)

# Konfigurasi SQLite database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = config.JWT_SECRET_KEY

# Init SQLAlchemy dengan app
db.init_app(app)

# CORS: izinkan semua origin (untuk dev); di production batasi sesuai domain
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Register Blueprints ───────────────────────────────────────────────────────
app.register_blueprint(auth_bp)
app.register_blueprint(users_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(devices_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(tariffs_bp)

# ── Socket.io ────────────────────────────────────────────────────────────────
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False,
)

# ── Lazy InfluxDB client ──────────────────────────────────────────────────────
_influx = None


def _get_influx():
    """Lazy-init InfluxDB client — hanya dibuat saat ada request historis."""
    global _influx
    if _influx is None:
        from influx_client import InfluxWriter
        _influx = InfluxWriter()
    return _influx


# ── Socket.io Events ─────────────────────────────────────────────────────────

@socketio.on("connect")
def handle_connect():
    logger.info("🔌 Client terhubung: %s", request.sid)


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("🔌 Client terputus: %s", request.sid)


# ── REST API ─────────────────────────────────────────────────────────────────

@app.route("/api/history", methods=["GET"])
@require_auth
def get_history():
    """
    GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD
    Memerlukan JWT yang valid (Admin atau Viewer).
    """
    from_date = request.args.get("from")
    to_date   = request.args.get("to")

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
    """Health check endpoint — public, tanpa auth."""
    return jsonify({
        "status":             "ok",
        "influxdb_configured": bool(config.INFLUX_URL),
        "mock_mqtt":          config.MOCK_MQTT,
        "server_port":        config.SERVER_PORT,
    })


# ── Accessor ─────────────────────────────────────────────────────────────────

def get_socketio():
    """Return socketio instance untuk digunakan oleh worker."""
    return socketio


def get_app():
    """Return Flask app instance."""
    return app
