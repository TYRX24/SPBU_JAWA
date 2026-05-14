"""
enrich_stations.py
Cari ATM dan minimarket dalam radius 50m dari setiap SPBU,
lalu simpan hasilnya ke data/stations_enriched.json
"""
import json, math
from pathlib import Path

BASE = Path(__file__).parent

# ── helpers ──────────────────────────────────────────────────────────────────

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def centroid(geometry):
    """Kembalikan (lat, lon) dari Point atau Polygon/MultiPolygon."""
    t = geometry["type"]
    if t == "Point":
        lon, lat = geometry["coordinates"]
        return lat, lon
    if t == "Polygon":
        ring = geometry["coordinates"][0]
    elif t == "MultiPolygon":
        ring = geometry["coordinates"][0][0]
    else:
        return None
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    lon = sum(p[0] for p in pts) / len(pts)
    lat = sum(p[1] for p in pts) / len(pts)
    return lat, lon

def load_atms(filepath):
    with open(filepath, encoding="utf-8") as f:
        fc = json.load(f)
    result = []
    for feat in fc.get("features", []):
        geom = feat.get("geometry")
        if not geom:
            continue
        pos = centroid(geom)
        if not pos:
            continue
        p = feat.get("properties", {})
        name     = p.get("name") or p.get("operator") or p.get("brand") or "ATM"
        operator = p.get("operator") or p.get("brand") or ""
        result.append({"lat": pos[0], "lon": pos[1], "name": name, "operator": operator})
    return result

def load_minimarkets(filepath):
    with open(filepath, encoding="utf-8") as f:
        fc = json.load(f)
    result = []
    for feat in fc.get("features", []):
        geom = feat.get("geometry")
        if not geom:
            continue
        pos = centroid(geom)
        if not pos:
            continue
        p = feat.get("properties", {})
        name  = p.get("name") or p.get("brand") or "Minimarket"
        brand = p.get("brand") or ""
        hours = p.get("opening_hours") or ""
        result.append({"lat": pos[0], "lon": pos[1], "name": name, "brand": brand, "hours": hours})
    return result

# ── load data ─────────────────────────────────────────────────────────────────

print("Memuat stations.json…")
with open(BASE / "data" / "stations.json", encoding="utf-8") as f:
    stations = json.load(f)
print(f"  {len(stations)} SPBU dimuat")

FOLDER = BASE / "Peta_Jawa"

print("Memuat data ATM…")
all_atms = []
for name in ["ATM_Jabar.geojson", "ATM_Jateng.geojson", "ATM_Jatim.geojson"]:
    feats = load_atms(FOLDER / name)
    print(f"  {name}: {len(feats)} ATM")
    all_atms.extend(feats)

print("Memuat data minimarket…")
all_minis = []
for name in ["Minimarket_Jabar.geojson", "Minimarket_Jateng.geojson", "Minimarket_Jatim.geojson"]:
    feats = load_minimarkets(FOLDER / name)
    print(f"  {name}: {len(feats)} minimarket")
    all_minis.extend(feats)

print(f"\nTotal: {len(all_atms)} ATM, {len(all_minis)} minimarket")

# ── enrich ────────────────────────────────────────────────────────────────────

THRESHOLD_M = 50
# bounding box kasar sebelum Haversine: 50m ≈ 0.00045 derajat
BBOX = 0.00045

print(f"\nMencari fasilitas dalam radius {THRESHOLD_M}m dari setiap SPBU…")
enriched_count = 0

for i, station in enumerate(stations):
    slat, slon = station["lat"], station["lon"]

    nearby_atms = []
    for atm in all_atms:
        if abs(atm["lat"] - slat) > BBOX or abs(atm["lon"] - slon) > BBOX:
            continue
        dist = haversine_m(slat, slon, atm["lat"], atm["lon"])
        if dist <= THRESHOLD_M:
            entry = {"name": atm["name"], "distance_m": round(dist, 1)}
            if atm["operator"] and atm["operator"] != atm["name"]:
                entry["operator"] = atm["operator"]
            nearby_atms.append(entry)

    nearby_minis = []
    for mini in all_minis:
        if abs(mini["lat"] - slat) > BBOX or abs(mini["lon"] - slon) > BBOX:
            continue
        dist = haversine_m(slat, slon, mini["lat"], mini["lon"])
        if dist <= THRESHOLD_M:
            entry = {"name": mini["name"], "distance_m": round(dist, 1)}
            if mini["brand"] and mini["brand"] != mini["name"]:
                entry["brand"] = mini["brand"]
            if mini["hours"]:
                entry["hours"] = mini["hours"]
            nearby_minis.append(entry)

    nearby_atms.sort(key=lambda x: x["distance_m"])
    nearby_minis.sort(key=lambda x: x["distance_m"])

    if nearby_atms or nearby_minis:
        station["nearby"] = {}
        if nearby_atms:
            station["nearby"]["atms"] = nearby_atms
        if nearby_minis:
            station["nearby"]["minimarkets"] = nearby_minis
        enriched_count += 1

    if (i + 1) % 1000 == 0:
        print(f"  {i+1}/{len(stations)} selesai…")

print(f"\nSelesai! {enriched_count}/{len(stations)} SPBU punya fasilitas terdekat.")

# ── simpan ────────────────────────────────────────────────────────────────────

out = BASE / "data" / "stations_enriched.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(stations, f, ensure_ascii=False, separators=(",", ":"))

print(f"Tersimpan → {out}")
