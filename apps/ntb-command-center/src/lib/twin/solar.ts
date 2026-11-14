import type { SunPosition } from "./types";

export const KATHMANDU = { lat: 27.7172, lng: 85.324 };

/** Nepal Time is UTC+5:45 all year (no daylight saving). */
export const NPT_OFFSET_MIN = 345;

const RAD = Math.PI / 180;
const mod = (value: number, base: number) => ((value % base) + base) % base;

/** UTC instant of a Nepal wall-clock time. `month` is 1-12. */
export function nptToUtc(year: number, month: number, day: number, minutesAfterMidnight: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, minutesAfterMidnight - NPT_OFFSET_MIN));
}

/**
 * NOAA low-precision solar position (Meeus series). Good to a few hundredths of a degree,
 * which is far finer than the facade bearings it is compared with. No refraction correction.
 */
export function solarPosition(utc: Date, lat = KATHMANDU.lat, lng = KATHMANDU.lng): SunPosition {
  const julianDay = utc.getTime() / 86_400_000 + 2440587.5;
  const t = (julianDay - 2451545) / 36525;
  const meanLong = mod(280.46646 + t * (36000.76983 + 0.0003032 * t), 360);
  const meanAnomaly = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * RAD;
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const centre =
    Math.sin(meanAnomaly) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnomaly) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomaly) * 0.000289;
  const omega = (125.04 - 1934.136 * t) * RAD;
  const apparentLong = (meanLong + centre - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = (meanObliquity + 0.00256 * Math.cos(omega)) * RAD;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(apparentLong));

  const y = Math.tan(obliquity / 2) ** 2;
  const l0 = meanLong * RAD;
  const equationOfTimeMin =
    (4 / RAD) *
    (y * Math.sin(2 * l0) -
      2 * eccentricity * Math.sin(meanAnomaly) +
      4 * eccentricity * y * Math.sin(meanAnomaly) * Math.cos(2 * l0) -
      0.5 * y * y * Math.sin(4 * l0) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly));

  const utcMinutes = utc.getUTCHours() * 60 + utc.getUTCMinutes() + utc.getUTCSeconds() / 60;
  const trueSolarMinutes = mod(utcMinutes + equationOfTimeMin + 4 * lng, 1440);
  const hourAngle = (trueSolarMinutes / 4 - 180) * RAD;
  const latR = lat * RAD;

  const cosZenith =
    Math.sin(latR) * Math.sin(declination) + Math.cos(latR) * Math.cos(declination) * Math.cos(hourAngle);
  const elevationDeg = 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
  // Meeus gives azimuth from south, westward positive; +180 turns it into a compass bearing.
  const azimuthDeg = mod(
    Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(latR) - Math.tan(declination) * Math.cos(latR)) /
      RAD +
      180,
    360,
  );
  return { azimuthDeg, elevationDeg };
}

/** Unit vector from the ground toward the sun in scene axes: +x east, +y up, +z south. */
export function sunDirection(sun: SunPosition): { x: number; y: number; z: number } {
  const elevation = sun.elevationDeg * RAD;
  const azimuth = sun.azimuthDeg * RAD;
  return {
    x: Math.cos(elevation) * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: -Math.cos(elevation) * Math.cos(azimuth),
  };
}

/** Ground length of the shadow cast by something `heightM` tall; Infinity when the sun is down. */
export function shadowLengthM(heightM: number, elevationDeg: number): number {
  return elevationDeg <= 0 ? Number.POSITIVE_INFINITY : heightM / Math.tan(elevationDeg * RAD);
}

export interface DaylightWindow {
  sunriseMin: number;
  sunsetMin: number;
  solarNoonMin: number;
  noonElevationDeg: number;
}

/** Sunrise, sunset and solar noon in minutes after midnight NPT, to the nearest minute. */
export function daylightWindow(
  year: number,
  month: number,
  day: number,
  lat = KATHMANDU.lat,
  lng = KATHMANDU.lng,
): DaylightWindow {
  // -0.833 deg is the standard sunrise altitude: atmospheric refraction plus the solar radius.
  const horizon = -0.833;
  let sunriseMin = -1;
  let sunsetMin = -1;
  let solarNoonMin = 0;
  let noonElevationDeg = -90;
  for (let minute = 0; minute < 1440; minute += 1) {
    const elevation = solarPosition(nptToUtc(year, month, day, minute), lat, lng).elevationDeg;
    if (elevation > horizon) {
      if (sunriseMin < 0) sunriseMin = minute;
      sunsetMin = minute;
    }
    if (elevation > noonElevationDeg) {
      noonElevationDeg = elevation;
      solarNoonMin = minute;
    }
  }
  return { sunriseMin, sunsetMin, solarNoonMin, noonElevationDeg };
}

export type Lighting = "NO_SUN" | "FRONT_LIT" | "SIDE_LIT" | "BACKLIT";

/**
 * How the subject is lit for a camera looking along `cameraBearingDeg` (compass bearing from
 * the photographer toward the subject). Front-lit means the sun is behind the photographer.
 */
export function classifyLighting(sun: SunPosition, cameraBearingDeg: number): Lighting {
  if (sun.elevationDeg <= 0) return "NO_SUN";
  const offAxis = Math.abs(mod(sun.azimuthDeg - (cameraBearingDeg + 180) + 180, 360) - 180);
  if (offAxis <= 60) return "FRONT_LIT";
  if (offAxis <= 120) return "SIDE_LIT";
  return "BACKLIT";
}

export function formatNpt(minutesAfterMidnight: number): string {
  const total = Math.round(minutesAfterMidnight);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
