import { useEffect, useState } from 'react';
import { onThemeChange, setThemeChoice, themeChoice, type ThemeChoice } from './theme.ts';

const NEXT: Record<ThemeChoice, ThemeChoice> = { light: 'dark', dark: 'auto', auto: 'light' };
const LABEL: Record<ThemeChoice, string> = { light: 'Light', dark: 'Dark', auto: 'Auto' };

/** Cycles the screens through Light, Dark and Auto (the computer's setting). */
export function ThemeToggle(props: { className?: string }) {
  const [choice, setChoice] = useState(themeChoice);
  useEffect(() => onThemeChange(() => setChoice(themeChoice())), []);
  const next = NEXT[choice];
  return (
    <button
      className={props.className}
      onClick={() => setThemeChoice(next)}
      title={`Screens: ${LABEL[choice]}${choice === 'auto' ? ' (follows this computer)' : ''}. Click for ${LABEL[next].toLowerCase()}.`}
      aria-label={`Theme: ${LABEL[choice]}. Click for ${LABEL[next]}`}
    >
      {choice === 'dark' ? '☾' : choice === 'light' ? '☀' : '◐'} {LABEL[choice]}
    </button>
  );
}
