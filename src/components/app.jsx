const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = {
  "layout": "left",
  "theme": "auto",
  "lang": "id",
  "reduceMotion": false,
  "radiusKm": 3
};

const DEFAULT_CENTER = [-7.25, 110.0];
const DEFAULT_ZOOM = 7;

// ── Floating search bar ────────────────────────────────────────────
function FloatingSearch({ stations, query, setQuery, onSelectStation, onFlyToArea, onFlyToCoords, lang, t, sidebarOpen, layout, theme, onCycleTheme, onCycleLang }) {
  const [inputVal, setInputVal] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (!query) setInputVal(''); }, [query]);

  const suggestions = React.useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    if (!q) return [];
    const res = [];

    const cm = inputVal.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (cm) {
      const lat = parseFloat(cm[1]), lon = parseFloat(cm[2]);
      if (lat >= -11 && lat <= 6 && lon >= 95 && lon <= 142) {
        res.push({
          type: 'coords',
          label: lang === 'id' ? `Terbang ke ${lat.toFixed(5)}, ${lon.toFixed(5)}` : `Fly to ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          lat, lon,
        });
      }
    }

    PROVINCES_LIST.forEach(p => {
      const abbr = PROVINCE_SHORT[p] || '';
      if (p.toLowerCase().includes(q) || abbr.toLowerCase().includes(q)) {
        const n = stations.filter(s => s.province === p).length;
        res.push({ type: 'province', label: p, sub: `${n.toLocaleString('id-ID')} SPBU`, province: p });
      }
    });

    const cityMap = {};
    stations.forEach(s => {
      if (!s.city || !s.city.toLowerCase().includes(q)) return;
      const k = s.city.toLowerCase();
      if (!cityMap[k]) cityMap[k] = { city: s.city, count: 0, province: s.province };
      cityMap[k].count++;
    });
    Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 5).forEach(c =>
      res.push({ type: 'city', label: c.city, sub: `${c.count} SPBU · ${c.province}`, city: c.city })
    );

    stations.filter(s => s.name && s.name.toLowerCase().includes(q)).slice(0, 6).forEach(s =>
      res.push({ type: 'station', label: s.name, sub: `${s.brand}${s.city ? ' · ' + s.city : ''}`, station: s })
    );

    return res.slice(0, 12);
  }, [inputVal, stations, lang]);

  React.useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const commit = s => {
    setOpen(false);
    if (s.type === 'coords') { setInputVal(''); setQuery(''); onFlyToCoords(s.lat, s.lon); }
    else if (s.type === 'province') { setInputVal(s.label); setQuery(s.label); onFlyToArea(s.province); }
    else if (s.type === 'city') { setInputVal(s.label); setQuery(s.city); }
    else if (s.type === 'station') { setInputVal(''); setQuery(''); onSelectStation(s.station); }
  };

  const onKD = e => {
    if (e.key === 'Enter') { setQuery(inputVal); setOpen(false); }
    if (e.key === 'Escape') { setInputVal(''); setQuery(''); setOpen(false); inputRef.current?.blur(); }
  };

  const clear = () => { setInputVal(''); setQuery(''); setOpen(false); inputRef.current?.focus(); };

  const Icons = window.Icons;
  const leftPos = sidebarOpen && layout === 'left' ? 'calc(50% + 210px)' : '50%';

  return (
    <div className={`fs-wrap${open && suggestions.length ? ' fs-open' : ''}`} ref={wrapRef} style={{ left: leftPos }}>
      <div className="fs-bar">
        <span className="fs-icon"><Icons.Search size={16} stroke={2} /></span>
        <input ref={inputRef} className="fs-input" type="text" value={inputVal} placeholder={t.searchPlaceholder}
          onChange={e => { setInputVal(e.target.value); setOpen(true); }}
          onFocus={() => inputVal && setOpen(true)} onKeyDown={onKD}
          autoComplete="off" spellCheck="false" />
        {inputVal && <button className="fs-clear-btn" onClick={clear} aria-label="Clear"><Icons.Close size={14} stroke={2.5} /></button>}
        <span className="fs-sep" />
        <div className="fs-controls">
          <button className="fs-ctrl-btn" onClick={onCycleLang} title={t.language} aria-label={t.language}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{lang.toUpperCase()}</span>
          </button>
          <button className="fs-ctrl-btn" onClick={onCycleTheme} title={t.theme} aria-label={t.theme}>
            {theme === "dark" ? <Icons.Moon size={15} stroke={2} /> :
              theme === "light" ? <Icons.Sun size={15} stroke={2} /> :
                <Icons.Settings size={15} stroke={2} />}
          </button>
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="fs-dropdown">
          {suggestions.map((s, i) => {
            const Icon = s.type === 'station' ? Icons.Droplet
              : s.type === 'coords' ? Icons.Crosshair
                : Icons.Pin;
            return (
              <li key={i}>
                <button className={`fs-row fs-row-${s.type}`} onMouseDown={e => { e.preventDefault(); commit(s); }}>
                  <span className="fs-row-icon"><Icon size={14} stroke={2} /></span>
                  <span className="fs-row-body">
                    <span className="fs-row-label">{s.label}</span>
                    {s.sub && <span className="fs-row-sub">{s.sub}</span>}
                  </span>
                  {(s.type === 'province' || s.type === 'city') && (
                    <span className="fs-row-arrow" style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
                      <Icons.ArrowLeft size={12} stroke={2.5} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Administrative clustering constants
const REGIONS = [
  { id: "barat", label: "Jawa Barat", center: [-6.7, 107.0], provinces: ["DKI Jakarta", "Banten", "Jawa Barat"] },
  { id: "tengah", label: "Jawa Tengah", center: [-7.2, 110.3], provinces: ["Jawa Tengah", "DI Yogyakarta"] },
  { id: "timur", label: "Jawa Timur", center: [-7.65, 112.5], provinces: ["Jawa Timur"] },
];

const PROVINCES_LIST = ["DKI Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur"];

const PROVINCE_SHORT = {
  "DKI Jakarta": "Jakarta",
  "Banten": "Banten",
  "Jawa Barat": "Jabar",
  "Jawa Tengah": "Jateng",
  "DI Yogyakarta": "DIY",
  "Jawa Timur": "Jatim",
};

const PROVINCE_CENTERS = {
  "DKI Jakarta": [-6.21, 106.84],
  "Banten": [-6.40, 106.08],
  "Jawa Barat": [-7.09, 107.67],
  "Jawa Tengah": [-7.15, 110.14],
  "DI Yogyakarta": [-7.80, 110.36],
  "Jawa Timur": [-7.54, 112.24],
};

const ZOOM_REGION = 7;
const ZOOM_PROVINCE = 9;

// ✅ COMPLETE MAP-ONLY APP
function App() {
  const [stations, setStations] = useState([]);
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isDark = tweaks.theme === "dark" || (tweaks.theme === "auto" && systemDark);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const lang = tweaks.lang;
  const t = window.I18N[lang];

  const [query, setQuery] = useState("");
  const [activeBrands, setActiveBrands] = useState(new Set());
  const [activeProvinces, setActiveProvinces] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userPos, setUserPos] = useState(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  // ✅ LOAD STATIONS DATA
  useEffect(() => {
    fetch("data/stations_enriched.json")
      .then(r => r.json())
      .then(data => { setStations(data); })
      .catch(err => { console.error(err); showToast("Failed to load stations", true); });
  }, []);

  // ✅ FILTER STATIONS
  const filtered = useMemo(() => {
    let res = stations;

    // Brand filter
    if (activeBrands.size > 0) {
      res = res.filter(s => activeBrands.has(s.brand));
    }

    // Province filter
    if (activeProvinces.size > 0) {
      res = res.filter(s => activeProvinces.has(s.province));
    }

    // Query search
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.province && s.province.toLowerCase().includes(q))
      );
    }

    // Near me filter
    if (nearMeActive && userPos) {
      const rad = tweaks.radiusKm || 3;
      res = res.filter(s => {
        const dist = window.haversineKm(userPos.lat, userPos.lon, s.lat, s.lon);
        return dist <= rad;
      });
    }

    return res;
  }, [stations, activeBrands, activeProvinces, query, nearMeActive, userPos, tweaks.radiusKm]);

  // BUG 8 FIX: search from ALL stations, not filtered
  // so detail panel stays open when Near Me filter is active
  const selectedStation = selected ? stations.find(s => s.id === selected) : null;
  // BUG 5 FIX: pass the formatting function t.distanceKm, not a pre-computed string
  // ResultRow calls distanceKm(dist) so it needs to be a function
  const distanceKm = t.distanceKm;

  const mapRef = useRef(null);

  const onSelectStation = useCallback((id) => { setSelected(id); }, []);
  const onCloseDetail = useCallback(() => { setSelected(null); }, []);

  const onCycleLang = useCallback(() => {
    const langs = ['id', 'en'];
    const idx = langs.indexOf(lang);
    const next = langs[(idx + 1) % langs.length];
    setTweak({ ...tweaks, lang: next });
  }, [lang, tweaks]);

  const onCycleTheme = useCallback(() => {
    const themes = ['auto', 'light', 'dark'];
    const idx = themes.indexOf(tweaks.theme);
    const next = themes[(idx + 1) % themes.length];
    setTweak({ ...tweaks, theme: next });
  }, [tweaks]);

  const onFlyToArea = useCallback((province) => {
    if (!mapRef.current) return;
    const center = PROVINCE_CENTERS[province] || DEFAULT_CENTER;
    mapRef.current.flyTo(center, ZOOM_PROVINCE, { duration: 0.6 });
  }, []);

  const onFlyToCoords = useCallback((lat, lon) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lon], 14, { duration: 0.6 });
  }, []);

  const onToggleNearMe = useCallback(() => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setUserPos({ lat: latitude, lon: longitude });
          setNearMeActive(true);
          setLocating(false);
        },
        err => {
          console.error(err);
          showToast(t.errorGeoLocation || "Geolocation failed", true);
          setLocating(false);
        }
      );
    } else {
      showToast("Geolocation not supported", true);
      setLocating(false);
    }
  }, [nearMeActive, t]);

  const onCopy = useCallback(() => {
    if (!selectedStation) return;
    const text = `${selectedStation.name}\n${selectedStation.city}, ${selectedStation.province}\nhttps://maps.google.com/?q=${selectedStation.lat},${selectedStation.lon}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast(t.copiedLink || "Copied!");
    });
  }, [selectedStation, t]);

  const onShare = useCallback(() => {
    if (!selectedStation) return;
    if (navigator.share) {
      navigator.share({
        title: selectedStation.name,
        text: `${selectedStation.name} - ${selectedStation.city}`,
        url: window.location.href,
      }).catch(() => { });
    } else {
      onCopy();
    }
  }, [selectedStation, onCopy]);

  const onFitAll = useCallback(() => {
    if (!mapRef.current || filtered.length === 0) return;
    const bounds = L.latLngBounds(filtered.map(s => [s.lat, s.lon]));
    mapRef.current.fitBounds(bounds, { padding: [100, 100] });
  }, [filtered]);

  // BUG 3 & 6 FIX: route state + handler to draw polyline on map
  const [routeCoords, setRouteCoords] = useState(null);
  const onShowRoute = useCallback((coords) => {
    setRouteCoords(coords);
  }, []);
  const onClearRoute = useCallback(() => {
    setRouteCoords(null);
  }, []);

  // ✅ RENDER ALL COMPONENTS
  return (
    <>
      {/* Back to Landing Link */}
      <a href="./landing.html" style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 40,
        background: 'var(--accent)',
        color: 'var(--ink)',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '12px',
        fontFamily: '"Space Grotesk", sans-serif'
      }} title="Kembali ke Landing">
        ← Kembali
      </a>

      {/* Map */}
      {window.MapView && (
        <window.MapView
          stations={filtered}
          theme={tweaks.theme === "auto" ? (isDark ? "dark" : "light") : tweaks.theme}
          selectedId={selected}
          onSelect={onSelectStation}
          userLocation={userPos}
          nearMeRadius={tweaks.radiusKm}
          nearMeActive={nearMeActive}
          mapRef={mapRef}
          routeCoords={routeCoords}
          onClearRoute={onClearRoute}
        />
      )}

      {/* Floating Search */}
      {window.FloatingSearch && (
        <FloatingSearch
          stations={filtered}
          query={query}
          setQuery={setQuery}
          onSelectStation={onSelectStation}
          onFlyToArea={onFlyToArea}
          onFlyToCoords={onFlyToCoords}
          lang={lang}
          t={t}
          sidebarOpen={sidebarOpen}
          layout={tweaks.layout}
          theme={tweaks.theme === "auto" ? (isDark ? "dark" : "light") : tweaks.theme}
          onCycleTheme={onCycleTheme}
          onCycleLang={onCycleLang}
        />
      )}

      {/* Home Button */}
      <button
        className="home-button"
        onClick={() => window.location.href = 'landing.html'}
        title={lang === 'id' ? 'Kembali ke Halaman Utama' : 'Back to Home'}
        aria-label="Home"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>

      {/* Sidebar */}
      {window.Sidebar && (
        <window.Sidebar
          t={t}
          layout={tweaks.layout}
          collapsed={!sidebarOpen}
          onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
          query={query}
          setQuery={setQuery}
          brandFilter={activeBrands}
          setBrandFilter={setActiveBrands}
          results={filtered}
          total={stations.length}
          selectedId={selected}
          onSelectStation={onSelectStation}
          userLocation={userPos}
          nearMeActive={nearMeActive}
          onToggleNearMe={onToggleNearMe}
          locationStatus={locating ? "locating" : "idle"}
          theme={tweaks.theme === "auto" ? (isDark ? "dark" : "light") : tweaks.theme}
          onCycleTheme={onCycleTheme}
          lang={lang}
          onToggleLang={onCycleLang}
          selectedStation={selectedStation}
          onCloseDetail={onCloseDetail}
          distanceKm={distanceKm}
          onFitAll={onFitAll}
          onShowToast={showToast}
          onShowRoute={onShowRoute}
        />
      )}

      {/* Tweaks Panel */}
      {window.TweaksPanel && (
        <window.TweaksPanel
          tweaks={tweaks}
          setTweak={setTweak}
          t={t}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.isError ? 'error' : ''}`} style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: toast.isError ? '#ef4444' : '#22c55e',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          zIndex: 50,
          animation: 'slideInUp 0.3s ease-out'
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);