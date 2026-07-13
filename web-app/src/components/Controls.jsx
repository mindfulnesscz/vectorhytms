import React from 'react';

// Standard range slider
export const Slider = ({ label, value, min, max, step, onChange, disabled = false }) => {
  return (
    <div className={`flex flex-col gap-1.5 mb-4 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex justify-between text-xs font-medium tracking-wide">
        <label className="text-gray-500 dark:text-gray-400 font-sans uppercase text-[10px]">{label}</label>
        <span className="font-mono text-gray-700 dark:text-gray-300">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-current"
      />
    </div>
  );
};

// Double range control for minimum and maximum values
export const RangeControls = ({ label, minVal, maxVal, minLimit, maxLimit, step, onMinChange, onMaxChange, disabled = false }) => {
  return (
    <div className={`flex flex-col gap-1.5 mb-5 border-b border-gray-200 dark:border-gray-800 pb-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="text-[10px] font-sans uppercase text-gray-500 dark:text-gray-400 tracking-wide font-medium">{label}</div>
      <div className="flex gap-4">
        <div className="w-1/2">
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
            <span>Min</span>
            <span>{minVal}</span>
          </div>
          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={step}
            value={minVal}
            disabled={disabled}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val <= maxVal) onMinChange(val);
            }}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="w-1/2">
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
            <span>Max</span>
            <span>{maxVal}</span>
          </div>
          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={step}
            value={maxVal}
            disabled={disabled}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val >= minVal) onMaxChange(val);
            }}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

// Custom brand color picker
export const ColorPicker = ({ label, value, onChange, disabled = false }) => {
  return (
    <div className={`flex items-center justify-between mb-4 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <label className="text-[10px] font-sans uppercase text-gray-500 dark:text-gray-400 tracking-wide font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-gray-400">{value}</span>
        <div className="relative w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 overflow-hidden cursor-pointer">
          <input
            type="color"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full p-0 border-none bg-transparent cursor-pointer scale-150"
          />
        </div>
      </div>
    </div>
  );
};

// Custom toggle switch (for Black & White Mode)
export const Toggle = ({ label, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between mb-4 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <span className="text-[10px] font-sans uppercase text-gray-500 dark:text-gray-400 tracking-wide font-medium">{label}</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'transform translate-x-4 bg-white dark:bg-black' : 'bg-gray-400 dark:bg-gray-500'}`} />
      </div>
    </div>
  );
};

// Styled custom select dropdown
export const Select = ({ label, value, options, onChange }) => {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-[10px] font-sans uppercase text-gray-500 dark:text-gray-400 tracking-wide font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2 px-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 text-sm font-sans focus:outline-none focus:border-black dark:focus:border-white transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Styled Checkbox (used in Modal randomizer settings)
export const Checkbox = ({ label, checked, onChange }) => {
  return (
    <div className="flex items-center gap-3 py-2 cursor-pointer select-none group" onClick={() => onChange(!checked)}>
      <div className={`w-4 h-4 border flex items-center justify-center transition-all ${
        checked 
          ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black' 
          : 'border-gray-300 dark:border-gray-700 group-hover:border-black dark:group-hover:border-white'
      }`}>
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-xs font-sans text-gray-700 dark:text-gray-300 font-medium group-hover:text-black dark:group-hover:text-white transition-colors">
        {label}
      </span>
    </div>
  );
};
