from flask import Blueprint, request, jsonify
from database import db, Device
from auth import require_auth

devices_bp = Blueprint("devices", __name__)

@devices_bp.route("/api/devices", methods=["GET"])
@require_auth
def get_devices():
    devices = Device.query.all()
    return jsonify([d.to_dict() for d in devices])

@devices_bp.route("/api/devices", methods=["POST"])
@require_auth
def create_device():
    data = request.json
    if not data or "device_id" not in data or "name" not in data:
        return jsonify({"error": "device_id and name required"}), 400
    
    if Device.query.filter_by(device_id=data["device_id"]).first():
        return jsonify({"error": "Device ID already exists"}), 400

    new_device = Device(
        device_id=data["device_id"],
        name=data["name"],
        location=data.get("location", ""),
        max_ampere=float(data.get("max_ampere", 100.0)),
        is_active=data.get("is_active", True)
    )
    db.session.add(new_device)
    db.session.commit()
    return jsonify(new_device.to_dict()), 201

@devices_bp.route("/api/devices/<int:device_id>", methods=["PUT"])
@require_auth
def update_device(device_id):
    device = Device.query.get(device_id)
    if not device:
        return jsonify({"error": "Device not found"}), 404
        
    data = request.json
    if "name" in data: device.name = data["name"]
    if "location" in data: device.location = data["location"]
    if "max_ampere" in data: device.max_ampere = float(data["max_ampere"])
    if "is_active" in data: device.is_active = data["is_active"]
    
    db.session.commit()
    return jsonify(device.to_dict())

@devices_bp.route("/api/devices/<int:device_id>", methods=["DELETE"])
@require_auth
def delete_device(device_id):
    device = Device.query.get(device_id)
    if not device:
        return jsonify({"error": "Device not found"}), 404
    db.session.delete(device)
    db.session.commit()
    return jsonify({"message": "Device deleted"})
