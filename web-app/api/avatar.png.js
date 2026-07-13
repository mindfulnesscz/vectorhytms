import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';

export const config = {
  runtime: 'nodejs',
};

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toBoolean(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return undefined;
}

function normalizeHexColor(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  const m = s.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return undefined;
  return `#${m[1].toUpperCase()}`;
}

function clampInt(n, min, max) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = light - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const r = clampInt((r1 + m) * 255, 0, 255);
  const g = clampInt((g1 + m) * 255, 0, 255);
  const b = clampInt((b1 + m) * 255, 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function randomColorfulBackgroundHex(rand) {
  const hue = Math.floor(rand() * 360);
  const sat = Math.floor(55 + rand() * 35); // 55..90
  const light = Math.floor(28 + rand() * 52); // 28..80
  return hslToHex(hue, sat, light);
}

function randomHexColor(rand) {
  return `#${Math.floor(rand() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;
}

function isBgDark(hex) {
  return hex === '#161616' || hex === '#323232' || hex === '#464646';
}

function randomizeCfg(partial, bwMode, rand) {
  const out = { ...partial };

  // Background
  if (!out.backgroundColor) {
    out.backgroundColor = bwMode ? (rand() > 0.5 ? '#FFFFFF' : '#161616') : randomColorfulBackgroundHex(rand);
  } else if (bwMode) {
    out.backgroundColor = isBgDark(out.backgroundColor) ? '#161616' : '#FFFFFF';
  }

  // Stroke & fill (contrast for BW)
  if (!out.strokeColor) {
    out.strokeColor = bwMode ? (isBgDark(out.backgroundColor) ? '#FFFFFF' : '#161616') : randomHexColor(rand);
  } else if (bwMode) {
    out.strokeColor = isBgDark(out.backgroundColor) ? '#FFFFFF' : '#161616';
  }

  if (!out.fillColor) {
    out.fillColor = bwMode ? (isBgDark(out.backgroundColor) ? '#FFFFFF' : '#161616') : out.strokeColor;
  } else if (bwMode) {
    out.fillColor = isBgDark(out.backgroundColor) ? '#FFFFFF' : '#161616';
  }

  // Defaults/ranges (matching the app’s feel)
  if (out.ticks === undefined) out.ticks = Math.floor(rand() * (2200 - 800 + 1) + 800);
  if (out.amplitude === undefined) out.amplitude = Math.floor(rand() * (90 - 45 + 1) + 45);
  if (out.decay === undefined) out.decay = Number((rand() * 1.5 + 0.1).toFixed(2));
  if (out.frequencyX === undefined) out.frequencyX = Number((rand() * 29 + 1).toFixed(1));
  if (out.frequencyY === undefined) out.frequencyY = Number((rand() * 29 + 1).toFixed(1));
  if (out.radiusMin === undefined) out.radiusMin = Number((rand() * 9 + 1).toFixed(1));
  if (out.radiusMax === undefined) out.radiusMax = Number((rand() * 30 + 15).toFixed(1));
  if (out.strokeWidth === undefined) out.strokeWidth = Number((rand() * 2.2 + 0.1).toFixed(1));
  if (out.strokeOpacity === undefined) out.strokeOpacity = Number((rand() * 0.6 + 0.4).toFixed(2));
  if (out.fillOpacity === undefined) out.fillOpacity = Number((rand() * 0.5).toFixed(2));

  return out;
}

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandFromSeed(seed) {
  const seedStr = String(seed);
  const seedFn = xmur3(seedStr);
  return mulberry32(seedFn());
}

function createRandUnseeded() {
  return () => crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
}

function generateSvg({ width, height, cfg }) {
  const w = width;
  const h = height;

  // safety clamp geometry similar to the app
  const minDim = Math.min(w, h);
  const safeMaxRadius = Math.max(0.5, minDim / 2 - 12);
  const radiusMax = clamp(cfg.radiusMax, 0.5, safeMaxRadius);
  const radiusMin = clamp(cfg.radiusMin, 0.5, radiusMax);
  const maxSafeAmp = Math.max(10, minDim / 2 - radiusMax - 10);
  const actualAmplitude = (cfg.amplitude / 100) * maxSafeAmp;

  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="${cfg.backgroundColor}" />`;

  let lastX = actualAmplitude + w / 2;
  let lastY = actualAmplitude + h / 2;
  const maxSpeedRef = 15.0;

  for (let t = 0; t < cfg.ticks; t++) {
    const normT = t / cfg.ticks;
    const currentAmp = actualAmplitude * Math.exp(-cfg.decay * normT);

    const y = currentAmp * Math.cos(normT * cfg.frequencyY * 2 * Math.PI) + h / 2;
    const x = currentAmp * Math.cos(normT * cfg.frequencyX * 2 * Math.PI) + w / 2;

    const dx = x - lastX;
    const dy = y - lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    lastX = x;
    lastY = y;

    const normalizedSpeed = Math.min(speed / maxSpeedRef, 1.0);
    const radius = radiusMin + (radiusMax - radiusMin) * normalizedSpeed;

    svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${cfg.fillColor}" fill-opacity="${cfg.fillOpacity}" stroke="${cfg.strokeColor}" stroke-opacity="${cfg.strokeOpacity}" stroke-width="${cfg.strokeWidth}" />`;
  }

  svg += `</svg>`;
  return svg;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const query = req.query ?? {};
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const input = { ...query, ...(body ?? {}) };

    const bwMode = toBoolean(input.bwMode) ?? false;
    const seed = input.seed ?? input.s;
    const hasSeed = !(seed === undefined || seed === null || seed === '');
    const rand = hasSeed ? createRandFromSeed(seed) : createRandUnseeded();

    const width = clampInt(toNumber(input.width) ?? toNumber(input.size) ?? 512, 64, 2048);
    const height = clampInt(toNumber(input.height) ?? toNumber(input.size) ?? 512, 64, 2048);

    // If you want “always square” output for avatars, keep this true.
    // You can set `square=false` to allow non-square PNGs.
    const square = toBoolean(input.square) ?? true;
    const outW = square ? Math.min(width, height) : width;
    const outH = square ? Math.min(width, height) : height;

    const partialCfg = {
      ticks: toNumber(input.ticks),
      amplitude: toNumber(input.amplitude),
      decay: toNumber(input.decay),
      frequencyX: toNumber(input.frequencyX),
      frequencyY: toNumber(input.frequencyY),
      radiusMin: toNumber(input.radiusMin),
      radiusMax: toNumber(input.radiusMax),
      strokeWidth: toNumber(input.strokeWidth),
      strokeOpacity: toNumber(input.strokeOpacity),
      fillOpacity: toNumber(input.fillOpacity),
      strokeColor: normalizeHexColor(input.strokeColor),
      fillColor: normalizeHexColor(input.fillColor),
      backgroundColor: normalizeHexColor(input.backgroundColor),
    };

    const cfg = randomizeCfg(partialCfg, bwMode, rand);
    const svg = generateSvg({ width: outW, height: outH, cfg });

    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', hasSeed ? 'public, max-age=31536000, immutable' : 'no-store');
    if (hasSeed) res.setHeader('X-Avatar-Seed', String(seed));
    res.end(png);
  } catch (e) {
    json(res, 400, {
      error: 'Bad Request',
      message: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}

