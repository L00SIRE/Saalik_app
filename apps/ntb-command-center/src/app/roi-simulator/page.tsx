import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { PolicyRoiSimulator } from "@/components/PolicyRoiSimulator";
import { loadLiveDashboard } from "@/lib/live";

export default async function RoiSimulatorPage() {
  const { guides, zones } = await loadLiveDashboard();
  const scans = (designation: string) =>
    zones.filter((zone) => zone.designation === designation).reduce((sum, zone) => sum + zone.metrics.scansLast24h, 0);
  const satelliteScans = scans("SATELLITE_HERITAGE_TOWNS");
  const walksBooked = guides.reduce((sum, guide) => sum + guide.walkingToursBooked7d, 0);
  const revenuePerBookingNpr =
    guides.reduce((sum, guide) => sum + guide.tipRevenueNpr7d + guide.tourFeeRevenueNpr7d, 0) / Math.max(1, walksBooked);
  const baselineDispersionPct = (100 * satelliteScans) / Math.max(1, scans("UNESCO_MONUMENT_ZONE") + satelliteScans);

  return (
    <>
      <PageHeader
        title="Policy & ROI Simulator"
        description="A planning model, not a forecast: what a given tourist volume, scan-to-guide conversion and satellite-ward dispersion would mean for guides and wards over a 90-day pilot. Starting values come from the seeded demonstration ledger."
      />
      <Panel title="Move the three levers" description="Daily tourists, scan-to-guide conversion and satellite ward dispersion.">
        <PolicyRoiSimulator revenuePerBookingNpr={revenuePerBookingNpr} baselineDispersionPct={baselineDispersionPct} />
      </Panel>
    </>
  );
}
