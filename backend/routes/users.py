"""
routes/users.py — CRUD endpoint untuk manajemen user (khusus Admin).

Endpoints:
  GET    /api/users         — daftar semua user
  POST   /api/users         — buat user baru
  DELETE /api/users/<id>    — hapus user (tidak bisa hapus diri sendiri)
  PUT    /api/users/<id>/role — ubah role user
"""

import logging
from flask import Blueprint, request, jsonify
from database import db, User
from auth import require_admin

logger = logging.getLogger(__name__)

users_bp = Blueprint("users", __name__)


@users_bp.route("/api/users", methods=["GET"])
@require_admin
def list_users():
    """Daftar semua user aktif."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])


@users_bp.route("/api/users", methods=["POST"])
@require_admin
def create_user():
    """
    POST /api/users
    Body: { "username": "...", "password": "...", "role": "viewer"|"admin" }
    """
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role     = data.get("role", "viewer")

    if not username or not password:
        return jsonify({"error": "Username dan password wajib diisi."}), 400

    if role not in ("admin", "viewer"):
        return jsonify({"error": "Role tidak valid. Gunakan 'admin' atau 'viewer'."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password minimal 6 karakter."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": f"Username '{username}' sudah digunakan."}), 409

    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    logger.info("User baru dibuat: %s (%s) oleh %s",
                username, role, request.current_user["username"])
    return jsonify(new_user.to_dict()), 201


@users_bp.route("/api/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id: int):
    """
    DELETE /api/users/<id>
    Tidak bisa menghapus akun sendiri.
    """
    current_id = request.current_user["user_id"]
    if user_id == current_id:
        return jsonify({"error": "Tidak bisa menghapus akun Anda sendiri."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan."}), 404

    # Soft-delete: set is_active = False untuk keamanan referensi log
    user.is_active = False
    db.session.commit()

    logger.info("User dihapus: %s (id=%d) oleh %s",
                user.username, user_id, request.current_user["username"])
    return jsonify({"message": f"User '{user.username}' berhasil dihapus."})


@users_bp.route("/api/users/<int:user_id>/role", methods=["PUT"])
@require_admin
def update_role(user_id: int):
    """
    PUT /api/users/<id>/role
    Body: { "role": "admin"|"viewer" }
    Tidak bisa mengubah role diri sendiri.
    """
    current_id = request.current_user["user_id"]
    if user_id == current_id:
        return jsonify({"error": "Tidak bisa mengubah role akun Anda sendiri."}), 400

    data = request.get_json(silent=True) or {}
    new_role = data.get("role")
    if new_role not in ("admin", "viewer"):
        return jsonify({"error": "Role tidak valid."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan."}), 404

    user.role = new_role
    db.session.commit()

    logger.info("Role user %s diubah ke %s oleh %s",
                user.username, new_role, request.current_user["username"])
    return jsonify(user.to_dict())

@users_bp.route("/api/users/<int:user_id>/password", methods=["PUT"])
@require_admin
def update_password(user_id: int):
    """
    PUT /api/users/<id>/password
    Body: { "password": "..." }
    """
    data = request.get_json(silent=True) or {}
    new_password = data.get("password", "")
    
    if not new_password or len(new_password) < 6:
        return jsonify({"error": "Password minimal 6 karakter."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan."}), 404

    user.set_password(new_password)
    db.session.commit()

    logger.info("Password user %s diubah oleh %s",
                user.username, request.current_user["username"])
    return jsonify({"message": f"Password untuk '{user.username}' berhasil diubah."})
