# Disrupt Collective — XY Pendulum Viz

**Version:** `0.3.0`  
**Package:** `pendulum-viz`

A browser-based generator for abstract XY pendulum artwork, built for the Disrupt Collective brand system. Use the interactive UI to design patterns, or call the PNG API from other apps to generate avatars on demand.

---

## Features

- **Static mode** — tweak physics and appearance, export SVG
- **Animated mode** — oscillating parameters over time, export a frame as SVG
- **Randomizer** — randomize any subset of parameters (configurable via settings)
- **Sequencer** — generate a gallery of variations; download individually, as a queue, or as a ZIP
- **Black & White mode** — enforces high-contrast monochrome output
- **PNG API** — serverless endpoint for avatar generation in other applications
- **Preset export/import** — save and restore static or animated configurations as JSON
- **API query builder** — build GET/POST URLs from current settings or manually

---

## Requirements

- Node.js 18+
- npm

---

## Local development

### UI only (fast iteration)

```bash
cd web-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
The PNG API is **not** available on this server.

### UI + API locally (recommended for API testing)

The API lives in `api/` and runs as a Vercel serverless function. Use Vercel’s dev server:

```bash
cd web-app
npm install
npm run dev:api
```

On first run, log in when prompted (`vercel login`). Then open [http://localhost:3000](http://localhost:3000).

**Test the API:**

```bash
# Random avatar
curl -o avatar.png "http://localhost:3000/api/avatar.png?size=256"

# Stable avatar (same seed = same image)
curl -o avatar-seeded.png "http://localhost:3000/api/avatar.png?seed=user-42&size=256"

# With fixed colors
curl -o avatar-custom.png "http://localhost:3000/api/avatar.png?seed=team-a&size=512&strokeColor=%23FF00AA&backgroundColor=%231A1A2E"
```

Or open in browser: [http://localhost:3000/api/avatar.png?seed=test&size=256](http://localhost:3000/api/avatar.png?seed=test&size=256)

In the app UI, use **API query builder** (sidebar footer) to compose URLs, copy GET/POST payloads, and preview the result. Set **API base URL** to `http://localhost:3000` when using `npm run dev:api`.

### Other scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | UI + API via Vercel dev (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Version management

The app version is stored in `package.json` and shown in the UI header. Bump it with:

| Script | Example `0.2.0` → |
|--------|---------------------|
| `npm run version:patch` | `0.2.1` |
| `npm run version:minor` | `0.3.0` |
| `npm run version:major` | `1.0.0` |
| `npm run version:show` | prints current version |

These update `package.json` only (`--no-git-tag-version`). Commit the change yourself, or run `git tag vX.Y.Z` if you want release tags.

---

## Deploy to Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to `web-app`.
3. Vercel reads `vercel.json` automatically:
   - **Build:** `npm run build`
   - **Output:** `dist/`
   - **API:** `/api/*` runs as Node.js serverless functions

After deploy:

- UI: `https://your-project.vercel.app/`
- API: `https://your-project.vercel.app/api/avatar.png`

> **Note:** The PNG API uses `sharp` and requires the **Node.js** runtime (already configured in `api/avatar.png.js`). It does not run on Vite dev server locally — test via `vercel dev` or after deployment.

---

## Using the web app

### Static mode

1. Adjust **Physics Parameters** (ticks, amplitude, decay, frequencies).
2. Adjust **Appearance** (radius, stroke/fill colors and opacity).
3. Use **Randomize** to explore variations, or **Generate N** in the Sequencer for a batch.
4. Click a thumbnail in the gallery to apply it to the main canvas.
5. **Export SVG** downloads the current view (always square).

### Animated mode

Switch to **Animated** in the header. Parameters interpolate between min/max ranges over a loop duration. Export captures the current frame as SVG.

### Black & White mode

When enabled, stroke, fill, and background are coerced to black/white for contrast. Randomizer and API respect this when `bwMode=true`.

### Presets (export / import)

Save your configuration as a JSON preset file:

1. Click **Export preset** in the sidebar footer.
2. To restore, click **Import preset** and choose the `.json` file.

Preset format (`disrupt-pendulum-preset/v1`):

```json
{
  "$schema": "disrupt-pendulum-preset/v1",
  "appVersion": "0.2.0",
  "mode": "static",
  "exportedAt": "2026-07-13T...",
  "settings": { "ticks": 1600, "amplitude": 80, "...": "..." },
  "randomizer": { "enabled": { "ticks": true }, "sequenceCount": 5 }
}
```

- **Static presets** include randomizer checkbox state and sequencer count.
- **Animated presets** include all oscillating ranges and timing.
- Importing an animated preset while in static mode switches to animated (and vice versa).

### API query builder

Open **API query builder** from the sidebar footer (or top bar in animated mode):

- **Load from current settings** — fills params from the UI; in static mode, fields marked randomizable in the randomizer are omitted (API will randomize them).
- **Manual edit** — set any param; leave blank to omit (API randomizes omitted fields).
- **Copy GET URL** or **POST JSON body** for integration.
- **Live preview** — fetches PNG from the configured API base URL.

---

## PNG Avatar API

Generate pendulum artwork as PNG for use as avatars, placeholders, or generative IDs in other apps.

### Endpoint

