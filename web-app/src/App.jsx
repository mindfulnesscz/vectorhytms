import React, { useState, useEffect, useRef, useCallback } from 'react';
import PendulumCanvas from './components/PendulumCanvas';
import AnimatedView from './components/AnimatedView';
import QueryBuilderModal from './components/QueryBuilderModal';
import { Slider, ColorPicker, Toggle, Select, Checkbox } from './components/Controls';
import JSZip from 'jszip';
import pkg from '../package.json';
import { buildStaticPreset, downloadPresetJson, readPresetFile } from './lib/presetFormat';
import { staticSettingsToApiParams } from './lib/apiQuery';
import './index.css';

// Hex to RGBA helper for canvas thumbnails
function hexToRgba(hex, alpha) {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return hex;
}

// Check if hex is a dark background color preset
const isBgDark = (hex) => {
  return hex === '#161616' || hex === '#323232' || hex === '#464646';
};

function clampInt(n, min, max) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hslToHex(h, s, l) {
  // h: 0..360, s/l: 0..100
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

function randomColorfulBackgroundHex() {
  // “Normally colourful” (avoid near-white/near-black extremes)
  const hue = Math.floor(Math.random() * 360);
  const sat = Math.floor(55 + Math.random() * 35);   // 55..90
  const light = Math.floor(28 + Math.random() * 52); // 28..80
  return hslToHex(hue, sat, light);
}

// Miniature canvas thumbnail for sequence gallery
const PendulumThumbnail = ({ config, onClick }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 110;
    const height = 110;
    
    canvas.width = width * 2;
    canvas.height = height * 2;
    // Reset transform so scaling doesn't compound on re-render.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);
    
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    const maxRadius = Math.max(config.radiusMin, config.radiusMax);
    const maxSafeAmp = Math.min(width, height) / 2 - (maxRadius * 0.15) - 4;
    const actualAmplitude = (config.amplitude / 100) * maxSafeAmp;
    
    let lastX = (actualAmplitude * 1) + width / 2;
    let lastY = (actualAmplitude * 1) + height / 2;
    
    const strokeW = Math.max(0.1, config.strokeWidth * 0.25);
    const radMin = Math.max(0.2, config.radiusMin * 0.25);
    const radMax = Math.max(0.4, config.radiusMax * 0.25);
    
    let lastX_calc = lastX;
    let lastY_calc = lastY;
    
    for (let t = 0; t < config.ticks; t++) {
      const normT = t / config.ticks;
      const currentAmp = actualAmplitude * Math.exp(-config.decay * normT);
      const oscY = Math.cos(normT * config.frequencyY * 2 * Math.PI);
      const y = (currentAmp * oscY) + height / 2;
      const oscX = Math.cos(normT * config.frequencyX * 2 * Math.PI);
      const x = (currentAmp * oscX) + width / 2;
      
      const dx = x - lastX_calc;
      const dy = y - lastY_calc;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastX_calc = x;
      lastY_calc = y;
      
      const speedMax = 5.0;
      const normalizedSpeed = Math.min(speed / speedMax, 1.0);
      const radius = radMin + (radMax - radMin) * normalizedSpeed;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      
      if (config.fillOpacity > 0) {
        ctx.fillStyle = hexToRgba(config.fillColor, config.fillOpacity);
        ctx.fill();
      }
      if (config.strokeOpacity > 0) {
        ctx.strokeStyle = hexToRgba(config.strokeColor, config.strokeOpacity);
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
    }
  }, [config]);
  
  return (
    <div className="relative group cursor-pointer flex-shrink-0" onClick={onClick}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '110px', height: '110px' }} 
        className="border border-gray-200 dark:border-gray-800 rounded hover:scale-102 hover:shadow-md transition-all"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
        <span className="text-[10px] font-sans text-white font-medium uppercase tracking-wider">Apply</span>
      </div>
    </div>
  );
};

// Keep geometry within safe bounds for a given viewport.
function clampGeometryForViewport(cfg, width, height) {
  const minDim = Math.min(width, height);
  const safeMaxRadius = Math.max(0.5, minDim / 2 - 12);
  const clampedRadiusMax = Math.min(Math.max(cfg.radiusMax, 0.5), safeMaxRadius);
  const clampedRadiusMin = Math.min(Math.max(cfg.radiusMin, 0.5), clampedRadiusMax);
  const maxSafeAmp = Math.max(10, minDim / 2 - clampedRadiusMax - 10);
  const actualAmplitude = (cfg.amplitude / 100) * maxSafeAmp;

  return {
    radiusMin: clampedRadiusMin,
    radiusMax: clampedRadiusMax,
    actualAmplitude,
    maxSafeAmp,
  };
}

