import React, { useState, useMemo } from 'react';
import {
  API_PARAM_DEFS,
  API_PATH,
  apiParamsForRequest,
  buildApiPostBody,
  buildApiUrl,
  emptyApiParams,
  getDefaultApiBaseUrl,
  normalizeApiParams,
  saveApiBaseUrl,
} from '../lib/apiQuery';

const GROUP_LABELS = {
  output: 'Output',
  mode: 'Mode & seed',
  physics: 'Physics',
  appearance: 'Appearance',
};

function copyText(text) {
  navigator.clipboard?.writeText(text);
}

export default function QueryBuilderModal({ isOpen, onClose, initialParams, onLoadFromSettings }) {
  const [baseUrl, setBaseUrl] = useState(getDefaultApiBaseUrl);
  const [params, setParams] = useState(() =>
    normalizeApiParams({ ...emptyApiParams(), ...(initialParams ?? {}) })
  );
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState('');

  const requestParams = useMemo(() => apiParamsForRequest(params), [params]);
  const getUrl = useMemo(() => buildApiUrl(baseUrl, requestParams), [baseUrl, requestParams]);
  const postBody = useMemo(() => JSON.stringify(buildApiPostBody(requestParams), null, 2), [requestParams]);
  const postUrl = useMemo(() => `${baseUrl.replace(/\/$/, '')}${API_PATH}`, [baseUrl]);

  const previewUrl = useMemo(() => {
    if (!getUrl) return '';
    if (params.seed) return getUrl;
    return `${getUrl}${getUrl.includes('?') ? '&' : '?'}_=${previewKey}`;
  }, [getUrl, params.seed, previewKey]);

  if (!isOpen) return null;

  const handleCopy = (label, text) => {
    copyText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleBaseUrlChange = (v) => {
    setBaseUrl(v);
    saveApiBaseUrl(v);
  };

  const groups = [...new Set(API_PARAM_DEFS.map((d) => d.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-zinc-800 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold serif-heading mb-1 text-black dark:text-white">API Query Builder</h3>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-4 font-sans font-medium">
          Build GET/POST requests for {API_PATH}. Empty fields are omitted (API randomizes them).
        </p>

        <div className="flex gap-2 mb-4">
          {onLoadFromSettings && (
            <button
              onClick={() => {
                const loaded = onLoadFromSettings();
                if (loaded) setParams(normalizeApiParams({ ...emptyApiParams(), ...loaded }));
              }}
              className="brand-btn py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold"
            >
              Load from current settings
            </button>
          )}
          <button
            onClick={() => setParams(emptyApiParams())}
            className="brand-btn-secondary py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold"
          >
            Clear all
          </button>
          <button
            onClick={() => setPreviewKey((k) => k + 1)}
            className="brand-btn-secondary py-1.5 px-3 text-[10px] uppercase tracking-wider font-semibold"
          >
            Refresh preview
          </button>
        </div>

        <label className="text-[10px] font-sans uppercase text-gray-500 tracking-wide font-medium block mb-1">
          API base URL
        </label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => handleBaseUrlChange(e.target.value)}
          className="w-full py-2 px-3 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono mb-4 focus:outline-none focus:border-black dark:focus:border-white"
          placeholder="http://localhost:3000"
        />

        {groups.map((group) => (
          <div key={group} className="mb-4 border-t border-gray-100 dark:border-zinc-900 pt-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {GROUP_LABELS[group] || group}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {API_PARAM_DEFS.filter((d) => d.group === group).map((def) => (
                <div key={def.key} className="flex flex-col gap-0.5">
                  <label className="text-[9px] uppercase font-sans text-gray-400">{def.label}</label>
                  {def.type === 'boolean' ? (
                    <select
                      value={params[def.key] === true ? 'true' : params[def.key] === false ? 'false' : ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateParam(def.key, v === '' ? '' : v === 'true');
                      }}
                      className="py-1 px-2 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono"
                    >
                      <option value="">(omit — random)</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={def.type === 'color' ? 'text' : def.type}
                      value={params[def.key] ?? ''}
                      onChange={(e) => updateParam(def.key, e.target.value)}
                      placeholder={def.type === 'color' ? '#RRGGBB' : '(omit)'}
                      className="py-1 px-2 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-sans text-gray-400 font-medium">GET URL</span>
              <button
                onClick={() => handleCopy('get', getUrl)}
                className="text-[9px] uppercase tracking-wider text-gray-400 hover:text-black dark:hover:text-white font-bold"
              >
                {copied === 'get' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-[10px] font-mono bg-gray-50 dark:bg-zinc-900 p-2 border border-gray-100 dark:border-zinc-800 overflow-x-auto whitespace-pre-wrap break-all">
              {getUrl}
            </pre>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-sans text-gray-400 font-medium">POST {API_PATH}</span>
              <button
                onClick={() => handleCopy('post', postBody)}
                className="text-[9px] uppercase tracking-wider text-gray-400 hover:text-black dark:hover:text-white font-bold"
              >
                {copied === 'post' ? 'Copied!' : 'Copy body'}
              </button>
            </div>
            <pre className="text-[10px] font-mono bg-gray-50 dark:bg-zinc-900 p-2 border border-gray-100 dark:border-zinc-800 overflow-x-auto max-h-32">
              {postBody}
            </pre>
            <p className="text-[9px] text-gray-400 mt-1 font-mono">POST → {postUrl}</p>
          </div>
        </div>

        {previewUrl && (
          <div className="border border-gray-100 dark:border-zinc-800 p-3 mb-4">
            <p className="text-[10px] uppercase text-gray-400 mb-2 font-sans font-medium">Live preview</p>
            <div className="flex items-center gap-4">
              <img
                src={previewUrl}
                alt="API preview"
                className="w-32 h-32 border border-gray-200 dark:border-zinc-700 rounded object-cover bg-gray-100"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                If preview is blank, run <code className="font-mono text-black dark:text-white">npm run dev:api</code> locally
                (Vite alone does not serve /api).
              </p>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full brand-btn py-2 text-xs font-semibold uppercase tracking-wider">
          Close
        </button>
      </div>
    </div>
  );
}
