/**
 * Where the sun is in the sky at a place and moment, from NOAA's general solar
 * position formulas (accurate to a fraction of a degree, far finer than the
 * light on a game board needs). The rules use it for day, twilight and night;
 * the 3D view for its light.
 */

export interface SunPosition {
  /** Degrees clockwise from north. */
  azimuth: number;
  /** Degrees above the horizon; negative once it has set. */
  elevation: number;
}

const RAD = Math.PI / 180;

/** The sun for a UTC moment at a latitude and longitude (degrees, east positive). */
export function sunAt(utc: Date, lat: number, lon: number): SunPosition {
  const start = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((utc.getTime() - start) / 86_400_000) + 1;
  const hour = utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const trueSolarMinutes = hour * 60 + eqTime + 4 * lon;
  const ha = (trueSolarMinutes / 4 - 180) * RAD;
  const phi = lat * RAD;
  const cosZen = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const elevation = 90 - Math.acos(Math.max(-1, Math.min(1, cosZen))) / RAD;
  const azimuth = (Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180 + 360) % 360;
  return { azimuth, elevation };
}

/**
 * The sun over a scenario's map at `elapsed` minutes into the game, or null when
 * the scenario does not say where or when it is.
 */
export function scenarioSun(
  start: { day: number; minuteOfDay: number; date?: string; utcOffsetMinutes?: number },
  centre: { lat: number; lon: number } | undefined,
  elapsed: number,
): SunPosition | null {
  if (!start.date || !centre) return null;
  const midnight = Date.parse(`${start.date}T00:00:00Z`);
  if (Number.isNaN(midnight)) return null;
  const utc = new Date(midnight + (start.minuteOfDay + elapsed - (start.utcOffsetMinutes ?? 0)) * 60_000);
  return sunAt(utc, centre.lat, centre.lon);
}

/** Day while the sun is up; twilight until it is 6° below the horizon (civil twilight); night after that. */
export type Light = 'day' | 'twilight' | 'night';

export function lightFor(sun: SunPosition | null): Light {
  if (!sun || sun.elevation > 0) return 'day';
  return sun.elevation > -6 ? 'twilight' : 'night';
}
