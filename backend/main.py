"""
main.py — Entrypoint: jalankan Socket.io server dan worker polling loop.

Usage:
  python main.py

Worker berjalan di background thread, server di main thread.
"""

import logging
import threading
import signal
import sys

import config
from server import socketio, app
from worker import PowerMonitorWorker

# ── Logging Setup ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)-18s │ %(message)s",
    datefmt="%H:%M:%S",
)

# Reduce noise from libraries
logging.getLogger("engineio").setLevel(logging.WARNING)
logging.getLogger("socketio").setLevel(logging.WARNING)
logging.getLogger("werkzeug").setLevel(logging.WARNING)

logger = logging.getLogger("main")

# ── Global worker reference ─────────────────────────────────────
worker: PowerMonitorWorker | None = None


def run_worker():
    """Worker loop — dijalankan di background thread."""
    global worker
    worker = PowerMonitorWorker(socketio=socketio)
    worker.start()


def signal_handler(sig, frame):
    """Graceful shutdown."""
    logger.info("⛔ Menerima sinyal shutdown...")
    if worker:
        worker.stop()
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("=" * 60)
    logger.info("  ⚡ IoT Power Monitor — Backend Worker")
    logger.info("=" * 60)
    logger.info("  Mode     : %s", "MOCK (simulasi MQTT)" if config.MOCK_MQTT else "LIVE (MQTT)")
    logger.info("  MQTT Broker: %s:%s", config.MQTT_BROKER, config.MQTT_PORT)
    logger.info("  MQTT Topic : %s", config.MQTT_TOPIC)
    logger.info("  InfluxDB : %s", config.INFLUX_URL)
    logger.info("  Server   : http://%s:%s", config.SERVER_HOST, config.SERVER_PORT)
    logger.info("  Tarif WBP: Rp %s/kWh", f"{config.TARIFF_WBP:,.2f}")
    logger.info("  Tarif LWBP: Rp %s/kWh", f"{config.TARIFF_LWBP:,.2f}")
    logger.info("  WBP      : %02d:00 — %02d:00 WIB",
                config.WBP_START_HOUR, config.WBP_END_HOUR)
    logger.info("=" * 60)

    # Start worker di background thread
    worker_thread = threading.Thread(target=run_worker, daemon=True)
    worker_thread.start()
    logger.info("🏭 Worker thread dimulai")

    # Start Flask-SocketIO server di main thread
    logger.info("🌐 Server dimulai di http://%s:%s",
                config.SERVER_HOST, config.SERVER_PORT)
    socketio.run(
        app,
        host=config.SERVER_HOST,
        port=config.SERVER_PORT,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )


if __name__ == "__main__":
    main()
