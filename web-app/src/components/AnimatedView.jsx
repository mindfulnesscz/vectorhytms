import React, { useState, useEffect, useRef } from 'react';
import PendulumCanvas from './PendulumCanvas';
import { Slider, RangeControls, ColorPicker, Toggle, Select } from './Controls';

// Easing function: Ease-in-out Sine
function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

// Linear Interpolation
function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Check if hex is a dark background color preset
const isBgDark = (hex) => {
  return hex === '#161616' || hex === '#323232' || hex === '#464646';
};

const AnimatedView = () => {
  // ---- ASPECT RATIO & INTERFACE STATES ----
  const [proportions, setProportions] = useState('responsive'); // responsive, square, landscape, portrait
  const [size, setSize] = useState({ width: 700, height: 700 });

  // ---- ANIMATION TIME STATES ----
  const [duration, setDuration] = useState(5000);

  // ---- PHYSICS PARAMETERS ----
  const [ticks, setTicks] = useState(1600);
  const [amplitude, setAmplitude] = useState(80); // percentage (30% to 95%)
  
  const [decayMin, setDecayMin] = useState(0.5);
  const [decayMax, setDecayMax] = useState(2.0);

  const [freqXMin, setFreqXMin] = useState(10.0);
  const [freqXMax, setFreqXMax] = useState(15.0);

  const [freqYMin, setFreqYMin] = useState(20.0);
  const [freqYMax, setFreqYMax] = useState(25.0);

  // ---- APPEARANCE PARAMETERS ----
  const [minRadiusMin, setMinRadiusMin] = useState(2.0);
  const [minRadiusMax, setMinRadiusMax] = useState(5.0);

  const [maxRadiusMin, setMaxRadiusMin] = useState(15.0);
  const [maxRadiusMax, setMaxRadiusMax] = useState(30.0);

  const [strokeColor, setStrokeColor] = useState("#161616"); // Cosmos Black
  const [strokeWidth, setStrokeWidth] = useState(0.2);
  const [strokeOpacity, setStrokeOpacity] = useState(1.0);
  
  const [fillColor, setFillColor] = useState("#161616");
  const [fillOpacity, setFillOpacity] = useState(0.0);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF"); // Clear White

  // Mode Switches
  const [bwMode, setBwMode] = useState(false);
  const [colorBackup, setColorBackup] = useState(null);

  // Handle B&W Mode
  const handleBwModeToggle = (enabled) => {
    setBwMode(enabled);
    if (enabled) {
      setColorBackup({ strokeColor, fillColor, backgroundColor });
      setStrokeColor("#161616");
      setFillColor("#161616");
      setBackgroundColor("#FFFFFF");
    } else if (colorBackup) {
      setStrokeColor(colorBackup.strokeColor);
      setFillColor(colorBackup.fillColor);
      setBackgroundColor(colorBackup.backgroundColor);
    }
  };

  // Coerce colors on background change
  const handleBwBgChange = (bg) => {
    setBackgroundColor(bg);
    if (bwMode) {
      const opposite = isBgDark(bg) ? '#FFFFFF' : '#161616';
      setStrokeColor(opposite);
      setFillColor(opposite);
    }
  };

  // Sizing effect based on proportions
  useEffect(() => {
    const handleResize = () => {
      const sidebarWidth = 360;
      const availableWidth = window.innerWidth - sidebarWidth - 80;
      const availableHeight = window.innerHeight - 80;

      let finalWidth = Math.max(300, availableWidth);
      let finalHeight = Math.max(300, availableHeight);

      if (proportions === 'square') {
        const sizeVal = Math.min(finalWidth, finalHeight);
        finalWidth = sizeVal;
        finalHeight = sizeVal;
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
  }, [proportions]);


  // ---- ANIMATION LOOP ----
  const [currentFreqX, setCurrentFreqX] = useState(freqXMin);
  const [currentFreqY, setCurrentFreqY] = useState(freqYMin);
  const [currentDecay, setCurrentDecay] = useState(decayMin);
  const [currentRadiusMin, setCurrentRadiusMin] = useState(minRadiusMin);
  const [currentRadiusMax, setCurrentRadiusMax] = useState(maxRadiusMin);

  useEffect(() => {
    let requestID;
    let startTime = null;

    const animate = (time) => {
      if (startTime === null) {
        startTime = time;
      }
      const elapsed = time - startTime;

      const totalLoopTime = duration * 2;
      const normalizedTime = (elapsed % totalLoopTime) / duration;

      let t = normalizedTime;
      if (t > 1) {
        t = 2 - t;
      }

      const easedT = easeInOutSine(t);

      setCurrentFreqX(lerp(freqXMin, freqXMax, easedT));
      setCurrentFreqY(lerp(freqYMin, freqYMax, easedT));
      setCurrentDecay(lerp(decayMin, decayMax, easedT));
      setCurrentRadiusMin(lerp(minRadiusMin, minRadiusMax, easedT));
      setCurrentRadiusMax(lerp(maxRadiusMin, maxRadiusMax, easedT));

      requestID = requestAnimationFrame(animate);
    };

    requestID = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestID);
  }, [duration, freqXMin, freqXMax, freqYMin, freqYMax, decayMin, decayMax, minRadiusMin, minRadiusMax, maxRadiusMin, maxRadiusMax]);


  const canvasRef = useRef(null);
  
  // Export current animated frame SVG
  const handleExportFrame = () => {
    if (canvasRef.current) {
      const svgString = canvasRef.current.getSvgString();
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disrupt-pendulum-frame-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const bgPresets = ['#FFFFFF', '#F4F4F4', '#CECECE', '#999999', '#464646', '#323232', '#161616'];

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-zinc-950 text-black dark:text-white overflow-hidden brand-grid-bg transition-colors">
      
      {/* Sidebar Controls */}
      <div className="w-90 flex-shrink-0 bg-white dark:bg-[#161616] p-6 overflow-y-auto border-r border-gray-100 dark:border-zinc-900 flex flex-col pt-8 relative z-20">
        
        {/* Brand Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white leading-none serif-heading mb-1">
            Disrupt Collective
          </h1>
          <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-widest font-sans flex items-center justify-between">
            <span>XY Pendulum Viz</span>
            <span className="text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 px-1.5 py-0.5 rounded text-[8px] font-mono">Animated</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="space-y-5 flex-1">
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-4">
            <div className="flex gap-2 mb-4 opacity-0 pointer-events-none">
              {/* Dummy spacing matching main header */}
              <div className="py-2.5" />
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

          {/* Time parameters */}
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Time Parameters</h2>
            <Slider label="Loop Duration (ms)" value={duration} min={1000} max={30000} step={500} onChange={setDuration} />
          </section>

          {/* Oscillating Physics ranges */}
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Oscillating Physics Ranges</h2>
            <RangeControls
              label="Frequency X Range"
              minVal={freqXMin} maxVal={freqXMax}
              minLimit={0.5} maxLimit={45} step={0.1}
              onMinChange={setFreqXMin} onMaxChange={setFreqXMax}
            />
            <RangeControls
              label="Frequency Y Range"
              minVal={freqYMin} maxVal={freqYMax}
              minLimit={0.5} maxLimit={45} step={0.1}
              onMinChange={setFreqYMin} onMaxChange={setFreqYMax}
            />
            <RangeControls
              label="Decay Range"
              minVal={decayMin} maxVal={decayMax}
              minLimit={0} maxLimit={5} step={0.05}
              onMinChange={setDecayMin} onMaxChange={setDecayMax}
            />
          </section>

          {/* Oscillating Appearance ranges */}
          <section className="border-b border-gray-100 dark:border-zinc-900 pb-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Oscillating Appearance Ranges</h2>
            <RangeControls
              label="Radius Min Range"
              minVal={minRadiusMin} maxVal={minRadiusMax}
              minLimit={0.5} maxLimit={25} step={0.5}
              onMinChange={setMinRadiusMin} onMaxChange={setMinRadiusMax}
            />
            <RangeControls
              label="Radius Max Range"
              minVal={maxRadiusMin} maxVal={maxRadiusMax}
              minLimit={0.5} maxLimit={120} step={0.5}
              onMinChange={setMaxRadiusMin} onMaxChange={setMaxRadiusMax}
            />
          </section>

          {/* Static Settings */}
          <section className="pb-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Static Style Config</h2>
            <Slider label="Ticks" value={ticks} min={100} max={4000} step={10} onChange={setTicks} />
            <Slider label="Safe Amplitude (%)" value={amplitude} min={30} max={95} step={1} onChange={setAmplitude} />
            
            <ColorPicker label="Stroke Color" value={strokeColor} onChange={setStrokeColor} disabled={bwMode} />
            <Slider label="Stroke Width" value={strokeWidth} min={0.05} max={5} step={0.05} onChange={setStrokeWidth} />
            <Slider label="Stroke Opacity" value={strokeOpacity} min={0} max={1} step={0.05} onChange={setStrokeOpacity} />

            <ColorPicker label="Fill Color" value={fillColor} onChange={setFillColor} disabled={bwMode} />
            <Slider label="Fill Opacity" value={fillOpacity} min={0} max={1} step={0.05} onChange={setFillOpacity} />
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-zinc-900">
          <button 
            onClick={handleExportFrame}
            className="w-full brand-btn font-bold py-2.5 px-4 text-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Frame SVG
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-gray-50/50 dark:bg-zinc-950/20">
        <div className="relative shadow-2xl transition-all border border-gray-200 dark:border-zinc-800 rounded overflow-hidden">
          <PendulumCanvas
            ref={canvasRef}
            width={size.width}
            height={size.height}
            ticks={ticks}
            amplitude={amplitude}
            decay={currentDecay}
            frequencyX={currentFreqX}
            frequencyY={currentFreqY}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            fillColor={fillColor}
            fillOpacity={fillOpacity}
            strokeOpacity={strokeOpacity}
            radiusMin={currentRadiusMin}
            radiusMax={currentRadiusMax}
            backgroundColor={backgroundColor}
          />
        </div>
        
        <div className="absolute bottom-4 right-4 text-gray-400 dark:text-gray-600 text-[10px] font-mono pointer-events-none uppercase tracking-wider">
          {Math.round(size.width)} × {Math.round(size.height)} px (Interpolated)
        </div>
      </div>

    </div>
  );
};

export default AnimatedView;
