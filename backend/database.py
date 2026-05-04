"""
database.py — SQLAlchemy models untuk User dan Setting.

Tabel:
  - users   : akun login dengan role admin/viewer
  - settings: konfigurasi MQTT & InfluxDB yang bisa diubah via UI
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
import bcrypt

db = SQLAlchemy()


# ── Models ──────────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id           = db.Column(db.Integer, primary_key=True)
    username     = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role         = db.Column(db.String(20), nullable=False, default="viewer")  # "admin" | "viewer"
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_active    = db.Column(db.Boolean, default=True)

    def set_password(self, password: str):
        """Hash password menggunakan bcrypt dengan salt rounds 12."""
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12))
        self.password_hash = hashed.decode("utf-8")

    def check_password(self, password: str) -> bool:
        """Verifikasi password terhadap hash yang tersimpan."""
        return bcrypt.checkpw(
            password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "username":   self.username,
            "role":       self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_active":  self.is_active,
        }


class Setting(db.Model):
    __tablename__ = "settings"

    id         = db.Column(db.Integer, primary_key=True)
    key        = db.Column(db.String(100), unique=True, nullable=False)
    value      = db.Column(db.Text, default="")
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Device(db.Model):
    __tablename__ = "devices"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), default="")
    max_ampere = db.Column(db.Float, default=100.0) # Kapasitas maksimum trafo (Ampere)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "name": self.name,
            "location": self.location,
            "max_ampere": self.max_ampere,
            "is_active": self.is_active
        }

class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=True)
    alert_type = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "alert_type": self.alert_type,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Tariff(db.Model):
    __tablename__ = "tariffs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # WBP atau LWBP
    price_per_kwh = db.Column(db.Float, nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price_per_kwh": self.price_per_kwh
        }


# ── Helpers ─────────────────────────────────────────────────────────────────

def get_setting(key: str, fallback: str = "") -> str:
    """Ambil nilai setting dari DB; gunakan fallback jika belum ada."""
    row = Setting.query.filter_by(key=key).first()
    return row.value if row else fallback


def set_setting(key: str, value: str):
    """Upsert setting key-value ke DB."""
    row = Setting.query.filter_by(key=key).first()
    if row:
        row.value = value
        row.updated_at = datetime.now(timezone.utc)
    else:
        db.session.add(Setting(key=key, value=value))
    db.session.commit()


# ── Initialization ───────────────────────────────────────────────────────────

def init_db(app):
    """
    Buat tabel & seed data default (admin user + settings dari .env).
    Dipanggil sekali saat startup di main.py.
    """
    with app.app_context():
        db.create_all()

        # ─ Seed default admin ─────────────────────────────────────────────
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", role="admin")
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print("[DB] Default admin user dibuat: admin / admin123")

        # ─ Seed default settings dari .env ────────────────────────────────
        import config
        defaults = {
            "mqtt_broker":   config.MQTT_BROKER,
            "mqtt_port":     str(config.MQTT_PORT),
            "mqtt_topic":    config.MQTT_TOPIC,
            "mqtt_username": config.MQTT_USERNAME,
            "mqtt_password": config.MQTT_PASSWORD,
            "influx_url":    config.INFLUX_URL,
            "influx_token":  config.INFLUX_TOKEN,
            "influx_org":    config.INFLUX_ORG,
            "influx_bucket": config.INFLUX_BUCKET,
        }
        for key, value in defaults.items():
            if not Setting.query.filter_by(key=key).first():
                db.session.add(Setting(key=key, value=value))
        db.session.commit()
        print("[DB] Settings default telah di-seed dari .env")

        # ─ Seed default Tariffs ──────────────────────────────────────────
        if not Tariff.query.filter_by(name="WBP").first():
            db.session.add(Tariff(name="WBP", price_per_kwh=config.TARIFF_WBP))
        if not Tariff.query.filter_by(name="LWBP").first():
            db.session.add(Tariff(name="LWBP", price_per_kwh=config.TARIFF_LWBP))
        db.session.commit()

        # ─ Seed default Device ───────────────────────────────────────────
        if not Device.query.first():
            db.session.add(Device(device_id="default_sensor", name="Main Panel", location="Factory", max_ampere=100.0))
            db.session.commit()
        print("[DB] Init tables, tariffs, and devices finished.")
