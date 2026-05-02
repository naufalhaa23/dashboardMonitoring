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
