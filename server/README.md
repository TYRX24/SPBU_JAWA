# SPBU Jabar — Backend (Node/Express)

This is a separate, optional backend. The frontend (`index.html`) works fully standalone with `data/stations.json`. Run this server if you want a real API endpoint instead of a static JSON file.

## Setup

```bash
mkdir spbu-server && cd spbu-server
npm init -y
npm install express cors
# copy data/stations.json from this project into spbu-server/stations.json
# save the code below as server.js
node server.js
```

The API will be available at `http://localhost:3001`.

To point the frontend at it, change the `fetch("data/stations.json")` line in `app.jsx` to `fetch("http://localhost:3001/api/stations")`.

## `server.js`

```javascript
// SPBU Jabar — Express API
// Endpoints:
//   GET  /api/stations               – all stations
//   GET  /api/stations?brand=Shell   – filter by brand (Pertamina, Shell, BP, VIVO)
//   GET  /api/stations?q=bandung     – text search (name / address / city)
//   GET  /api/stations/:id           – one station
//   GET  /api/near?lat=..&lon=..&radius=3
//                                     – stations within `radius` km, sorted by distance

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const stations = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'stations.json'), 'utf8')
);

// Haversine distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

app.get('/api/stations', (req, res) => {
  const { brand, q, fuel } = req.query;
  let list = stations;

  if (brand) {
    const brands = String(brand).split(',').map((b) => b.trim());
    list = list.filter((s) => brands.includes(s.brand));
  }
  if (fuel) {
    list = list.filter((s) => s.fuels.includes(String(fuel)));
  }
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(needle)) ||
        (s.address && s.address.toLowerCase().includes(needle)) ||
        (s.city && s.city.toLowerCase().includes(needle)) ||
        s.brand.toLowerCase().includes(needle)
    );
  }

  res.json({ count: list.length, stations: list });
});

app.get('/api/stations/:id', (req, res) => {
  const s = stations.find((s) => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

app.get('/api/near', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radius = parseFloat(req.query.radius || '3');

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'lat & lon are required numbers' });
  }

  const results = stations
    .map((s) => ({ ...s, distanceKm: haversineKm(lat, lon, s.lat, s.lon) }))
    .filter((s) => s.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ count: results.length, radius, center: { lat, lon }, stations: results });
});

app.get('/api/health', (_, res) => res.json({ ok: true, total: stations.length }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SPBU API listening on http://localhost:${PORT}`);
  console.log(`Loaded ${stations.length} stations`);
});
```

## Example requests

```bash
curl http://localhost:3001/api/stations?brand=Shell | jq '.count'
curl http://localhost:3001/api/stations?q=bandung | jq '.stations[0]'
curl 'http://localhost:3001/api/near?lat=-6.9175&lon=107.6191&radius=3' | jq '.count'
```
