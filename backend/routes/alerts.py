from flask import Blueprint, request, jsonify
from database import db, Alert, Device
from auth import require_auth

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("/api/alerts", methods=["GET"])
@require_auth
def get_alerts():
    alerts = Alert.query.order_by(Alert.created_at.desc()).limit(50).all()
    result = []
    for a in alerts:
        d = a.to_dict()
        device = Device.query.get(a.device_id) if a.device_id else None
        d["device_name"] = device.name if device else "Unknown"
        result.append(d)
    return jsonify(result)

@alerts_bp.route("/api/alerts/<int:alert_id>/read", methods=["PUT"])
@require_auth
def mark_read(alert_id):
    alert = Alert.query.get(alert_id)
    if alert:
        alert.is_read = True
        db.session.commit()
        return jsonify(alert.to_dict())
    return jsonify({"error": "Not found"}), 404

@alerts_bp.route("/api/alerts/read-all", methods=["PUT"])
@require_auth
def mark_all_read():
    Alert.query.filter_by(is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All alerts marked as read"})
