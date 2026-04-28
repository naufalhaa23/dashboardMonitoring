import json
import logging
import time
import threading
import random
import paho.mqtt.client as mqtt

import config

logger = logging.getLogger(__name__)

class MQTTReader:
    """MQTT Client untuk berlangganan sensor power meter."""

    def __init__(self, on_message_callback):
        """
        :param on_message_callback: function(dict) yang akan dipanggil 
                                    setiap ada data payload valid.
        """
        self._on_message_callback = on_message_callback
        self._client = None
        self._mock_thread = None
        self._running = False

    def start(self):
        self._running = True
        logger.info("📡 MQTTReader: MOCK_MQTT = %s", config.MOCK_MQTT)
        if config.MOCK_MQTT:
            self._start_mock()
        else:
            self._start_real_mqtt()

    def stop(self):
        self._running = False
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            logger.info("🔌 MQTT disconnected.")

    def _start_real_mqtt(self):
        import uuid
        client_id = f"power_backend_{uuid.uuid4().hex[:8]}"
        self._client = mqtt.Client(client_id=client_id)
        if config.MQTT_USERNAME and config.MQTT_PASSWORD:
            self._client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)

        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect

        try:
            logger.info("Menghubungkan ke MQTT Broker %s:%s...", config.MQTT_BROKER, config.MQTT_PORT)
            self._client.connect(config.MQTT_BROKER, config.MQTT_PORT, 60)
            self._client.loop_start()
        except Exception as e:
            logger.error("❌ Gagal terhubung ke MQTT Broker: %s", e)

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("✅ Terhubung ke MQTT Broker.")
            client.subscribe(config.MQTT_TOPIC)
            logger.info("📥 Subscribed ke topik: %s", config.MQTT_TOPIC)
        else:
            logger.error("❌ Gagal terhubung ke MQTT Broker, return code %d", rc)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning("⚠️ Terputus dari MQTT Broker! Mencoba reconnect...")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            self._validate_and_trigger(payload)
        except json.JSONDecodeError:
            logger.warning("Terima payload MQTT invalid (bukan JSON): %s", msg.payload)
        except Exception as e:
            logger.error("Error memproses pesan MQTT: %s", e)

    def _validate_and_trigger(self, payload):
        # Deteksi apakah pesan datang dari Protoss PE11 (punya key U1N dan Energy_kWh)
        if "U1N" in payload and "Energy_kWh" in payload:
            mapped_payload = {
                "voltage_1": payload.get("U1N", 0.0),
                "voltage_2": payload.get("U2N", 0.0),
                "voltage_3": payload.get("U3N", 0.0),
                "ampere_1": payload.get("IL1", 0.0),
                "ampere_2": payload.get("IL2", 0.0),
                "ampere_3": payload.get("IL3", 0.0),
                "kwh_total": payload.get("Energy_kWh", 0.0)
            }
            self._on_message_callback(mapped_payload)
        # Atau bila datang dari mock dummy kita:
        elif "voltage_1" in payload and "kwh_total" in payload:
            self._on_message_callback(payload)
        else:
            logger.warning("⚠️ MQTT Payload kehilangan beberapa key penting: %s", payload)

    def _start_mock(self):
        """Simulasikan Arduino/ESP32 yang mem-*publish* data tiap detik."""
        def mock_loop():
            kwh = 1000.0  # Base kWh
            logger.info("🎲 Mock MQTT Thread dimulai (1 data/detik).")
            while self._running:
                delay = 1.0 + random.uniform(-0.1, 0.1)
                time.sleep(delay)
                
                # Tambah konsumsi kwh sedikit (sekitar 0.005 kwh per detik ~ 18 kW power)
                kwh += 0.005
                
                mock_payload = {
                    "voltage_1": 220.0 + random.uniform(-2, 2),
                    "voltage_2": 219.0 + random.uniform(-2, 2),
                    "voltage_3": 221.0 + random.uniform(-2, 2),
                    "ampere_1": 15.0 + random.uniform(-1, 1),
                    "ampere_2": 14.5 + random.uniform(-1, 1),
                    "ampere_3": 15.2 + random.uniform(-1, 1),
                    "kwh_total": round(kwh, 4)
                }
                self._validate_and_trigger(mock_payload)

        self._mock_thread = threading.Thread(target=mock_loop, daemon=True)
        self._mock_thread.start()