```
GET  /api/avatar.png
POST /api/avatar.png
```

| Property | Value |
|----------|-------|
| **Response** | `image/png` |
| **CORS** | `Access-Control-Allow-Origin: *` |
| **Methods** | `GET`, `POST`, `OPTIONS` |

Parameters can be sent as **query string** (GET) or **JSON body** (POST). POST body overrides query params.

---

### Seed behavior

| | With `seed` | Without `seed` |
|---|-------------|----------------|
| **Output** | Always the same for identical params | Different each request |
| **Use case** | Stable avatar per user ID | One-off random image |
| **Caching** | `Cache-Control: public, max-age=31536000, immutable` | `Cache-Control: no-store` |

**Rule:** same `seed` + same explicit parameters → same PNG every time.  
Any parameter you omit is filled randomly (using the seed when provided).

Example — stable avatar for user `42`:

```
GET /api/avatar.png?seed=user-42&size=256
```

Example — random each time:

```
GET /api/avatar.png?size=256
```

---

### Parameters reference

#### Output dimensions

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | number | `512` | Square output size in px (used when `width`/`height` omitted) |
| `width` | number | `512` | Output width in px (64–2048) |
| `height` | number | `512` | Output height in px (64–2048) |
| `square` | boolean | `true` | If `true`, output is `min(width, height)` × `min(width, height)` |

#### Mode & randomization

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `seed` | string | — | Deterministic seed (alias: `s`). Any string works, e.g. user ID or email hash |
| `bwMode` | boolean | `false` | Black & white mode. Accepts `true`/`false`, `1`/`0`, `yes`/`no` |

#### Physics

| Parameter | Type | Default if omitted | Random range |
|-----------|------|-------------------|--------------|
| `ticks` | number | randomized | 800 – 2200 |
| `amplitude` | number | randomized | 45 – 90 (percent of safe canvas) |
| `decay` | number | randomized | 0.1 – 1.6 |
| `frequencyX` | number | randomized | 1.0 – 30.0 |
| `frequencyY` | number | randomized | 1.0 – 30.0 |

#### Appearance

| Parameter | Type | Default if omitted | Random range / notes |
|-----------|------|-------------------|----------------------|
| `radiusMin` | number | randomized | 1.0 – 10.0 |
| `radiusMax` | number | randomized | 15.0 – 45.0 |
| `strokeWidth` | number | randomized | 0.1 – 2.3 |
| `strokeOpacity` | number | randomized | 0.4 – 1.0 |
| `fillOpacity` | number | randomized | 0.0 – 0.5 |
| `strokeColor` | string | randomized | Hex `#RRGGBB` (with or without `#`) |
| `fillColor` | string | randomized | Hex `#RRGGBB`; in color mode defaults to stroke color |
| `backgroundColor` | string | randomized | Colorful HSL in normal mode; `#FFFFFF` / `#161616` in B&W |

Colors must be 6-digit hex. Invalid values are ignored and randomized instead.

In **B&W mode**, provided colors are coerced to black/white for contrast regardless of input.

---

### Response headers

| Header | When | Description |
|--------|------|-------------|
| `Content-Type` | always | `image/png` |
| `Cache-Control` | seeded | long-lived cache (CDN-friendly) |
| `Cache-Control` | unseeded | `no-store` |
| `X-Avatar-Seed` | seeded | echoes the seed used |

### Error response

```json
{
  "error": "Bad Request",
  "message": "..."
}
```

Status `400` for invalid input (e.g. malformed JSON on POST).

---

### Examples

**Minimal — random 512×512 avatar**

```bash
curl -o avatar.png "https://your-project.vercel.app/api/avatar.png"
```

**Stable avatar for a user (recommended for production)**

```html
<img
  src="https://your-project.vercel.app/api/avatar.png?seed=user-12345&size=128"
  alt="Avatar"
  width="128"
  height="128"
/>
```

**Partial params — fix colors, randomize the rest**

```bash
curl -X POST "https://your-project.vercel.app/api/avatar.png" \
  -H "Content-Type: application/json" \
  -o avatar.png \
  -d '{
    "seed": "team-alpha",
    "size": 512,
    "strokeColor": "#FF00AA",
    "backgroundColor": "#1A1A2E",
    "fillOpacity": 0.25
  }'
```

**Black & white**

```bash
curl -o avatar-bw.png \
  "https://your-project.vercel.app/api/avatar.png?seed=doc-99&size=256&bwMode=true"
```

**Fully specified — no randomization**

```bash
curl -o avatar-fixed.png \
  "https://your-project.vercel.app/api/avatar.png?seed=fixed&size=512\
&ticks=1600&amplitude=80&decay=0.5&frequencyX=10&frequencyY=20\
&radiusMin=2&radiusMax=15&strokeWidth=0.2&strokeOpacity=1&fillOpacity=0\
&strokeColor=161616&fillColor=161616&backgroundColor=FFFFFF"
```

---

## Project structure

```
web-app/
├── api/
│   └── avatar.png.js    # PNG avatar serverless API (Vercel)
├── src/
│   ├── App.jsx          # Main static UI + sequencer
│   └── components/      # Canvas, controls, animated view
├── vercel.json          # Vercel deploy config
└── package.json         # Version source of truth
```

---

## License

Private — Disrupt Collective internal tool.
