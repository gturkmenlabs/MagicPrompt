import React, { useState } from 'react';

type DensityMode = 'compact' | 'comfortable' | 'spacious';

const ACCENTS = [
  { id: 'blue', color: '#5b8cff', label: 'Blue (Default)' },
  { id: 'cyan', color: '#06e8f9', label: 'Cyan' },
  { id: 'purple', color: '#9d00ff', label: 'Purple' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
];

const DENSITY_OPTIONS: Array<{ id: DensityMode; label: string }> = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'spacious', label: 'Spacious' },
];

const DEFAULT_ACCENT = '#5b8cff';
const DEFAULT_DENSITY: DensityMode = 'comfortable';
const ACCENT_STORAGE_KEY = 'sr_theme_accent';
const DENSITY_STORAGE_KEY = 'sr_theme_density';

function loadAccent(): string {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  return localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT;
}

function loadDensity(): DensityMode {
  if (typeof window === 'undefined') return DEFAULT_DENSITY;
  const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
  if (saved === 'compact' || saved === 'spacious' || saved === 'comfortable') {
    return saved;
  }
  return DEFAULT_DENSITY;
}

function setDensityMode(density: DensityMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-density', density);
  localStorage.setItem(DENSITY_STORAGE_KEY, density);
}

export function applyAccent(color: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--color-accent', color);
  document.documentElement.style.setProperty('--accent-cyan', color);
  document.documentElement.style.setProperty('--accent-cyan-strong', color);
  // Backward-compatible tokens used by older components.
  document.documentElement.style.setProperty('--cyber-primary', color);
  document.documentElement.style.setProperty('--cyber-primary-dim', `${color}22`);
  localStorage.setItem(ACCENT_STORAGE_KEY, color);
}

if (typeof document !== 'undefined') {
  applyAccent(loadAccent());
  setDensityMode(loadDensity());
}

export default function ThemeCustomizer() {
  const [activeColor, setActiveColor] = useState(loadAccent);
  const [density, setDensity] = useState<DensityMode>(loadDensity);
  const [open, setOpen] = useState(false);

  const applyColor = (color: string) => {
    applyAccent(color);
    setActiveColor(color);
  };

  const applyDensity = (value: DensityMode) => {
    setDensityMode(value);
    setDensity(value);
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[44px] flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}66` }}
          />
          <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">
            Appearance
          </h3>
        </div>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <label className="font-mono text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Visual density
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyDensity(option.id)}
                  className={`h-9 rounded-lg border text-[11px] font-semibold transition ${
                    density === option.id
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/10 bg-transparent text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Accent color
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => applyColor(accent.color)}
                  title={accent.label}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    activeColor === accent.color
                      ? 'scale-110 border-white/60'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: accent.color,
                    boxShadow: activeColor === accent.color ? `0 0 10px ${accent.color}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-mono text-[9px] text-gray-500 uppercase">Custom</label>
            <input
              type="color"
              value={activeColor}
              onChange={(event) => applyColor(event.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="font-mono text-[9px] text-gray-600">{activeColor}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              applyColor(DEFAULT_ACCENT);
              applyDensity(DEFAULT_DENSITY);
            }}
            className="inline-flex h-10 items-center font-mono text-[9px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider"
          >
            Reset appearance
          </button>
        </div>
      )}
    </div>
  );
}
