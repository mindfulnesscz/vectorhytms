export const API_PATH = '/api/avatar.png';

export const API_PARAM_DEFS = [
  { key: 'size', label: 'Size (px)', type: 'number', group: 'output' },
  { key: 'width', label: 'Width', type: 'number', group: 'output' },
  { key: 'height', label: 'Height', type: 'number', group: 'output' },
  { key: 'square', label: 'Square output', type: 'boolean', group: 'output' },
  { key: 'seed', label: 'Seed', type: 'string', group: 'mode' },
  { key: 'bwMode', label: 'Black & White', type: 'boolean', group: 'mode' },
  { key: 'ticks', label: 'Ticks', type: 'number', group: 'physics' },
  { key: 'amplitude', label: 'Amplitude (%)', type: 'number', group: 'physics' },
  { key: 'decay', label: 'Decay', type: 'number', group: 'physics' },
  { key: 'frequencyX', label: 'Frequency X', type: 'number', group: 'physics' },
  { key: 'frequencyY', label: 'Frequency Y', type: 'number', group: 'physics' },
  { key: 'radiusMin', label: 'Radius Min', type: 'number', group: 'appearance' },
  { key: 'radiusMax', label: 'Radius Max', type: 'number', group: 'appearance' },
  { key: 'strokeWidth', label: 'Stroke Width', type: 'number', group: 'appearance' },
  { key: 'strokeOpacity', label: 'Stroke Opacity', type: 'number', group: 'appearance' },
  { key: 'fillOpacity', label: 'Fill Opacity', type: 'number', group: 'appearance' },
  { key: 'strokeColor', label: 'Stroke Color', type: 'color', group: 'appearance' },
  { key: 'fillColor', label: 'Fill Color', type: 'color', group: 'appearance' },
  { key: 'backgroundColor', label: 'Background', type: 'color', group: 'appearance' },
];

const STATIC_TO_API = {
  ticks: 'ticks',
  amplitude: 'amplitude',
  decay: 'decay',
  frequencyX: 'frequencyX',
  frequencyY: 'frequencyY',
  radiusMin: 'radiusMin',
  radiusMax: 'radiusMax',
  strokeWidth: 'strokeWidth',
  strokeOpacity: 'strokeOpacity',
  fillOpacity: 'fillOpacity',
  strokeColor: 'strokeColor',
  fillColor: 'fillColor',
  backgroundColor: 'backgroundColor',
  bwMode: 'bwMode',
};

export function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('pendulum-api-base');
  if (stored) return stored;
  // Vite dev (5173) → vercel dev default port
  if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

export function saveApiBaseUrl(url) {
  localStorage.setItem('pendulum-api-base', url);
}

export function animatedSettingsToApiParams(settings, apiOverrides = {}) {
  const params = {
    size: 512,
    square: true,
    ...apiOverrides,
  };

  if (settings.bwMode !== undefined) params.bwMode = settings.bwMode;
  if (settings.ticks !== undefined) params.ticks = settings.ticks;
  if (settings.amplitude !== undefined) params.amplitude = settings.amplitude;
  if (settings.decayMin !== undefined && settings.decayMax !== undefined) {
    params.decay = Number(((settings.decayMin + settings.decayMax) / 2).toFixed(2));
  }
  if (settings.freqXMin !== undefined && settings.freqXMax !== undefined) {
    params.frequencyX = Number(((settings.freqXMin + settings.freqXMax) / 2).toFixed(1));
  }
  if (settings.freqYMin !== undefined && settings.freqYMax !== undefined) {
    params.frequencyY = Number(((settings.freqYMin + settings.freqYMax) / 2).toFixed(1));
  }
  if (settings.minRadiusMin !== undefined && settings.minRadiusMax !== undefined) {
    params.radiusMin = Number(((settings.minRadiusMin + settings.minRadiusMax) / 2).toFixed(1));
  }
  if (settings.maxRadiusMin !== undefined && settings.maxRadiusMax !== undefined) {
    params.radiusMax = Number(((settings.maxRadiusMin + settings.maxRadiusMax) / 2).toFixed(1));
  }
  if (settings.strokeWidth !== undefined) params.strokeWidth = settings.strokeWidth;
  if (settings.strokeOpacity !== undefined) params.strokeOpacity = settings.strokeOpacity;
  if (settings.fillOpacity !== undefined) params.fillOpacity = settings.fillOpacity;
  if (settings.strokeColor) params.strokeColor = settings.strokeColor;
  if (settings.fillColor) params.fillColor = settings.fillColor;
  if (settings.backgroundColor) params.backgroundColor = settings.backgroundColor;

  return params;
}

export function staticSettingsToApiParams(settings, randomizer = null, apiOverrides = {}) {
  const params = {
    size: 512,
    square: true,
    ...apiOverrides,
  };

  if (settings.bwMode !== undefined) params.bwMode = settings.bwMode;

  for (const [settingKey, apiKey] of Object.entries(STATIC_TO_API)) {
    if (settingKey === 'bwMode') continue;
    const isRandomizable = randomizer?.enabled?.[settingKey];
    if (randomizer && isRandomizable) continue;
    if (settings[settingKey] !== undefined && settings[settingKey] !== null && settings[settingKey] !== '') {
      params[apiKey] = settings[settingKey];
    }
  }

  return params;
}

export function paramsToQueryString(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') {
      parts.push(`${encodeURIComponent(key)}=${value ? 'true' : 'false'}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

export function buildApiUrl(baseUrl, params) {
  const base = baseUrl.replace(/\/$/, '');
  const qs = paramsToQueryString(params);
  return qs ? `${base}${API_PATH}?${qs}` : `${base}${API_PATH}`;
}

export function buildApiPostBody(params) {
  const body = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    body[key] = value;
  }
  return body;
}

export function emptyApiParams() {
  return {
    size: 512,
    square: true,
    seed: '',
    bwMode: false,
    ticks: '',
    amplitude: '',
    decay: '',
    frequencyX: '',
    frequencyY: '',
    radiusMin: '',
    radiusMax: '',
    strokeWidth: '',
    strokeOpacity: '',
    fillOpacity: '',
    strokeColor: '',
    fillColor: '',
    backgroundColor: '',
  };
}

export function normalizeApiParams(raw) {
  const out = emptyApiParams();
  for (const def of API_PARAM_DEFS) {
    const v = raw[def.key];
    if (v === undefined || v === null || v === '') continue;
    if (def.type === 'boolean') {
      out[def.key] = v === true || v === 'true' || v === '1';
    } else if (def.type === 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) out[def.key] = n;
    } else {
      out[def.key] = String(v);
    }
  }
  return out;
}

export function apiParamsForRequest(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}
