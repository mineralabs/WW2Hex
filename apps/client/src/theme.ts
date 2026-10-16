/**
 * Light or dark screens. The player picks Light, Dark or Auto (follow the
 * computer's setting); the choice is kept in this browser and applied as
 * data-theme on the page, which the stylesheet's tokens follow. The map
 * canvases ask isDark() and repaint their backgrounds on a change.
 */
export type ThemeChoice = 'light' | 'dark' | 'auto';

const KEY = 'ww2hex:theme';
const EVENT = 'ww2hex:theme-changed';
let memory: ThemeChoice | null = null;

export function themeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    // Storage unavailable: fall back to this page's choice.
  }
  return memory ?? 'auto';
}

export function setThemeChoice(c: ThemeChoice): void {
  memory = c;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    // Storage unavailable; the choice lasts for this page only.
  }
  applyTheme();
  window.dispatchEvent(new Event(EVENT));
}

/** Sets data-theme on the page from the player's choice. Auto leaves it unset, so the computer's setting applies. */
export function applyTheme(): void {
  const c = themeChoice();
  if (c === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', c);
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function isDark(): boolean {
  const c = themeChoice();
  return c === 'dark' || (c === 'auto' && media().matches);
}

/** Calls `fn` whenever the screens turn light or dark; returns the unsubscribe. */
export function onThemeChange(fn: () => void): () => void {
  const m = media();
  window.addEventListener(EVENT, fn);
  m.addEventListener('change', fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    m.removeEventListener('change', fn);
  };
}

/** A colour token from the stylesheet, as a number for the map canvases. */
export function tokenColour(name: string, fallback: number): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  return hex ? parseInt(hex[1]!, 16) : fallback;
}
