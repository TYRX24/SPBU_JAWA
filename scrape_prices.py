"""
scrape_prices.py
Mengambil harga BBM Pertamina dari oto.com/harga-bbm,
simpan ke data/prices.json.
Shell/BP/VIVO menggunakan harga cached/fallback karena
tidak ada sumber publik yang bisa di-scrape.

Jalankan lokal  : python scrape_prices.py
GitHub Actions  : otomatis setiap hari pukul 08.00 WIB
"""
import json
import re
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = Path(__file__).parent
OUT  = BASE / "data" / "prices.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
}

# Nama di OTO.com → nama internal (harus cocok dengan FUEL_MAP di brands.jsx)
OTO_NAME_MAP = {
    "pertalite":      "Pertalite",
    "pertamax turbo": "Pertamax Turbo",
    "pertamax":       "Pertamax",
    "solar":          "Solar",
    "biosolar":       "Solar",
    "bio solar":      "Solar",
    "dexlite":        "Dexlite",
    "pertamina dex":  "Pertamina Dex",
    "lpg":            "LPG",
    "cng":            "CNG",
}

# ── Harga fallback — update manual jika diperlukan ─────────────────���─────────
# Berlaku April 2026
FALLBACK = {
    "Pertamina": {
        "Pertalite":      10000,
        "Pertamax":       12300,
        "Pertamax Turbo": 13100,
        "Solar":           6800,
        "Dexlite":        14200,
        "Pertamina Dex":  14500,
    },
    "Shell": {
        "Shell Super":        13250,
        "Shell V-Power":      14550,
        "Shell Diesel Extra": 14100,
    },
    "BP": {
        "BP 92":     13250,
        "BP 95":     14550,
        "BP Diesel": 14100,
    },
    "VIVO": {
        "Revvo 92":  13150,
        "Revvo 95":  14450,
        "Revvo D":   13950,
    },
}

# ─────────────────────────────��────────────────────────────��──────────────────

def parse_rp(text):
    """'Rp 12.300' atau 'Rp12300' → 12300. Kembalikan None jika gagal."""
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if len(digits) >= 4 else None

def scrape_pertamina():
    """
    Scrape tabel harga Pertamina dari oto.com/harga-bbm.
    Mengembalikan dict {nama_bbm: harga_int} atau {} jika gagal.
    """
    resp = requests.get(
        "https://www.oto.com/harga-bbm",
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()

    soup   = BeautifulSoup(resp.text, "html.parser")
    prices = {}

    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cells) < 2:
                continue

            name_raw  = cells[0].lower().strip()
            price_raw = cells[1]

            # Cocokkan nama tepat
            name = OTO_NAME_MAP.get(name_raw)

            # Jika tidak cocok tepat, coba partial match
            if not name:
                for key, val in OTO_NAME_MAP.items():
                    if key in name_raw:
                        name = val
                        break

            if name:
                price = parse_rp(price_raw)
                if price:
                    prices[name] = price
                    print(f"  OK{name}: Rp {price:,}")

    return prices


def main():
    print("=" * 50)
    print(f"Scraping harga BBM — {date.today()}")
    print("=" * 50)

    # Mulai dari fallback
    prices  = {k: dict(v) for k, v in FALLBACK.items()}
    sources = {brand: "fallback" for brand in FALLBACK}

    # ── Pertamina ───────────────────────────────────────────��─────────────────
    print("\n[Pertamina] Scraping oto.com/harga-bbm ...")
    try:
        scraped = scrape_pertamina()
        if len(scraped) >= 3:
            # Gabung: fallback sebagai base, scraped menimpa jika ada nilai baru
            prices["Pertamina"] = {**FALLBACK["Pertamina"], **scraped}
            sources["Pertamina"] = "oto.com"
            print(f"  >>Berhasil: {len(scraped)} jenis BBM")
        else:
            print(f"  >>Terlalu sedikit data ({scraped}), pakai fallback")
    except Exception as e:
        print(f"  >>Gagal scrape: {e}")
        print("  >>Pakai fallback Pertamina")

    # ── Shell / BP / VIVO ─────────────────────────��───────────────────────────
    # Tidak ada sumber publik yang bisa di-scrape secara konsisten.
    # Pertahankan harga dari file lama jika ada, agar update manual tidak hilang.
    if OUT.exists():
        with open(OUT, encoding="utf-8") as f:
            old = json.load(f)
        for brand in ("Shell", "BP", "VIVO"):
            if brand in old and isinstance(old[brand], dict) and old[brand]:
                prices[brand]  = old[brand]
                sources[brand] = old.get("sources", {}).get(brand, "cached")
                print(f"\n[{brand}] Pakai harga cached dari {sources[brand]}")
    else:
        for brand in ("Shell", "BP", "VIVO"):
            print(f"\n[{brand}] Pakai harga fallback (update manual di FALLBACK dict)")

    # ── Simpan ────────────────────────────────────────────────────────────────
    result = {
        "updated":  str(date.today()),
        "sources":  sources,
        "note":     "Harga Rupiah/liter. Pertamina: wilayah Jawa & Bali. Shell/BP/VIVO: estimasi.",
        **prices,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 50}")
    print(f"Tersimpan: {OUT}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()

OUT.parent.mkdir(parents=True, exist_ok=True)  # Auto-create data/ folder