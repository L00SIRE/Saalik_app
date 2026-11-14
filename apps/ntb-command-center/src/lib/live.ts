import dashboardJson from "@/data/dashboard.json";
import type { DashboardData } from "@/lib/types";

const seed = dashboardJson as DashboardData;

interface LiveCommandCenter {
  monumentCount?: number;
  zoneCount?: number;
  scanEvents?: number;
  fieldCaptures?: number;
  generatedAt?: string;
  zones?: Array<{ zoneId: string; monumentCount: number }>;
}

/** Live backend metrics, falling back to the compiled heritage seed dashboard. */
export async function loadLiveDashboard(): Promise<DashboardData> {
  const base = process.env.SAALIK_API_URL ?? "http://127.0.0.1:4000";
  try {
    const response = await fetch(`${base}/api/heritage/command-center`, {
      cache: "no-store",
      signal: AbortSignal.timeout(800),
    });
    if (!response.ok) return { ...seed, overview: { ...seed.overview, mode: "SEED_FALLBACK" } };
    const live = (await response.json()) as LiveCommandCenter;
    const counts = new Map((live.zones ?? []).map((zone) => [zone.zoneId, zone.monumentCount]));
    return {
      ...seed,
      overview: {
        ...seed.overview,
        mode: "LIVE_BACKEND",
        generatedAt: live.generatedAt ?? seed.overview.generatedAt,
        monumentCount: live.monumentCount ?? seed.overview.monumentCount,
        zoneCount: live.zoneCount ?? seed.overview.zoneCount,
        scansValley24h: live.scanEvents && live.scanEvents > 0 ? live.scanEvents : seed.overview.scansValley24h,
      },
      zones: seed.zones.map((zone) => ({
        ...zone,
        monumentCount: counts.get(zone.zoneId) ?? zone.monumentCount,
      })),
    };
  } catch {
    return { ...seed, overview: { ...seed.overview, mode: "SEED_FALLBACK" } };
  }
}
