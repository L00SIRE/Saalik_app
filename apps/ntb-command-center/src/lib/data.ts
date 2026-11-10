import dashboardJson from "@/data/dashboard.json";
import type {
  AlertRecord,
  DashboardData,
  GuideRecord,
  MonumentRecord,
  SandboxQuery,
  ZoneRecord,
} from "@/lib/types";

const data = dashboardJson as DashboardData;

export function getDashboard(): DashboardData {
  return data;
}

export function getOverview() {
  return data.overview;
}

export function getZones(): ZoneRecord[] {
  return data.zones;
}

export function getMonuments(): MonumentRecord[] {
  return data.monuments;
}

export function getGuides(): GuideRecord[] {
  return data.guides;
}

export function getAlerts(): AlertRecord[] {
  return data.alerts;
}

export function getHourlyScans() {
  return data.hourlyScans;
}

export function getSandboxQueries(): SandboxQuery[] {
  return data.sandboxQueries;
}

export function getCaptureAngles(): string[] {
  return data.captureAngles;
}

export function formatNpr(amount: number): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function designationLabel(designation: ZoneRecord["designation"]): string {
  return designation === "UNESCO_MONUMENT_ZONE" ? "UNESCO Monument Zone" : "Satellite Heritage Towns";
}

export function angleLabel(angle: string): string {
  const map: Record<string, string> = {
    ESTABLISHING_FRONT: "Establishing Front",
    LEFT_45: "45° Left",
    RIGHT_45: "45° Right",
    CLOSE_UP_ICONOGRAPHY: "Close-Up Iconography",
    WIDE_COURTYARD_CONTEXT: "Wide Courtyard",
  };
  return map[angle] ?? angle;
}

export function loreCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    HISTORY_DYNASTY: "History & Dynasty",
    ARCHITECTURE_CRAFTSMANSHIP: "Architecture & Craft",
    ICONOGRAPHY_SYMBOLISM: "Iconography",
    LIVING_RITUALS_FOLKLORE: "Living Rituals",
    CONSERVATION_RESTORATION: "Conservation",
  };
  return map[category] ?? category;
}
