// MapView component — Leaflet integration
const { useEffect, useRef, useState, useMemo, useCallback } = React;

// Haversine distance in km
window.haversineKm = function(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

function shortProv(name) {
  const abbr = {
    'Jawa Barat': 'Jabar', 'Jawa Tengah': 'Jateng', 'Jawa Timur': 'Jatim',
    'DI Yogyakarta': 'Yogya', 'DKI Jakarta': 'Jakarta', 'Banten': 'Banten',
  };
  return abbr[name] || name.split(' ').slice(0, 2).join(' ');
}

// Region definitions for hierarchical clustering
const REGIONS = {
  'Jawa Barat':    { id: 'barat',  label: 'Jawa Barat',  shortLabel: 'Jabar'   },
  'Jawa Tengah':   { id: 'tengah', label: 'Jawa Tengah', shortLabel: 'Jateng'  },
  'Jawa Timur':    { id: 'timur',  label: 'Jawa Timur',  shortLabel: 'Jatim'   },
  'DKI Jakarta':   { id: 'barat',  label: 'Jawa Barat',  shortLabel: 'Jabar'   },
  'Banten':        { id: 'barat',  label: 'Jawa Barat',  shortLabel: 'Jabar'   },
  'DI Yogyakarta': { id: 'tengah', label: 'Jawa Tengah', shortLabel: 'Jateng'  },
};

function getRegionForProvince(province) {
  return REGIONS[province] || { id: 'unknown', label: 'Jawa', shortLabel: 'Jawa' };
}

window.MapView = function MapView({
  stations, theme, selectedId, onSelect,
  userLocation, nearMeRadius, nearMeActive, mapRef,
  routeCoords, onClearRoute,
  mapStyle,
}) {
  const containerRef  = useRef(null);
  const leafletRef    = useRef(null);
  const markersRef    = useRef(new Map());
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const clusterRef    = useRef(null);
  const routeLayerRef = useRef(null);

  // ── Init map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || leafletRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-6.9, 107.6],
      zoom: 9,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });

    // ── Tile layers ──
    const defaultTile = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }
    );
    const cleanTile = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }
    );
    const terrainTile = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; OpenStreetMap contributors, &copy; OpenTopoMap', maxZoom: 17 }
    );

    defaultTile.addTo(map);

    leafletRef.current = {
      map,
      tiles: { default: defaultTile, clean: cleanTile, terrain: terrainTile },
    };
    if (mapRef) mapRef.current = map;

    let currentZoom = map.getZoom();

    // ── Cluster group ──
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: (zoom) => {
        if (zoom <= 8)  return 200;
        if (zoom <= 10) return 120;
        if (zoom <= 12) return 70;
        return 35;
      },
      iconCreateFunction: (c) => {
        const count   = c.getChildCount();
        const markers = c.getAllChildMarkers();

        // LEVEL 1: REGIONS (zoom ≤ 8)
        if (currentZoom <= 8) {
          const tally = {};
          markers.forEach(m => {
            const prov = m.options._station?.province || '';
            const lbl  = getRegionForProvince(prov).shortLabel;
            tally[lbl] = (tally[lbl] || 0) + 1;
          });
          const topRegion = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Jawa';
          return L.divIcon({
            html: `<div class="cluster-bubble cluster-region">
                     <span class="cluster-lbl">${topRegion}</span>
                     <span class="cluster-cnt">${count}</span>
                   </div>`,
            className: 'cluster-icon',
            iconSize:   [70, 70],
            iconAnchor: [35, 35],
          });
        }

        // LEVEL 2: PROVINCES (zoom 9–10)
        if (currentZoom <= 10) {
          const tally = {};
          markers.forEach(m => {
            const p = m.options._station?.province || '';
            tally[p] = (tally[p] || 0) + 1;
          });
          const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
          return L.divIcon({
            html: `<div class="cluster-bubble cluster-prov">
                     <span class="cluster-lbl">${shortProv(top)}</span>
                     <span class="cluster-cnt">${count}</span>
                   </div>`,
            className: 'cluster-icon',
            iconSize:   [62, 62],
            iconAnchor: [31, 31],
          });
        }

        // LEVEL 3: CITIES (zoom 11–12)
        if (currentZoom <= 12) {
          const tally = {};
          markers.forEach(m => {
            const city = m.options._station?.city || '';
            tally[city] = (tally[city] || 0) + 1;
          });
          const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
          const lbl = top.length > 9 ? top.slice(0, 8) + '…' : top;
          return L.divIcon({
            html: `<div class="cluster-bubble cluster-city">
                     <span class="cluster-lbl">${lbl}</span>
                     <span class="cluster-cnt">${count}</span>
                   </div>`,
            className: 'cluster-icon',
            iconSize:   [54, 54],
            iconAnchor: [27, 27],
          });
        }

        // LEVEL 4: Small number-only (zoom > 12)
        const size = count < 10 ? 36 : count < 100 ? 42 : 48;
        return L.divIcon({
          html: `<div class="cluster-bubble cluster-small"
                      style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;">
                   <span class="cluster-cnt">${count}</span>
                 </div>`,
          className: 'cluster-icon',
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    map.on('zoomend', () => {
      currentZoom = map.getZoom();
      cluster.refreshClusters();
    });

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // ── Swap tile layer when mapStyle changes ──────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, tiles } = leafletRef.current;
    Object.values(tiles).forEach(t => { if (map.hasLayer(t)) map.removeLayer(t); });
    const active = tiles[mapStyle] || tiles['default'];
    active.addTo(map);
    active.bringToBack();
  }, [mapStyle]);

  // ── Render markers when stations change ───────────────────────────
  useEffect(() => {
    if (!leafletRef.current || !clusterRef.current) return;
    const cluster = clusterRef.current;
    cluster.clearLayers();
    markersRef.current.clear();

    const newMarkers = [];
    for (const s of stations) {
      const isSelected = s.id === selectedId;
      const html = renderPinHtml(s.brand, isSelected);
      const sz   = isSelected ? 48 : 36;
      const icon = L.divIcon({
        html,
        className:  '',
        iconSize:   [sz, sz],
        iconAnchor: [sz / 2, sz],
      });
      const m = L.marker([s.lat, s.lon], { icon, _station: s });
      m.on('click', () => onSelect(s.id));
      newMarkers.push(m);
      markersRef.current.set(s.id, m);
    }
    cluster.addLayers(newMarkers);
  }, [stations, selectedId]);

  // ── Pan to selected station ────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current || !selectedId) return;
    const s = stations.find(s => s.id === selectedId);
    if (!s) return;
    const map = leafletRef.current.map;
    map.flyTo([s.lat, s.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [selectedId]);

  // ── User location marker + radius circle ──────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;
    const map = leafletRef.current.map;

    if (userMarkerRef.current)  { map.removeLayer(userMarkerRef.current);  userMarkerRef.current  = null; }
    if (radiusCircleRef.current){ map.removeLayer(radiusCircleRef.current); radiusCircleRef.current = null; }
    if (!userLocation) return;

    const userIcon = L.divIcon({
      html: '<div class="user-marker"><div class="user-marker-pulse"></div><div class="user-marker-dot"></div></div>',
      className:  '',
      iconSize:   [22, 22],
      iconAnchor: [11, 11],
    });
    userMarkerRef.current = L.marker(
      [userLocation.lat, userLocation.lon],
      { icon: userIcon, zIndexOffset: 1000 }
    ).addTo(map);

    if (nearMeActive) {
      radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lon], {
        radius:      nearMeRadius * 1000,
        color:       '#0a84ff',
        weight:      2,
        fillColor:   '#0a84ff',
        fillOpacity: 0.08,
        dashArray:   '6, 6',
      }).addTo(map);
      map.flyToBounds(radiusCircleRef.current.getBounds(), { padding: [60, 60], duration: 0.6 });
    }
  }, [userLocation, nearMeRadius, nearMeActive]);

  // ── Route polyline ─────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;
    const map = leafletRef.current.map;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (!routeCoords || routeCoords.length === 0) return;

    // OSRM returns [lon, lat] → flip to Leaflet [lat, lon]
    const latlngs = routeCoords.map(([lon, lat]) => [lat, lon]);
    routeLayerRef.current = L.polyline(latlngs, {
      color:  '#0a84ff',
      weight: 5,
      opacity: 0.85,
      lineJoin: 'round',
      lineCap:  'round',
    }).addTo(map);
    map.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] });
  }, [routeCoords]);

  return <div ref={containerRef} className="map-root" />;
};

