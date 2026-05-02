"""
auth.py — Blueprint Flask untuk autentikasi dan middleware JWT.

Endpoints:
  POST /api/auth/login  — verifikasi credential, return JWT
  GET  /api/auth/me     — return profil user dari token

Decorators:
  @require_auth   — wajib login (Admin + Viewer)
  @require_admin  — hanya Admin
"""

import os
import logging
from functools import wraps
from datetime import datetime, timedelta, timezone

import jwt
from flask import Blueprint, request, jsonify
from database import User

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_secret() -> str:
    return os.getenv("JWT_SECRET_KEY", "GANTI-INI-DENGAN-SECRET-YANG-AMAN")


def _create_token(user: User) -> str:
    payload = {
        "user_id":  user.id,
        "username": user.username,
        "role":     user.role,
        "exp":      datetime.now(timezone.utc) + timedelta(hours=8),
    }
    return jwt.encode(payload, _get_secret(), algorithm="HS256")


def _decode_token(token: str) -> dict:
    return jwt.decode(token, _get_secret(), algorithms=["HS256"])


def _extract_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    return None


# ── Middleware Decorators ─────────────────────────────────────────────────────

def require_auth(f):
    """Pastikan request memiliki JWT yang valid (Admin atau Viewer)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Token tidak ditemukan. Silakan login."}), 401
        try:
            payload = _decode_token(token)
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Sesi telah kedaluwarsa. Silakan login ulang."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token tidak valid."}), 401
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Pastikan request memiliki JWT yang valid DAN role adalah 'admin'."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Token tidak ditemukan. Silakan login."}), 401
        try:
            payload = _decode_token(token)
            if payload.get("role") != "admin":
                return jsonify({"error": "Akses ditolak. Hanya Admin yang diizinkan."}), 403
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Sesi telah kedaluwarsa. Silakan login ulang."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token tidak valid."}), 401
        return f(*args, **kwargs)
    return decorated


# ── Endpoints ─────────────────────────────────────────────────────────────────

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { "username": "...", "password": "..." }
    Return: { "token": "eyJ...", "user": { id, username, role, ... } }
    """
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username dan password wajib diisi."}), 400

    user = User.query.filter_by(username=username, is_active=True).first()
    if not user or not user.check_password(password):
        logger.warning("Login gagal untuk username: %s", username)
        return jsonify({"error": "Username atau password salah."}), 401

    token = _create_token(user)
    logger.info("Login berhasil: %s (%s)", user.username, user.role)
    return jsonify({
        "token": token,
        "user":  user.to_dict(),
    })


@auth_bp.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    """GET /api/auth/me — return payload user dari token."""
    return jsonify({"user": request.current_user})
