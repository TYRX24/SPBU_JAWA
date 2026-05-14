// Detail panel — slide-up inside sidebar
const { useEffect, useState } = React;

// Fetch Places API enrichment (new Places API — supports CORS from browser)
function usePlacesEnrichment(station) {
  const [data, setData]     = useState(null);  // enriched fields or null
  const [status, setStatus] = useState("idle"); // idle | loading | ok | unavailable

  useEffect(() => {
    const key = window.PLACES_KEY;
    if (!key || !station) { setStatus("unavailable"); return; }

    setData(null);
    setStatus("loading");

    fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.regularOpeningHours",
          "places.rating",
          "places.userRatingCount",
        ].join(","),
      },
      body: JSON.stringify({
        includedTypes: ["gas_station"],
        maxResultCount: 1,
        locationRestriction: {
          circle: {
            center: { latitude: station.lat, longitude: station.lon },
            radius: 200,
          },
        },
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.error) { setStatus("unavailable"); return; }
        const place = json.places?.[0];
        if (!place) { setStatus("unavailable"); return; }
        setData({
          name:        place.displayName?.text   || null,
          address:     place.formattedAddress    || null,
          phone:       place.nationalPhoneNumber  || null,
          openNow:     place.regularOpeningHours?.openNow ?? null,
          todayHours:  getTodayHours(place.regularOpeningHours?.weekdayDescriptions),
          allHours:    place.regularOpeningHours?.weekdayDescriptions || null,
          rating:      place.rating              || null,
          ratingCount: place.userRatingCount     || null,
        });
        setStatus("ok");
      })
      .catch(() => setStatus("unavailable"));
  }, [station?.id]);

  return { placesData: data, placesStatus: status };
}

function getTodayHours(weekdayDescriptions) {
  if (!weekdayDescriptions) return null;
  // Places API: index 0=Monday … 6=Sunday; JS getDay(): 0=Sunday … 6=Saturday
  const jsDay    = new Date().getDay();
  const placeIdx = (jsDay + 6) % 7;
  const entry    = weekdayDescriptions[placeIdx] || "";
  // Strip the day name prefix e.g. "Monday: 24 hours" → "24 hours"
  return entry.replace(/^[^:]+:\s*/, "");
}

function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

