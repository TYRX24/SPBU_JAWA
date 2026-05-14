import json
import os
import glob

# 1. Tentukan folder tempat file GeoJSON mentah Anda berada
# (Sesuaikan dengan nama folder di proyek Anda)
folder_sumber = 'Peta_Jawa/'
file_output = 'data/Peta_Gabungan.geojson'

# 2. Siapkan kerangka utama GeoJSON
gabungan_geojson = {
    "type": "FeatureCollection",
    "features": []
}

# 3. Cari semua file berakhiran .geojson di dalam folder sumber
daftar_file = glob.glob(os.path.join(folder_sumber, '*.geojson'))

if not daftar_file:
    print("Tidak ada file GeoJSON yang ditemukan di folder tersebut.")
else:
    print(f"Ditemukan {len(daftar_file)} file. Mulai menggabungkan...")

    for file in daftar_file:
        with open(file, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                # Pastikan file tersebut memiliki struktur FeatureCollection yang standar
                if data.get('type') == 'FeatureCollection' and 'features' in data:
                    # Gabungkan semua fitur spasial dari file ini ke wadah utama
                    gabungan_geojson['features'].extend(data['features'])
                    print(f"✅ Berhasil memproses: {os.path.basename(file)}")
                else:
                    print(f"⚠️ Lewati {os.path.basename(file)}: Format bukan FeatureCollection standar.")
            except json.JSONDecodeError:
                print(f"❌ Error membaca {os.path.basename(file)}: File tidak valid.")

    # 4. Simpan hasilnya menjadi satu file baru yang efisien
    with open(file_output, 'w', encoding='utf-8') as f:
        # separators=(',', ':') digunakan untuk menghilangkan spasi putih agar ukuran file lebih kecil
        json.dump(gabungan_geojson, f, separators=(',', ':')) 

    print(f"\n🎉 Selesai! Semua koordinat berhasil digabung ke dalam: {file_output}")