function App() {
  // UI States
  const [mode, setMode] = useState('static'); // 'static' or 'animated'
  const [uiTheme, setUiTheme] = useState('light'); // 'light' or 'dark' (80% Light vs 20% Dark brand guidelines)
  const [size, setSize] = useState({ width: 700, height: 700 });
  const [proportions, setProportions] = useState('responsive'); // responsive, square, landscape, portrait

  // Backup colors when switching to B&W mode
  const [colorBackup, setColorBackup] = useState(null);

  // --- XY PENDULUM PARAMETERS ---
  const [ticks, setTicks] = useState(1600);
  const [amplitude, setAmplitude] = useState(80); // percentage (30% to 95%)
  const [decay, setDecay] = useState(0.5);
  const [frequencyX, setFrequencyX] = useState(10.0);
  const [frequencyY, setFrequencyY] = useState(20.0);

  // Appearance
  const [strokeColor, setStrokeColor] = useState("#161616"); // Cosmos Black
  const [strokeWidth, setStrokeWidth] = useState(0.2);
  const [strokeOpacity, setStrokeOpacity] = useState(1.0);
  const [fillColor, setFillColor] = useState("#161616");
  const [fillOpacity, setFillOpacity] = useState(0.0);
  const [radiusMin, setRadiusMin] = useState(2.0);
  const [radiusMax, setRadiusMax] = useState(15.0);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF"); // Clear White

  // Mode Switches
  const [bwMode, setBwMode] = useState(false);

  // --- RANDOMIZER & CONFIG MODAL STATE ---
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);
  const [queryBuilderParams, setQueryBuilderParams] = useState(null);
  const [queryBuilderKey, setQueryBuilderKey] = useState(0);
  const [importError, setImportError] = useState('');
  const importFileRef = useRef(null);
  const animatedBridgeRef = useRef(null);
  const [randomizable, setRandomizable] = useState({
    ticks: true,
    amplitude: true,
    decay: true,
    frequencyX: true,
    frequencyY: true,
    radiusMin: true,
    radiusMax: true,
    strokeColor: true,
    strokeWidth: true,
    strokeOpacity: true,
    fillColor: true,
    fillOpacity: true,
    backgroundColor: true,
  });

  // --- SEQUENCER STATE ---
  const [sequenceCount, setSequenceCount] = useState(5);
  const [sequence, setSequence] = useState([]);

  const canvasRef = useRef(null);

  // Sync HTML body class with UI Theme
  useEffect(() => {
    document.body.className = uiTheme === 'light' ? 'theme-light' : 'theme-dark';
  }, [uiTheme]);

  // Handle Black & White mode switch
  const handleBwModeToggle = (enabled) => {
    setBwMode(enabled);
    if (enabled) {
      // Save current colors
      setColorBackup({ strokeColor, fillColor, backgroundColor });
      // Apply clean black and white preset
      setStrokeColor("#161616");
      setFillColor("#161616");
      setBackgroundColor("#FFFFFF");
    } else if (colorBackup) {
      // Restore previous colors
      setStrokeColor(colorBackup.strokeColor);
      setFillColor(colorBackup.fillColor);
      setBackgroundColor(colorBackup.backgroundColor);
    }
  };

  // Coerce colors when background changes in B&W mode
  const handleBwBgChange = (bg) => {
    setBackgroundColor(bg);
    if (bwMode) {
      const opposite = isBgDark(bg) ? '#FFFFFF' : '#161616';
      setStrokeColor(opposite);
      setFillColor(opposite);
    }
  };

  // Grid responsiveness sizing calculations
  useEffect(() => {
    const handleResize = () => {
      const sidebarWidth = 360;
      const galleryHeight = sequence.length > 0 ? 180 : 0;
      const availableWidth = window.innerWidth - sidebarWidth - 80;
      const availableHeight = window.innerHeight - galleryHeight - 80;

      let finalWidth = Math.max(300, availableWidth);
      let finalHeight = Math.max(300, availableHeight);

      if (proportions === 'square') {
        const size = Math.min(finalWidth, finalHeight);
        finalWidth = size;
        finalHeight = size;
      } else if (proportions === 'landscape') {
        let h = finalWidth * (9 / 16);
        if (h > finalHeight) {
          h = finalHeight;
          finalWidth = h * (16 / 9);
        }
        finalHeight = h;
      } else if (proportions === 'portrait') {
        let w = finalHeight * (9 / 16);
        if (w > finalWidth) {
          w = finalWidth;
          finalHeight = w * (16 / 9);
        }
        finalWidth = w;
      }

      setSize({ width: finalWidth, height: finalHeight });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [proportions, sequence.length]);

  // Randomizer config helper
  const getSingleRandomConfig = (customRandomizable = randomizable) => {
    const isBw = bwMode;
    
    // 1. Determine background
    let nextBg = backgroundColor;
    if (customRandomizable.backgroundColor) {
      if (isBw) {
        nextBg = Math.random() > 0.5 ? '#FFFFFF' : '#161616';
      } else {
        nextBg = randomColorfulBackgroundHex();
      }
    }

    // 2. Determine stroke & fill colors
    let nextStrokeColor = strokeColor;
    if (customRandomizable.strokeColor) {
      if (isBw) {
        nextStrokeColor = isBgDark(nextBg) ? '#FFFFFF' : '#161616';
      } else {
        nextStrokeColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      }
    }

    let nextFillColor = fillColor;
    if (customRandomizable.fillColor) {
      if (isBw) {
        nextFillColor = isBgDark(nextBg) ? '#FFFFFF' : '#161616';
      } else {
        nextFillColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      }
    }

    // 3. Determine remaining parameters
    const nextTicks = customRandomizable.ticks ? Math.floor(Math.random() * (2200 - 800 + 1) + 800) : ticks;
    const nextAmp = customRandomizable.amplitude ? Math.floor(Math.random() * (90 - 45 + 1) + 45) : amplitude;
    const nextDecay = customRandomizable.decay ? parseFloat((Math.random() * 1.5 + 0.1).toFixed(2)) : decay;
    const nextFreqX = customRandomizable.frequencyX ? parseFloat((Math.random() * 29 + 1).toFixed(1)) : frequencyX;
    const nextFreqY = customRandomizable.frequencyY ? parseFloat((Math.random() * 29 + 1).toFixed(1)) : frequencyY;
    const nextRadMin = customRandomizable.radiusMin ? parseFloat((Math.random() * 9 + 1).toFixed(1)) : radiusMin;
    const nextRadMax = customRandomizable.radiusMax ? parseFloat((Math.random() * 30 + 15).toFixed(1)) : radiusMax;
    const nextStrokeWidth = customRandomizable.strokeWidth ? parseFloat((Math.random() * 2.2 + 0.1).toFixed(1)) : strokeWidth;
    const nextStrokeOpacity = customRandomizable.strokeOpacity ? parseFloat((Math.random() * 0.6 + 0.4).toFixed(2)) : strokeOpacity;
    const nextFillOpacity = customRandomizable.fillOpacity ? parseFloat((Math.random() * 0.5).toFixed(2)) : fillOpacity;

    return {
      ticks: nextTicks,
      amplitude: nextAmp,
      decay: nextDecay,
      frequencyX: nextFreqX,
      frequencyY: nextFreqY,
      strokeColor: nextStrokeColor,
      strokeWidth: nextStrokeWidth,
      strokeOpacity: nextStrokeOpacity,
      fillColor: nextFillColor,
      fillOpacity: nextFillOpacity,
      radiusMin: nextRadMin,
      radiusMax: nextRadMax,
      backgroundColor: nextBg,
    };
  };

  // Run the randomizer tool
  const handleRandomize = () => {
    const config = getSingleRandomConfig();
    applyConfig(config);
  };

  // Run the sequencer tool
  const handleGenerateSequence = () => {
    const newSeq = [];
    for (let i = 0; i < sequenceCount; i++) {
      newSeq.push(getSingleRandomConfig());
    }
    setSequence(newSeq);
  };

  // Load configuration object
  const applyConfig = (cfg) => {
    setTicks(cfg.ticks);
    setAmplitude(cfg.amplitude);
    setDecay(cfg.decay);
    setFrequencyX(cfg.frequencyX);
    setFrequencyY(cfg.frequencyY);
    setStrokeColor(cfg.strokeColor);
    setStrokeWidth(cfg.strokeWidth);
    setStrokeOpacity(cfg.strokeOpacity);
    setFillColor(cfg.fillColor);
    setFillOpacity(cfg.fillOpacity);
    setRadiusMin(cfg.radiusMin);
    setRadiusMax(cfg.radiusMax);
    setBackgroundColor(cfg.backgroundColor);
  };

  // Get SVG String helper for individual downloads
  const getSvgStringForConfig = (cfg) => {
    const square = Math.min(size.width, size.height);
    const width = square;
    const height = square;

    const safe = clampGeometryForViewport(cfg, width, height);
    
    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="${cfg.backgroundColor}" />`;
    
    let lastX = (safe.actualAmplitude * 1) + width / 2;
    let lastY = (safe.actualAmplitude * 1) + height / 2;
    const strokeW = cfg.strokeWidth;
    const maxSpeedRef = 15.0;
    
    for (let t = 0; t < cfg.ticks; t++) {
      const normT = t / cfg.ticks;
      const currentAmp = safe.actualAmplitude * Math.exp(-cfg.decay * normT);
      const oscY = Math.cos(normT * cfg.frequencyY * 2 * Math.PI);
      const y = (currentAmp * oscY) + height / 2;
      const oscX = Math.cos(normT * cfg.frequencyX * 2 * Math.PI);
      const x = (currentAmp * oscX) + width / 2;
      
      const dx = x - lastX;
      const dy = y - lastY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastX = x;
      lastY = y;
      
      const normalizedSpeed = Math.min(speed / maxSpeedRef, 1.0);
      const radius = safe.radiusMin + (safe.radiusMax - safe.radiusMin) * normalizedSpeed;
      
      svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${cfg.fillColor}" fill-opacity="${cfg.fillOpacity}" stroke="${cfg.strokeColor}" stroke-opacity="${cfg.strokeOpacity}" stroke-width="${strokeW}" />`;
    }
    
    svg += '</svg>';
    return svg;
  };

  // Download sequence sequentially with a timeout to prevent pop-up blocker issues
  const handleDownloadSequence = async () => {
    for (let i = 0; i < sequence.length; i++) {
      const cfg = sequence[i];
      const svgString = getSvgStringForConfig(cfg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `disrupt-pendulum-seq-${i + 1}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  };

  // Download the entire sequence as a single ZIP of SVGs
  const handleDownloadSequenceZip = async () => {
    if (sequence.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('disrupt-pendulum-seq') ?? zip;

    for (let i = 0; i < sequence.length; i++) {
      const cfg = sequence[i];
      const svgString = getSvgStringForConfig(cfg);
      folder.file(`disrupt-pendulum-seq-${i + 1}.svg`, svgString);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disrupt-pendulum-seq-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export current main canvas SVG
  const handleExportMain = () => {
    if (canvasRef.current) {
      const svgString = canvasRef.current.getSvgString({ forceSquare: true });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'disrupt-pendulum.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStaticSettingsSnapshot = useCallback(() => ({
    proportions,
    bwMode,
    ticks,
    amplitude,
    decay,
    frequencyX,
    frequencyY,
    radiusMin,
    radiusMax,
    strokeColor,
    strokeWidth,
    strokeOpacity,
    fillColor,
    fillOpacity,
    backgroundColor,
  }), [proportions, bwMode, ticks, amplitude, decay, frequencyX, frequencyY, radiusMin, radiusMax, strokeColor, strokeWidth, strokeOpacity, fillColor, fillOpacity, backgroundColor]);

  const applyStaticSettings = (s) => {
    if (s.proportions !== undefined) setProportions(s.proportions);
    if (s.ticks !== undefined) setTicks(s.ticks);
    if (s.amplitude !== undefined) setAmplitude(s.amplitude);
    if (s.decay !== undefined) setDecay(s.decay);
    if (s.frequencyX !== undefined) setFrequencyX(s.frequencyX);
    if (s.frequencyY !== undefined) setFrequencyY(s.frequencyY);
    if (s.radiusMin !== undefined) setRadiusMin(s.radiusMin);
    if (s.radiusMax !== undefined) setRadiusMax(s.radiusMax);
    if (s.strokeColor !== undefined) setStrokeColor(s.strokeColor);
    if (s.strokeWidth !== undefined) setStrokeWidth(s.strokeWidth);
    if (s.strokeOpacity !== undefined) setStrokeOpacity(s.strokeOpacity);
    if (s.fillColor !== undefined) setFillColor(s.fillColor);
    if (s.fillOpacity !== undefined) setFillOpacity(s.fillOpacity);
    if (s.backgroundColor !== undefined) setBackgroundColor(s.backgroundColor);
    if (s.bwMode !== undefined) setBwMode(s.bwMode);
  };

  const handleExportPreset = () => {
    const preset = buildStaticPreset(
      getStaticSettingsSnapshot(),
      { enabled: randomizable, sequenceCount },
      { size: 512, square: true }
    );
    downloadPresetJson(preset, `disrupt-pendulum-static-${Date.now()}.json`);
  };

  const handleImportPreset = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImportError('');
      const preset = await readPresetFile(file);
      if (preset.mode === 'animated') {
        setMode('animated');
        setTimeout(() => animatedBridgeRef.current?.applyPreset(preset), 0);
      } else {
        if (mode === 'animated') setMode('static');
        applyStaticSettings(preset.settings);
        if (preset.randomizer?.enabled) setRandomizable(preset.randomizer.enabled);
        if (preset.randomizer?.sequenceCount) setSequenceCount(preset.randomizer.sequenceCount);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const getQueryParamsFromCurrent = useCallback(() => {
    if (mode === 'animated' && animatedBridgeRef.current) {
      return animatedBridgeRef.current.getApiParams();
    }
    return staticSettingsToApiParams(
      getStaticSettingsSnapshot(),
      { enabled: randomizable },
      { size: 512, square: true }
    );
  }, [mode, getStaticSettingsSnapshot, randomizable]);

  const openQueryBuilder = () => {
    setQueryBuilderParams(getQueryParamsFromCurrent());
    setQueryBuilderKey((k) => k + 1);
    setIsQueryBuilderOpen(true);
  };

  const queryBuilderModal = (
    <QueryBuilderModal
      key={queryBuilderKey}
      isOpen={isQueryBuilderOpen}
      onClose={() => setIsQueryBuilderOpen(false)}
      initialParams={queryBuilderParams}
      onLoadFromSettings={getQueryParamsFromCurrent}
    />
  );

  const importInput = (
    <input
      ref={importFileRef}
      type="file"
      accept=".json,application/json"
      className="hidden"
      onChange={handleImportPreset}
    />
  );

  // Render Animated view
  if (mode === 'animated') {
    return (
      <>
        <div className="relative">
          <div className="absolute top-6 right-8 z-50 flex gap-2">
            <button 
              onClick={() => setMode('static')} 
              className="brand-btn-secondary py-1.5 px-3 text-[11px] uppercase tracking-wider"
            >
              Static View
            </button>
            <button 
              onClick={() => setMode('animated')} 
              className="brand-btn py-1.5 px-3 text-[11px] uppercase tracking-wider"
            >
              Animated Mode
            </button>
            <button 
              onClick={() => setUiTheme(uiTheme === 'light' ? 'dark' : 'light')} 
              className="brand-btn-secondary py-1.5 px-3 text-[11px] uppercase tracking-wider flex items-center gap-1.5"
            >
              {uiTheme === 'light' ? 'Dark theme' : 'Light theme'}
            </button>
            <button
              onClick={openQueryBuilder}
              className="brand-btn-secondary py-1.5 px-3 text-[11px] uppercase tracking-wider"
            >
              API Builder
            </button>
          </div>
          <AnimatedView
            settingsBridgeRef={animatedBridgeRef}
            onExportPreset={() => animatedBridgeRef.current?.exportPreset()}
            onImportPreset={() => importFileRef.current?.click()}
            onOpenQueryBuilder={openQueryBuilder}
          />
          {importError && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs px-4 py-2 rounded shadow-lg">
              {importError}
            </div>
          )}
        </div>
        {queryBuilderModal}
        {importInput}
      </>
    );
  }

  // Brand Presets for Background Color (Czech manual Section 2/2)
  const bgPresets = ['#FFFFFF', '#F4F4F4', '#CECECE', '#999999', '#464646', '#323232', '#161616'];

  return (
    <>
    <div className="flex h-screen w-screen overflow-hidden font-sans select-none brand-grid-bg text-black dark:text-white bg-white dark:bg-zinc-950 transition-colors">
      
      {/* Sidebar Controls */}
      <div className="w-90 flex-shrink-0 bg-white dark:bg-[#161616] p-6 overflow-y-auto border-r border-gray-100 dark:border-zinc-900 flex flex-col pt-8 relative z-20">
        
        {/* Brand Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white leading-none serif-heading mb-1">
            Disrupt Collective
          </h1>
          <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-widest font-sans flex items-center justify-between">
            <span>XY Pendulum Viz</span>
            <span className="text-black dark:text-white bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[8px] font-mono">v{pkg.version}</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="space-y-5 flex-1">
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-4">
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setMode('static')} 
                className="flex-1 brand-btn py-1.5 text-[10px] uppercase tracking-wider font-semibold text-center justify-center"
              >
                Static
              </button>
              <button 
                onClick={() => setMode('animated')} 
                className="flex-1 brand-btn-secondary py-1.5 text-[10px] uppercase tracking-wider font-semibold text-center justify-center"
              >
                Animated
              </button>
            </div>
            
            <Select 
              label="Proportions" 
              value={proportions}
              options={[
                { value: 'responsive', label: 'Responsive Aspect Ratio' },
                { value: 'square', label: '1:1 Square Output' },
                { value: 'landscape', label: '16:9 Landscape' },
                { value: 'portrait', label: '9:16 Portrait' },
              ]}
              onChange={setProportions}
            />

            <Toggle 
              label="Black & White Mode" 
              checked={bwMode}
              onChange={handleBwModeToggle}
            />

            {/* Background Color preset selector */}
            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-[10px] font-sans uppercase text-gray-500 tracking-wide font-medium">Background Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {bgPresets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleBwBgChange(preset)}
                    style={{ backgroundColor: preset }}
                    className={`w-6 h-6 rounded-full border transition-all ${
                      backgroundColor === preset 
                        ? 'border-black dark:border-white scale-110 shadow-sm ring-1 ring-black/10' 
                        : 'border-gray-200 dark:border-zinc-800 hover:scale-105'
                    }`}
                    title={preset}
                  />
                ))}
                {!bwMode && (
                  <div className="relative w-6 h-6 rounded-full border border-gray-300 dark:border-zinc-700 overflow-hidden cursor-pointer bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500">
                    <input 
                      type="color" 
                      value={backgroundColor} 
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150"
                      title="Custom Color"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Physics parameters */}
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Physics Parameters</h2>
            <Slider label="Ticks" value={ticks} min={100} max={4000} step={10} onChange={setTicks} />
            <Slider label="Safe Amplitude (%)" value={amplitude} min={30} max={95} step={1} onChange={setAmplitude} />
            <Slider label="Decay rate" value={decay} min={0} max={5} step={0.05} onChange={setDecay} />
            <Slider label="Freq X" value={frequencyX} min={0.5} max={45} step={0.1} onChange={setFrequencyX} />
            <Slider label="Freq Y" value={frequencyY} min={0.5} max={45} step={0.1} onChange={setFrequencyY} />
          </section>

          {/* Appearance options */}
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Appearance Config</h2>
            <Slider label="Radius Min" value={radiusMin} min={0.5} max={25} step={0.5} onChange={setRadiusMin} />
            <Slider label="Radius Max" value={radiusMax} min={0.5} max={120} step={0.5} onChange={setRadiusMax} />
            
            <ColorPicker label="Stroke Color" value={strokeColor} onChange={setStrokeColor} disabled={bwMode} />
            <Slider label="Stroke Width" value={strokeWidth} min={0.05} max={5} step={0.05} onChange={setStrokeWidth} />
            <Slider label="Stroke Opacity" value={strokeOpacity} min={0} max={1} step={0.05} onChange={setStrokeOpacity} />

            <ColorPicker label="Fill Color" value={fillColor} onChange={setFillColor} disabled={bwMode} />
            <Slider label="Fill Opacity" value={fillOpacity} min={0} max={1} step={0.05} onChange={setFillOpacity} />
          </section>

          {/* Tool actions: Randomizer & Sequencer */}
          <section className="space-y-4 pt-1">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generator Tools</h2>
            
            <div className="flex gap-2">
              <button 
                onClick={handleRandomize}
                className="flex-1 brand-btn text-xs font-semibold py-2 bg-black text-white dark:bg-white dark:text-black hover:bg-black/80 dark:hover:bg-white/80"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.717 9.547 4.672 10.768 4.672 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5l3.75 3.75L16.5 10.5" />
                </svg>
                Randomize
              </button>
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="brand-btn-secondary p-2 aspect-square"
                title="Configure Randomizer settings"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-900/50 p-3 border border-gray-100 dark:border-zinc-900 space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sequencer</h3>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1 w-1/3">
                  <label className="text-[9px] uppercase font-sans text-gray-400">Count</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="24"
                    value={sequenceCount}
                    onChange={(e) => setSequenceCount(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="py-1 px-2 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono text-center focus:outline-none"
                  />
                </div>
                <button 
                  onClick={handleGenerateSequence}
                  className="flex-1 brand-btn text-[10px] font-semibold py-2 px-3 self-end"
                >
                  Generate {sequenceCount}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-zinc-900 space-y-2">
          <div className="flex gap-2">
            <button 
              onClick={handleExportMain}
              className="flex-1 brand-btn font-bold py-2.5 px-4 text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export SVG
            </button>
            
            <button
              onClick={() => setUiTheme(uiTheme === 'light' ? 'dark' : 'light')}
              className="brand-btn-secondary p-2.5 aspect-square"
              title="Toggle app interface dark/light theme"
            >
              {uiTheme === 'light' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M6.75 12H3m18 0h-3.75M19.5 19.5l-1.5-1.5M6 6l1.5 1.5M19.5 6l-1.5 1.5M6 19.5L7.5 18m3-6a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPreset}
              className="flex-1 brand-btn-secondary py-2 text-[10px] uppercase tracking-wider font-semibold"
            >
              Export preset
            </button>
            <button
              onClick={() => importFileRef.current?.click()}
              className="flex-1 brand-btn-secondary py-2 text-[10px] uppercase tracking-wider font-semibold"
            >
              Import preset
            </button>
          </div>
          <button
            onClick={openQueryBuilder}
            className="w-full brand-btn-secondary py-2 text-[10px] uppercase tracking-wider font-semibold"
          >
            API query builder
          </button>
          {importError && (
            <p className="text-[10px] text-red-500 font-sans">{importError}</p>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* Main interactive canvas area */}
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-gray-50/50 dark:bg-zinc-950/20">
          <div className="relative shadow-2xl transition-all border border-gray-200 dark:border-zinc-800 rounded overflow-hidden">
            <PendulumCanvas
              ref={canvasRef}
              width={size.width}
              height={size.height}
              ticks={ticks}
              amplitude={amplitude}
              decay={decay}
              frequencyX={frequencyX}
              frequencyY={frequencyY}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              fillColor={fillColor}
              fillOpacity={fillOpacity}
              strokeOpacity={strokeOpacity}
              radiusMin={radiusMin}
              radiusMax={radiusMax}
              backgroundColor={backgroundColor}
            />
          </div>
          
          <div className="absolute bottom-4 right-4 text-gray-400 dark:text-gray-600 text-[10px] font-mono pointer-events-none uppercase tracking-wider">
            {Math.round(size.width)} × {Math.round(size.height)} px
          </div>
        </div>

        {/* Sequencer gallery scroll at bottom of main viewport */}
        {sequence.length > 0 && (
          <div className="h-44 min-w-0 bg-white dark:bg-[#161616] border-t border-gray-100 dark:border-zinc-900 p-4 flex flex-col gap-2 relative z-10 animate-fade-in">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 font-sans">
                Generated Sequence Gallery ({sequence.length})
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadSequence}
                  className="brand-btn py-1 px-3 text-[9px] uppercase tracking-wider font-semibold"
                >
                  Download All (Queue)
                </button>
                <button
                  onClick={handleDownloadSequenceZip}
                  className="brand-btn py-1 px-3 text-[9px] uppercase tracking-wider font-semibold"
                >
                  Download ZIP
                </button>
                <button
                  onClick={() => setSequence([])}
                  className="brand-btn-secondary py-1 px-3 text-[9px] uppercase tracking-wider font-semibold"
                >
                  Clear Sequence
                </button>
              </div>
            </div>
            <div className="flex w-full min-w-0 max-w-full flex-wrap content-start items-start gap-3 overflow-x-hidden overflow-y-auto py-1 px-0.5 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
              {sequence.map((cfg, idx) => (
                <PendulumThumbnail 
                  key={idx} 
                  config={cfg} 
                  onClick={() => applyConfig(cfg)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal Overlay for Randomizer settings */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-zinc-800 p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              title="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold serif-heading mb-1 text-black dark:text-white">
              Randomizer Rules
            </h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-4 font-sans font-medium">
              Configure parameters to randomize or keep fixed
            </p>

            <div className="max-h-60 overflow-y-auto mb-6 pr-2 border-b border-t border-gray-100 dark:border-zinc-900 py-2">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-900/50 mb-1">
                <button
                  onClick={() => {
                    const next = {};
                    Object.keys(randomizable).forEach(k => next[k] = true);
                    setRandomizable(next);
                  }}
                  className="text-[9px] uppercase tracking-wider text-gray-400 hover:text-black dark:hover:text-white font-bold"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    const next = {};
                    Object.keys(randomizable).forEach(k => next[k] = false);
                    setRandomizable(next);
                  }}
                  className="text-[9px] uppercase tracking-wider text-gray-400 hover:text-black dark:hover:text-white font-bold"
                >
                  Fixed All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <Checkbox 
                  label="TicksCount" 
                  checked={randomizable.ticks} 
                  onChange={(checked) => setRandomizable({...randomizable, ticks: checked})} 
                />
                <Checkbox 
                  label="Amplitude" 
                  checked={randomizable.amplitude} 
                  onChange={(checked) => setRandomizable({...randomizable, amplitude: checked})} 
                />
                <Checkbox 
                  label="Decay Rate" 
                  checked={randomizable.decay} 
                  onChange={(checked) => setRandomizable({...randomizable, decay: checked})} 
                />
                <Checkbox 
                  label="Freq X" 
                  checked={randomizable.frequencyX} 
                  onChange={(checked) => setRandomizable({...randomizable, frequencyX: checked})} 
                />
                <Checkbox 
                  label="Freq Y" 
                  checked={randomizable.frequencyY} 
                  onChange={(checked) => setRandomizable({...randomizable, frequencyY: checked})} 
                />
                <Checkbox 
                  label="Radius Min" 
                  checked={randomizable.radiusMin} 
                  onChange={(checked) => setRandomizable({...randomizable, radiusMin: checked})} 
                />
                <Checkbox 
                  label="Radius Max" 
                  checked={randomizable.radiusMax} 
                  onChange={(checked) => setRandomizable({...randomizable, radiusMax: checked})} 
                />
                <Checkbox 
                  label="Stroke Color" 
                  checked={randomizable.strokeColor} 
                  onChange={(checked) => setRandomizable({...randomizable, strokeColor: checked})} 
                />
                <Checkbox 
                  label="Stroke Width" 
                  checked={randomizable.strokeWidth} 
                  onChange={(checked) => setRandomizable({...randomizable, strokeWidth: checked})} 
                />
                <Checkbox 
                  label="Stroke Opac" 
                  checked={randomizable.strokeOpacity} 
                  onChange={(checked) => setRandomizable({...randomizable, strokeOpacity: checked})} 
                />
                <Checkbox 
                  label="Fill Color" 
                  checked={randomizable.fillColor} 
                  onChange={(checked) => setRandomizable({...randomizable, fillColor: checked})} 
                />
                <Checkbox 
                  label="Fill Opac" 
                  checked={randomizable.fillOpacity} 
                  onChange={(checked) => setRandomizable({...randomizable, fillOpacity: checked})} 
                />
                <Checkbox 
                  label="Bg Color" 
                  checked={randomizable.backgroundColor} 
                  onChange={(checked) => setRandomizable({...randomizable, backgroundColor: checked})} 
                />
              </div>
            </div>

            <button 
              onClick={() => setIsConfigModalOpen(false)}
              className="w-full brand-btn py-2 text-xs font-semibold uppercase tracking-wider"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

    </div>
    {queryBuilderModal}
    {importInput}
    </>
  );
}

export default App;
