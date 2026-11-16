import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { DesignationBadge, SeverityBadge } from "@/components/StatusBadge";
import {
  designationLabel,
  formatNpr,
  formatNumber,
} from "@/lib/data";
import { NAV_ITEMS } from "@/lib/nav";
import { loadLiveDashboard } from "@/lib/live";

export default async function HomePage() {
  const live = await loadLiveDashboard();
  const overview = live.overview;
  const zones = live.zones;
  const alerts = live.alerts.filter((a) => a.active);
  const guides = live.guides;
  const topGuides = [...guides].sort((a, b) => b.livelihoodIndex - a.livelihoodIndex).slice(0, 4);
  const unescoScans = zones
    .filter((z) => z.designation === "UNESCO_MONUMENT_ZONE")
    .reduce((sum, z) => sum + z.metrics.scansLast24h, 0);
  const satelliteScans = zones
    .filter((z) => z.designation === "SATELLITE_HERITAGE_TOWNS")
    .reduce((sum, z) => sum + z.metrics.scansLast24h, 0);

  return (
    <>
      <PageHeader
        title="Valley Command Overview"
        description="Operational pulse for Nepal Tourism Board and MoCTCA stakeholders: scan dispersion across UNESCO squares versus satellite towns, embedding readiness across the bilingual heritage corpus, licensed guide livelihood conversion, and active geofenced advisories."
      />

      <div className="metricGrid">
        <MetricCard
          label="Valley scans · 24h"
          value={formatNumber(overview.scansValley24h)}
          hint={`UNESCO ${formatNumber(unescoScans)} · Satellite ${formatNumber(satelliteScans)}`}
        />
        <MetricCard
          label="UNESCO : Satellite gap"
          value={`${overview.dispersionGap.toFixed(1)}×`}
          hint="Lower is healthier for NTB 200-Creator Unseen Sites goals"
        />
        <MetricCard
          label="Guide revenue · 7d"
          value={formatNpr(overview.guideRevenueNpr7d)}
          hint="Tour fees + tips attributed from AI scan handoffs"
        />
        <MetricCard
          label="Bilingual RAG ready"
          value={`${overview.bilingualReadyPct}%`}
          hint={`Mean vector separation ${overview.meanVectorSeparation}`}
        />
      </div>

      <div className="twoCol">
        <Panel
          title="Zone congestion snapshot"
          description="Congestion index near 1.0 indicates UNESCO square saturation; satellite towns remain the dispersion opportunity."
        >
          <div className="stackList">
            {[...zones]
              .sort((a, b) => b.metrics.congestionIndex - a.metrics.congestionIndex)
              .map((zone) => (
                <div key={zone.zoneId} className="zoneRow">
                  <div className="zoneMeta">
                    <strong>{zone.nameEn}</strong>
                    <span>
                      <DesignationBadge designation={zone.designation} /> {zone.monumentCount} monuments
                    </span>
                  </div>
                  <div>
                    <div className="barTrack">
                      <div
                        className={`barFill${zone.designation === "SATELLITE_HERITAGE_TOWNS" ? " barFillBrick" : ""}`}
                        style={{ width: `${Math.round(zone.metrics.congestionIndex * 100)}%` }}
                      />
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      {formatNumber(zone.metrics.scansLast24h)} scans · dwell {zone.metrics.avgDwellMinutes}m
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 650 }}>
                    {(zone.metrics.congestionIndex * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>
        </Panel>

        <Panel title="Active crisis & campaign alerts" description="Geofenced broadcasts currently live in the admin console.">
          {alerts.length === 0 ? (
            <p className="muted">No active alerts.</p>
          ) : (
            alerts.map((alert) => (
              <article key={alert.id} className="alertItem">
                <div className="alertTop">
                  <SeverityBadge severity={alert.severity} />
                  <span className="badge badgeInfo">{alert.category.replaceAll("_", " ")}</span>
                </div>
                <h3>{alert.title}</h3>
                <p>{alert.body}</p>
              </article>
            ))
          )}
          <div className="btnRow">
            <Link href="/alerts" className="btn btnPrimary">
              Open alert console
            </Link>
          </div>
        </Panel>
      </div>

      <div className="threeCol">
        {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => (
          <Link key={item.href} href={item.href} className="softCard">
            <h3>{item.label}</h3>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>

      <Panel
        title="Licensed guide livelihood leaders"
        description="NTB / TAAN credentialed guides ranked by scan-attributed tour and tip revenue."
        action={
          <Link href="/livelihoods" className="btn btnSecondary">
            Full tracker
          </Link>
        }
      >
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Guide</th>
                <th>Credential</th>
                <th>Scans → bookings</th>
                <th>7d revenue</th>
                <th>Index</th>
              </tr>
            </thead>
            <tbody>
              {topGuides.map((guide) => (
                <tr key={guide.id}>
                  <td>
                    <strong>{guide.name}</strong>
                    <div className="small muted">{guide.homeBase}</div>
                  </td>
                  <td>
                    {guide.credentialBody} · <span className="mono">{guide.licenseId}</span>
                  </td>
                  <td>
                    {guide.scansAttributed7d} → {guide.walkingToursBooked7d} (
                    {(guide.bookingConversionRate * 100).toFixed(1)}%)
                  </td>
                  <td>{formatNpr(guide.tipRevenueNpr7d + guide.tourFeeRevenueNpr7d)}</td>
                  <td>{guide.livelihoodIndex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Corpus coverage" description="Seeded from data/nepal_heritage_seed across all eight Kathmandu Valley zones.">
        <div className="gridCards">
          {zones.map((zone) => (
            <article key={zone.zoneId} className="softCard">
              <div style={{ marginBottom: 6 }}>
                <DesignationBadge designation={zone.designation} />
              </div>
              <h3>{zone.nameEn}</h3>
              <p>
                {designationLabel(zone.designation)} · {zone.district} · {zone.monumentCount} monuments · tour{" "}
                {zone.walkingTour.title}
              </p>
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}