// ── Pin renderer ───────────────────────────────────────────────────────
function renderPinHtml(brand, selected) {
  const brandBg = {
    Pertamina: '#D8232A',
    Shell:     '#FBCE07',
    BP:        '#009900',
    VIVO:      '#E30613',
  };

  const logoPaths = {
    Pertamina: 'public/assets/Logo/PERTAMINA_id7hJAjeL4_0.svg',
    Shell:     'public/assets/Logo/Shell_id0Yn1dyVO_1.svg',
    BP:        'public/assets/Logo/Bp_Symbol_0.svg',
    VIVO:      'public/assets/Logo/Logo_Vivo_Energy_Indonesia.png',
  };

  const bg  = brandBg[brand]  || '#888';
  const src = logoPaths[brand] || '';
  const sz  = selected ? 48 : 36;
  const pad = selected ? 10 : 8;
  const logoBgSize = sz - pad;          // White circle = 28px (size=36) atau 38px (size=48)
  const logoInsideSize = logoBgSize - 6; // Logo = 22px atau 32px (dengan 3px padding)

  return `
    <div class="brand-pin ${selected ? 'selected' : ''}" style="width:${sz}px">
      <div class="brand-pin-bubble" style="
        width:${sz}px; height:${sz}px;
        background:${bg};
        border-radius:50% 50% 50% 4px;
        transform: rotate(-45deg);
        display:flex; align-items:center; justify-content:center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        border: 2.5px solid white;
      ">
       <div style="
        width:${logoBgSize}px; height:${logoBgSize}px;
        background:white;
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
      ">
        <img src="${src}" style="
          width:${logoInsideSize}px; height:${logoInsideSize}px;
          object-fit:contain;
          transform: rotate(45deg);
          display:block;
        " />
      </div>
      </div>
    </div>`;
}