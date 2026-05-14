# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SPBU Peta Interaktif** — an interactive map of fuel stations (SPBU) across Java, Indonesia. Brands: Pertamina, Shell, BP, VIVO.

## Running Locally

No build step — this is a static HTML + in-browser Babel/JSX app.
```bash
python -m http.server 8000
# or
npx http-server
```

Then open `http://localhost:8000`. File protocol (`file://`) works but geolocation requires HTTPS.

## Project Structure

```
New Web/
├── index.html                 # Main entry point (kept at root for server to serve)
├── .env                       # Environment variables (API keys)
├── .gitignore
├── .claudeignore
├── CLAUDE.md                  # This file
├── data/                      # Station data (JSON)
│   ├── stations.json
│   ├── stations_enriched.json
│   └── ...
├── public/                    # Static assets
│   ├── landing.html
│   └── assets/
│       └── Logo/
├── src/
│   ├── components/            # React JSX components (loaded in index.html)
│   │   ├── app.jsx           # Main app wrapper
│   │   ├── landing.jsx       # Landing page
│   │   ├── map.jsx           # Leaflet map view
│   │   ├── sidebar.jsx       # Station list sidebar
│   │   ├── detail.jsx        # Station detail panel
│   │   ├── tweaks-panel.jsx  # Settings (theme/language)
│   │   ├── brands.jsx        # Brand filter logic
│   │   └── icons.jsx         # Icon utilities
│   ├── config/               # Configuration files
│   │   ├── config.js         # API keys & settings
│   │   └── i18n.js          # Localization strings
│   ├── styles/               # CSS
│   │   └── styles.css
│   └── scripts/              # Data processing & utility scripts
│       ├── enrich_stations.py      # Add address data to stations
│       ├── merge_geojson.py        # Combine GeoJSON files
│       └── scrape_prices.py        # Fetch fuel prices
├── .claude/                   # Claude Code metadata
├── .github/                   # GitHub workflows
└── server/                    # Server-related files
```

## Architecture

### No Build System
- No `package.json`, no bundler, no npm. Dependencies (React 18, Leaflet, Babel standalone) are loaded via CDN in `index.html`.
- JSX is transpiled **at runtime** by Babel standalone. All `.jsx` files are `<script type="text/babel">` includes.

### Script Load Order (index.html)
Leaflet → React/ReactDOM/Babel → `src/config/config.js` → `src/config/i18n.js` → CSS → `src/components/tweaks-panel.jsx` → `src/components/brands.jsx` → `src/components/icons.jsx` → `src/components/detail.jsx` → `src/components/map.jsx` → `src/components/sidebar.jsx` → `src/components/app.jsx`

Components must be loaded before `app.jsx` because there is no module bundler — order matters.

### Component Structure
Routing is handled via simple React state (e.g., currentView: 'landing' | 'map') inside <App>. No React Router is used.
```
<App>  (app.jsx — holds global state including currentView, ~814 lines)
  ├── <LandingView/>        (landing.jsx — hero, stats, gas prices, features)
  │
  └── <MapWrapper/>         (renders only when currentView === 'map')
       ├── <FloatingSearch/>      search bar with autocomplete
       ├── <MapView/>             Leaflet map + marker clustering  (map.jsx)
       ├── <Sidebar/>             scrollable results list          (sidebar.jsx)
       ├── <DetailPanel/>         station detail slide-up panel    (detail.jsx)
       └── <TweaksPanel/>         settings (theme/language/layout) (tweaks-panel.jsx)
```

State is passed as props — no Context API, no Redux.

### Data Flow
1. App boots and mounts `<LandingView />` by default. `<App>` fetches `data/stations.json` (~580 KB, ~8000+ stations) in the background.
2. User clicks "Buka Peta" on the landing page, updating state to `currentView = 'map'`.
3. `<MapWrapper>` mounts. Stations are filtered client-side by brand, province, search query, and radius.
4. Distance computed with Haversine formula in `app.jsx.`
5. `<MapView>` renders Leaflet markers with clustering.
6. Selecting a station triggers Google Places API fetch in `detail.jsx` for live enrichment (hours, phone, rating).

### Key Globals
- `window.STREET_VIEW_KEY` / `window.PLACES_KEY` — set in `config.js` from `.env`
- `window.I18N` — localization strings (id/en) defined in `i18n.js`

### Localization
- `i18n.js` exports `window.I18N` with `id` and `en` keys.
- `app.jsx` reads `lang` from localStorage and passes it down as a prop.
- All UI strings should come from `I18N[lang].key` — never hardcode Indonesian or English strings in JSX.

### Theming
- CSS custom properties in `styles.css` handle light/dark modes via `data-theme` on `<html>`.
- `prefers-reduced-motion` media query is respected; motion-heavy transitions are gated on it.
- Landing Page Styling: Use pure CSS in `styles.css`. Do not use external libraries (like Tailwind). Utilize existing CSS variables (`--bg-color`, `--text-color`, etc.) for consistency between the landing page and the map interface.

### Stations Data Schema
```js
{
  id: "relation/6934770",   // OSM ID
  brand: "Pertamina",       // Pertamina | Shell | BP | VIVO
  name: "SPBU Gayam",
  address: null,
  city: "Bandung",
  province: "Jawa Barat",
  phone: null,
  hours: null,
  fuels: ["Pertamax", "Diesel"],
  lat: -7.682503,
  lon: 110.851414
}
```

## Adding New Components
1. Create `component-name.jsx`.
2. Add `<script type="text/babel" src="component-name.jsx"></script>` in `index.html` **before** `app.jsx`.
3. Components are global — no import/export needed.
