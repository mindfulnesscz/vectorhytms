import pkg from '../../package.json';

export const PRESET_FORMAT = 'disrupt-pendulum-preset/v1';

export function buildStaticPreset(settings, randomizer = null, api = null) {
  return {
    $schema: PRESET_FORMAT,
    appVersion: pkg.version,
    mode: 'static',
    exportedAt: new Date().toISOString(),
    settings,
    ...(randomizer ? { randomizer } : {}),
    ...(api ? { api } : {}),
  };
}

export function buildAnimatedPreset(settings, api = null) {
  return {
    $schema: PRESET_FORMAT,
    appVersion: pkg.version,
    mode: 'animated',
    exportedAt: new Date().toISOString(),
    settings,
    ...(api ? { api } : {}),
  };
}

export function validatePreset(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid preset file: not an object');
  }
  if (data.$schema !== PRESET_FORMAT) {
    throw new Error(`Unsupported preset format. Expected ${PRESET_FORMAT}`);
  }
  if (data.mode !== 'static' && data.mode !== 'animated') {
    throw new Error('Preset mode must be "static" or "animated"');
  }
  if (!data.settings || typeof data.settings !== 'object') {
    throw new Error('Preset is missing settings object');
  }
  return data;
}

export function downloadPresetJson(preset, filename) {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readPresetFile(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }
  return validatePreset(data);
}