window.DetailPanel = function DetailPanel({ station, onClose, userPos, t, lang, onShowToast, onShowRoute }) {
  if (!station) return null;
  const Logo   = window.BrandLogos[station.brand];
  const heroBg = window.BrandHeroBg[station.brand];

  // Route state
  const [routeStatus, setRouteStatus] = useState("idle"); // idle | loading | ok | error
  useEffect(() => { setRouteStatus("idle"); }, [station?.id]);

  // Places API enrichment
  const { placesData, placesStatus } = usePlacesEnrichment(station);

  // Street View availability check
  const [svStatus, setSvStatus] = useState("loading"); // loading | ok | none
  useEffect(() => {
    if (!window.STREET_VIEW_KEY) { setSvStatus("none"); return; }
    setSvStatus("loading");
    fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata` +
      `?location=${station.lat},${station.lon}&key=${window.STREET_VIEW_KEY}`
    )
      .then(r => r.json())
      .then(d => setSvStatus(d.status === "OK" ? "ok" : "none"))
      .catch(() => setSvStatus("none"));
  }, [station.id]);

  function svUrl(heading) {
    const key = window.STREET_VIEW_KEY;
    return `https://maps.googleapis.com/maps/api/streetview` +
      `?size=400x400&location=${station.lat},${station.lon}` +
      `&heading=${heading}&fov=90&pitch=5&key=${key}`;
  }

  function svHeroUrl() {
    const key = window.STREET_VIEW_KEY;
    return `https://maps.googleapis.com/maps/api/streetview` +
      `?size=640x280&location=${station.lat},${station.lon}` +
      `&fov=100&pitch=5&key=${key}`;
  }

  // BUG #7 FIX: use 4-param signature matching map.jsx definition
  const dist = userPos
    ? window.haversineKm(userPos.lat, userPos.lon, station.lat, station.lon)
    : null;

  // Hours parsing
  const hours = station.hours;
  const isOpen24 = hours && (hours.includes("24/7") || hours === "24/7");

  const handleDirections = async () => {
    if (!userPos) {
      onShowToast(lang === "id" ? "Aktifkan lokasi terlebih dahulu" : "Enable location first");
      return;
    }
    setRouteStatus("loading");
    try {
    // BUG #4 FIX: userPos is { lat, lon } object, not an array
    const { lat: fromLat, lon: fromLon } = userPos;
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${station.lon},${station.lat}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("no route");
      onShowRoute(data.routes[0].geometry.coordinates);
      setRouteStatus("ok");
    } catch {
      setRouteStatus("error");
      onShowToast(lang === "id" ? "Gagal memuat rute" : "Failed to load route");
      setTimeout(() => setRouteStatus("idle"), 2000);
    }
  };

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`;
    window.open(url, "_blank");
  };
  const handleCall = () => {
    if (station.phone) window.location.href = `tel:${station.phone}`;
    else onShowToast(lang === "id" ? "Nomor telepon tidak tersedia" : "Phone not available");
  };
  const handleShare = async () => {
    const url = `https://www.google.com/maps/?q=${station.lat},${station.lon}`;
    const data = { title: station.name, text: `${station.brand} — ${station.name}`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        onShowToast(t.shareCopied);
      }
    } catch (e) { /* user cancelled */ }
  };

  const copyCoords = async () => {
    await navigator.clipboard.writeText(`${station.lat}, ${station.lon}`);
    onShowToast(t.copied);
  };

  const heroStyle = svStatus === "ok"
    ? { backgroundImage: `url(${svHeroUrl()})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: heroBg };

  return (
    <div className={`detail ${station ? "open" : ""}`}>
      <div className={`detail-hero ${svStatus === "ok" ? "detail-hero-photo" : ""}`} style={heroStyle}>
        {svStatus === "ok" && <div className="detail-hero-overlay" />}
        <div className="detail-hero-top">
          <button className="detail-back" onClick={onClose} aria-label="Back">
            <window.Icons.ArrowLeft size={18} stroke={2.5} />
          </button>
          <div className="detail-actions">
            <button className="detail-action-circle" onClick={handleShare} aria-label="Share">
              <window.Icons.Share size={16} stroke={2.5} />
            </button>
          </div>
        </div>
        <div className="detail-hero-bottom">
          <div className="detail-hero-logo">
            <Logo size={44} />
          </div>
          <div className="detail-hero-text">
            <h2 className="detail-hero-name">
              {placesData?.name || station.name || station.brand}
            </h2>
            <div className="detail-hero-meta">
              <span>{station.brand}</span>
              {/* Real-time open/closed from Places API */}
              {placesData?.openNow != null ? (
                <>
                  <span>·</span>
                  <span className={`detail-status-dot ${placesData.openNow ? "" : "closed"}`} />
                  <span>{placesData.openNow
                    ? (lang === "id" ? "Buka" : "Open")
                    : (lang === "id" ? "Tutup" : "Closed")}
                  </span>
                </>
              ) : (isOpen24 || hours) ? (
                <>
                  <span>·</span>
                  <span className="detail-status-dot" />
                  <span>{isOpen24 ? t.detailHours24 : t.open}</span>
                </>
              ) : null}
              {dist != null && (
                <>
                  <span>·</span>
                  <span>{t.distanceKm(dist)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="detail-cta-row">
        <button
          className={`cta-btn${routeStatus === "ok" ? " cta-btn-route-ok" : ""}`}
          onClick={handleDirections}
          disabled={routeStatus === "loading"}
        >
          <span className="cta-btn-icon">
            {routeStatus === "loading"
              ? <span className="cta-route-spinner" />
              : <window.Icons.Compass size={16} stroke={2.5} />}
          </span>
          <span>
            {routeStatus === "loading" ? t.detailRouteLoading
           : routeStatus === "error"   ? t.detailRouteError
           : t.detailDirections}
          </span>
        </button>
        <button className="cta-btn" onClick={handleOpenMaps}>
          <span className="cta-btn-icon"><window.Icons.Map size={16} stroke={2} /></span>
          <span>{t.detailOpenMaps}</span>
        </button>
        <button className="cta-btn" onClick={handleCall}>
          <span className="cta-btn-icon"><window.Icons.Phone size={14} stroke={2.5} /></span>
          <span>{t.detailCall}</span>
        </button>
        <button className="cta-btn" onClick={handleShare}>
          <span className="cta-btn-icon"><window.Icons.Share size={14} stroke={2.5} /></span>
          <span>{t.detailShare}</span>
        </button>
      </div>

      <div className="detail-body">
        {/* Street View Photos */}
        <div className="detail-section">
          <h3 className="detail-section-title">{lang === "id" ? "Foto" : "Photos"}</h3>

          {svStatus === "loading" && (
            <div className="sv-loading">
              <div className="sv-spinner" />
            </div>
          )}

          {svStatus === "ok" && (
            <div className="sv-grid">
              {[0, 90, 180].map(heading => (
                <a
                  key={heading}
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${station.lat},${station.lon}&heading=${heading}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sv-thumb"
                >
                  <img
                    src={svUrl(heading)}
                    alt={`Street View ${heading}°`}
                    loading="lazy"
                    onError={e => { e.currentTarget.closest(".sv-thumb").style.display = "none"; }}
                  />
                  <div className="sv-thumb-overlay">
                    <window.Icons.Map size={14} stroke={2} />
                  </div>
                </a>
              ))}
            </div>
          )}

          {svStatus === "none" && (
            <div className="sv-unavailable">
              <window.Icons.Map size={20} stroke={1.5} />
              <span>{lang === "id" ? "Foto tidak tersedia" : "No photos available"}</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <div className="detail-section-header">
            <h3 className="detail-section-title">{lang === "id" ? "Informasi" : "Information"}</h3>
            {placesStatus === "loading" && <span className="places-badge places-loading">Google…</span>}
            {placesStatus === "ok"      && <span className="places-badge places-ok">Google</span>}
          </div>

          {/* Rating — only from Places */}
          {placesData?.rating && (
            <div className="detail-row">
              <window.Icons.Check size={16} />
              <div className="detail-row-value">
                <div className="detail-row-label">{lang === "id" ? "Rating" : "Rating"}</div>
                <div className="places-rating">
                  <span className="places-rating-score">{placesData.rating.toFixed(1)}</span>
                  <span className="places-rating-stars">{renderStars(placesData.rating)}</span>
                  {placesData.ratingCount && (
                    <span className="places-rating-count">
                      ({placesData.ratingCount.toLocaleString("id-ID")} ulasan)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {(placesData?.address || station.address || station.city || station.province) && (
            <div className="detail-row">
              <window.Icons.Pin size={16} />
              <div className="detail-row-value">
                <div className="detail-row-label">{t.detailAddress}</div>
                {placesData?.address ||
                  [station.address, station.city, station.province].filter(Boolean).join(", ")}
              </div>
            </div>
          )}

          {/* Hours */}
          <div className="detail-row">
            <window.Icons.Clock size={16} />
            <div className="detail-row-value">
              <div className="detail-row-label">{t.detailHours}</div>
              {placesData?.todayHours
                ? <span>{placesData.todayHours}</span>
                : isOpen24 ? t.detailHours24
                : (hours || t.detailHoursUnknown)
              }
            </div>
          </div>

          {/* Phone */}
          {(placesData?.phone || station.phone) && (
            <div className="detail-row">
              <window.Icons.Phone size={16} />
              <div className="detail-row-value">
                <div className="detail-row-label">{t.detailPhone}</div>
                <a href={`tel:${placesData?.phone || station.phone}`}
                   style={{ color: "var(--accent)", textDecoration: "none" }}>
                  {placesData?.phone || station.phone}
                </a>
              </div>
            </div>
          )}

          {/* Coords */}
          <button className="detail-row" onClick={copyCoords}
                  style={{ width: "100%", textAlign: "left", background: "transparent", padding: 0 }}>
            <window.Icons.Crosshair size={16} />
            <div className="detail-row-value">
              <div className="detail-row-label">{t.detailCoords}</div>
              {station.lat.toFixed(5)}, {station.lon.toFixed(5)}
            </div>
          </button>

          {/* Distance */}
          {dist != null && (
            <div className="detail-row">
              <window.Icons.Compass size={16} />
              <div className="detail-row-value">
                <div className="detail-row-label">{t.detailDistance}</div>
                {t.distanceKm(dist)}
              </div>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">{t.detailFuels}</h3>
          {station.fuels.length > 0 ? (
            <div className="fuel-grid">
              {station.fuels.map(f => (
                <span key={f} className="fuel-pill">{window.getFuelName(station.brand, f)}</span>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>{t.detailFuelsUnknown}</div>
          )}
        </div>

        {(station.nearby?.atms?.length > 0 || station.nearby?.minimarkets?.length > 0) && (
          <div className="detail-section">
            <h3 className="detail-section-title">{t.detailNearby}</h3>

            {station.nearby?.atms?.length > 0 && (
              <div className="nearby-group">
                <div className="nearby-group-label">
                  <window.Icons.CreditCard size={13} stroke={2} />
                  {t.detailNearbyATM}
                </div>
                {station.nearby.atms.map((atm, i) => (
                  <div key={i} className="nearby-item">
                    <div className="nearby-item-info">
                      <span className="nearby-item-name">{atm.name}</span>
                      {atm.operator && <span className="nearby-item-sub">{atm.operator}</span>}
                    </div>
                    <span className="nearby-item-dist">{atm.distance_m}m</span>
                  </div>
                ))}
              </div>
            )}

            {station.nearby?.minimarkets?.length > 0 && (
              <div className="nearby-group">
                <div className="nearby-group-label">
                  <window.Icons.Store size={13} stroke={2} />
                  {t.detailNearbyMinimarket}
                </div>
                {station.nearby.minimarkets.map((mini, i) => (
                  <div key={i} className="nearby-item">
                    <div className="nearby-item-info">
                      <span className="nearby-item-name">{mini.name}</span>
                      {mini.hours && <span className="nearby-item-sub">{mini.hours}</span>}
                    </div>
                    <span className="nearby-item-dist">{mini.distance_m}m</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// haversineKm is defined in map.jsx with 4 params (lat1, lon1, lat2, lon2)
// do NOT redefine it here — use window.haversineKm directly