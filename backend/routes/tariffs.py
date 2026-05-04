from flask import Blueprint, request, jsonify
from database import db, Tariff
from auth import require_auth

tariffs_bp = Blueprint("tariffs", __name__)

@tariffs_bp.route("/api/tariffs", methods=["GET"])
@require_auth
def get_tariffs():
    tariffs = Tariff.query.all()
    return jsonify([t.to_dict() for t in tariffs])

@tariffs_bp.route("/api/tariffs/<int:tariff_id>", methods=["PUT"])
@require_auth
def update_tariff(tariff_id):
    tariff = Tariff.query.get(tariff_id)
    if not tariff:
        return jsonify({"error": "Tariff not found"}), 404
        
    data = request.json
    if "price_per_kwh" in data:
        tariff.price_per_kwh = float(data["price_per_kwh"])
        db.session.commit()
    return jsonify(tariff.to_dict())
