// Sidebar — search, chips, results list
const { useEffect: _ue, useRef: _ur, useState: _us, useMemo: _um } = React;

window.Sidebar = function Sidebar({
  t, layout, collapsed, onToggleCollapse,
  query, setQuery,
  brandFilter, setBrandFilter,
  results, total,
  selectedId, onSelectStation,
  userLocation, nearMeActive, onToggleNearMe,
  locationStatus,
  theme, onCycleTheme,
  lang, onToggleLang,
  selectedStation, onCloseDetail,
  distanceKm,
  onFitAll,
  onShowToast,
  onShowRoute,
}) {
  const Icons       = window.Icons;
  const I           = window.I18N[lang];
  const inputRef    = _ur(null);

  const brands      = ['Pertamina', 'Shell', 'BP', 'VIVO'];
  const brandColors = window.BrandColors;

  return (
    <aside className={`sidebar layout-${layout} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sb-header">
        <div className="sb-title-row">
          <div className="sb-title">
            <span className="sb-title-mark">⛽</span>
            <span>{I.appName}</span>
          </div>
          <div className="sb-title-actions">
            <button className="icon-btn" onClick={onToggleLang} title={I.language} aria-label={I.language}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{lang.toUpperCase()}</span>
            </button>
            <button className="icon-btn" onClick={onCycleTheme} title={I.theme} aria-label={I.theme}>
              {theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
            </button>
            <button className="icon-btn" onClick={onToggleCollapse} title={I.closeSidebar} aria-label={I.closeSidebar}>
              <Icons.Close size={18} />
            </button>
          </div>
        </div>

        <div className="search-wrap">
          <Icons.Search size={16} />
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={I.searchPlaceholder}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        <div className="chips">
          <button
            className={`chip ${!brandFilter || brandFilter.size === 0 ? 'active' : ''}`}
            onClick={() => setBrandFilter(new Set())}
          >
            {I.allBrands}
          </button>
          {brands.map(b => (
            <button
              key={b}
              className={`chip ${brandFilter && brandFilter.has && brandFilter.has(b) ? 'active' : ''}`}
              onClick={() => {
                const next = new Set(brandFilter);
                if (next.has(b)) next.delete(b); else next.add(b);
                setBrandFilter(next);
              }}
            >
              <span className="chip-dot" style={{ background: brandColors[b] }} />
              {b}
            </button>
          ))}
        </div>

        <button
          className={`near-me-btn ${nearMeActive ? 'active' : ''}`}
          onClick={onToggleNearMe}
          disabled={locationStatus === 'locating'}
        >
          {locationStatus === 'locating' ? (
            <><span className="spinner" />{I.locating}</>
          ) : nearMeActive ? (
            <><Icons.Close size={16} />{I.cancelNearMe}</>
          ) : (
            <><Icons.Crosshair size={16} />{I.nearMe}</>
          )}
        </button>
      </div>

      <div className="result-meta">
        <span>{I.resultsCount(results.length)}</span>
        {nearMeActive && <span>{I.nearestFirst}</span>}
        {!nearMeActive && results.length > 0 && (
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={onFitAll} title={I.fitAll}>
            <Icons.Map size={14} />
          </button>
        )}
      </div>

      <div className="results">
        {results.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🛢️</div>
            <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{I.noResults}</div>
            <div style={{ marginTop: 4 }}>{I.noResultsHint}</div>
          </div>
        ) : (
          results.slice(0, 200).map(s => (
            <ResultRow
              key={s.id}
              station={s}
              selected={s.id === selectedId}
              onClick={() => onSelectStation(s.id)}
              userLocation={userLocation}
              distanceKm={distanceKm}
            />
          ))
        )}
      </div>

      {selectedStation && (
        <window.DetailPanel
          station={selectedStation}
          t={t}
          lang={lang}
          onClose={onCloseDetail}
          userPos={userLocation}
          onShowToast={onShowToast}
          onShowRoute={onShowRoute}
        />
      )}
    </aside>
  );
};

function ResultRow({ station, selected, onClick, userLocation, distanceKm }) {
  const Logo = window.BrandLogos[station.brand];
  const dist = userLocation
    ? window.haversineKm(userLocation.lat, userLocation.lon, station.lat, station.lon)
    : null;
  return (
    <button className={`result ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="result-logo">
        {Logo && <Logo size={38} />}
      </div>
      <div className="result-body">
        <div className="result-title">{station.name}</div>
        <div className="result-sub">
          {station.brand}{station.address ? ' · ' + station.address : station.city ? ' · ' + station.city : ''}
        </div>
      </div>
      {dist !== null && (
        <div className="result-distance">{distanceKm(dist)}</div>
      )}
    </button>
  );
}

// ── Injected CSS: Spinner + Cluster Glassmorphism ──────────────────────
const _sty = document.createElement('style');
_sty.textContent = `

/* ── Spinner ── */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Reset leaflet cluster wrapper ── */
.cluster-icon {
  background: transparent !important;
  border: none !important;
}

/* ── Cluster bubble base ── */
.cluster-bubble {
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}
.cluster-bubble:hover {
  transform: scale(1.08);
}

/* ── Text inside clusters ── */
.cluster-lbl {
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.75);
  margin-bottom: 2px;
}
.cluster-cnt {
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  font-family: var(--font-display);
}

/* ── Level 1: Region (Jabar / Jateng / Jatim) — 70px ── */
.cluster-region {
  width: 70px !important;
  height: 70px !important;
  min-width: 70px;
  min-height: 70px;
  background: rgba(10, 132, 255, 0.18);
  border: 1.5px solid rgba(10, 132, 255, 0.55);
  box-shadow:
    0 0 0 8px rgba(10, 132, 255, 0.09),
    0 6px 28px rgba(10, 132, 255, 0.28),
    inset 0 1px 0 rgba(255,255,255,0.18);
}
.cluster-region .cluster-cnt { font-size: 17px; }
.cluster-region .cluster-lbl { font-size: 9px; }

/* ── Level 2: Province — 62px ── */
.cluster-prov {
  width: 62px !important;
  height: 62px !important;
  min-width: 62px;
  min-height: 62px;
  background: rgba(32, 156, 238, 0.15);
  border: 1.5px solid rgba(32, 156, 238, 0.5);
  box-shadow:
    0 0 0 6px rgba(32, 156, 238, 0.08),
    0 4px 20px rgba(32, 156, 238, 0.22),
    inset 0 1px 0 rgba(255,255,255,0.14);
}
.cluster-prov .cluster-cnt { font-size: 15px; }
.cluster-prov .cluster-lbl { font-size: 8px; }

/* ── Level 3: City — 54px ── */
.cluster-city {
  width: 54px !important;
  height: 54px !important;
  min-width: 54px;
  min-height: 54px;
  background: rgba(50, 173, 230, 0.13);
  border: 1.5px solid rgba(50, 173, 230, 0.45);
  box-shadow:
    0 0 0 5px rgba(50, 173, 230, 0.07),
    0 3px 14px rgba(50, 173, 230, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.10);
}
.cluster-city .cluster-cnt { font-size: 13px; }
.cluster-city .cluster-lbl { font-size: 8px; }

/* ── Level 4: Small number-only ── */
.cluster-small {
  background: rgba(94, 196, 231, 0.13);
  border: 1.5px solid rgba(94, 196, 231, 0.4);
  box-shadow:
    0 0 0 4px rgba(94, 196, 231, 0.06),
    0 2px 10px rgba(94, 196, 231, 0.15),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.cluster-small .cluster-cnt { font-size: 12px; }

/* ── Light mode overrides ── */
[data-theme="light"] .cluster-region,
[data-theme="light"] .cluster-prov,
[data-theme="light"] .cluster-city,
[data-theme="light"] .cluster-small {
  background: rgba(0, 122, 255, 0.10);
  border-color: rgba(0, 122, 255, 0.38);
  box-shadow:
    0 0 0 6px rgba(0, 122, 255, 0.07),
    0 4px 18px rgba(0, 122, 255, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.5);
}
[data-theme="light"] .cluster-lbl { color: rgba(0, 80, 180, 0.7); }
[data-theme="light"] .cluster-cnt { color: rgba(0, 60, 160, 0.95); }

`;
document.head.appendChild(_sty);