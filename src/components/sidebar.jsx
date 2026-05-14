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
  const Icons = window.Icons;
  const I = window.I18N[lang];
  const inputRef = _ur(null);

  const brands = ['Pertamina', 'Shell', 'BP', 'VIVO'];
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
              <span style={{fontSize: 11, fontWeight: 700}}>{lang.toUpperCase()}</span>
            </button>
            <button className="icon-btn" onClick={onCycleTheme} title={I.theme} aria-label={I.theme}>
              {theme === 'dark' ? <Icons.Moon /> : theme === 'light' ? <Icons.Sun /> : <Icons.Sun />}
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={I.searchPlaceholder}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        <div className="chips">
          <button
            className={`chip ${!brandFilter ? 'active' : ''}`}
            onClick={() => setBrandFilter(null)}
          >
            {I.allBrands}
          </button>
          {brands.map(b => (
            <button
              key={b}
              className={`chip ${brandFilter === b ? 'active' : ''}`}
              onClick={() => setBrandFilter(brandFilter === b ? null : b)}
            >
              <span className="chip-dot" style={{background: brandColors[b]}}></span>
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
            <>
              <span className="spinner" />
              {I.locating}
            </>
          ) : nearMeActive ? (
            <>
              <Icons.Close size={16} />
              {I.cancelNearMe}
            </>
          ) : (
            <>
              <Icons.Crosshair size={16} />
              {I.nearMe}
            </>
          )}
        </button>
      </div>

      <div className="result-meta">
        <span>{I.resultsCount(results.length)}</span>
        {nearMeActive && <span>{I.nearestFirst}</span>}
        {!nearMeActive && results.length > 0 && (
          <button className="icon-btn" style={{width: 24, height: 24}} onClick={onFitAll} title={I.fitAll}>
            <Icons.Map size={14} />
          </button>
        )}
      </div>

      <div className="results">
        {results.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🛢️</div>
            <div style={{fontWeight: 600, color: 'var(--text-2)'}}>{I.noResults}</div>
            <div style={{marginTop: 4}}>{I.noResultsHint}</div>
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
  const dist = userLocation ? window.haversineKm(userLocation.lat, userLocation.lon, station.lat, station.lon) : null;
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

// Spinner CSS injected
const _sty = document.createElement('style');
_sty.textContent = `
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.cluster-bubble {
  background: var(--accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent), 0 2px 6px rgba(0,0,0,0.3);
  border: 2px solid white;
  font-family: var(--font-display);
}
`;
document.head.appendChild(_sty);